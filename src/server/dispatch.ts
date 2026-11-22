// Dispatch management. Posting a dispatch atomically:
//   - decreases finished-goods stock (DISPATCH movement),
//   - prevents dispatch beyond available stock (the movement throws on
//     negative stock, so two orders can't dispatch the same stock),
//   - records the Dispatch + DispatchItem rows,
//   - updates the sales order status (DISPATCHED / PARTIALLY_DISPATCHED).
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "@/lib/currency";
import { MOVEMENT_TYPES, SOURCE_DOC, ORDER_STATUS, INVOICE_STATUS } from "@/lib/constants";
import { postStockMovement } from "./stock";
import { logAudit } from "./audit";

export const dispatchItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
});

export const createDispatchSchema = z.object({
  invoiceId: z.string().min(1),
  dispatchDate: z.string().min(1),
  vehicleRef: z.string().optional(),
  items: z.array(dispatchItemSchema).min(1),
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;

export async function createDispatch(input: CreateDispatchInput, adminId: string) {
  const data = createDispatchSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: data.invoiceId },
      include: { items: { include: { product: { include: { inventoryItem: true } } } }, salesOrder: true },
    });
    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw new Error("Cannot dispatch against a cancelled invoice.");
    }

    const count = await tx.dispatch.count();
    const dispatchNumber = `DSP-${String(count + 1).padStart(6, "0")}`;

    const dispatch = await tx.dispatch.create({
      data: {
        dispatchNumber,
        invoiceId: invoice.id,
        dispatchDate: new Date(data.dispatchDate),
        vehicleRef: data.vehicleRef ?? null,
        createdBy: adminId,
      },
    });

    // Track dispatched quantities per product to update order line progress.
    const dispatchedPerProduct = new Map<string, Decimal>();

    for (const it of data.items) {
      // Find the matching invoice line's product to get its finished-good item.
      const invoiceLine = invoice.items.find((l) => l.productId === it.productId);
      if (!invoiceLine) {
        throw new Error(`Product ${it.productId} is not on invoice ${invoice.invoiceNumber}.`);
      }
      if (!invoiceLine.product) {
        throw new Error(`Product ${it.productId} no longer exists.`);
      }
      const fg = invoiceLine.product.inventoryItem;
      // Decrease FG stock. postStockMovement throws if this would go negative,
      // which is the hard server-side guarantee that dispatch can't exceed stock.
      await postStockMovement(tx, {
        itemId: fg.id,
        movementType: MOVEMENT_TYPES.DISPATCH,
        quantityOut: it.quantity,
        unit: invoiceLine.product.unit,
        sourceDocType: SOURCE_DOC.DISPATCH,
        sourceDocId: dispatch.id,
        userId: adminId,
        remarks: `Dispatch ${dispatchNumber} for invoice ${invoice.invoiceNumber}`,
      });
      await tx.dispatchItem.create({
        data: { dispatchId: dispatch.id, productId: it.productId, quantity: it.quantity },
      });
      dispatchedPerProduct.set(
        it.productId,
        (dispatchedPerProduct.get(it.productId) ?? new Decimal(0)).plus(it.quantity),
      );
    }

    // Update each sales-order line's dispatched quantity + overall order status.
    if (invoice.salesOrder) {
      const orderItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: invoice.salesOrder.id },
      });
      let allDispatched = true;
      for (const oi of orderItems) {
        const justDispatched = dispatchedPerProduct.get(oi.productId) ?? new Decimal(0);
        if (justDispatched.gt(0)) {
          const newDispatched = round2(D(oi.dispatchedQuantity).plus(justDispatched));
          await tx.salesOrderItem.update({
            where: { id: oi.id },
            data: { dispatchedQuantity: newDispatched },
          });
          if (newDispatched.lt(oi.quantity)) allDispatched = false;
        } else if (D(oi.dispatchedQuantity).lt(oi.quantity)) {
          allDispatched = false;
        }
      }
      await tx.salesOrder.update({
        where: { id: invoice.salesOrder.id },
        data: { status: allDispatched ? ORDER_STATUS.DISPATCHED : ORDER_STATUS.PARTIALLY_DISPATCHED },
      });
    }

    await logAudit(tx, {
      userId: adminId,
      action: "CREATE",
      entityType: "Dispatch",
      entityId: dispatch.id,
      newValue: { dispatchNumber, invoice: invoice.invoiceNumber },
      remarks: `Dispatch ${dispatchNumber} posted`,
    });

    return tx.dispatch.findUniqueOrThrow({
      where: { id: dispatch.id },
      include: { items: { include: { product: true } }, invoice: { include: { customer: true } } },
    });
  });
}

export async function listDispatches() {
  return prisma.dispatch.findMany({
    include: { invoice: { include: { customer: true } }, items: { include: { product: true } } },
    orderBy: { dispatchDate: "desc" },
  });
}
