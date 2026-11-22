// Purchase management. Posting a purchase:
//   1. creates the Purchase + PurchaseItem rows,
//   2. posts a PURCHASE_RECEIPT stock movement per line (increasing stock),
//   3. recomputes the weighted-average valuation rate (inside postStockMovement),
//   4. writes an audit row.
// All within one $transaction so stock can never be half-updated.
import { Prisma } from "@prisma/client";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "@/lib/currency";
import { MOVEMENT_TYPES, SOURCE_DOC } from "@/lib/constants";
import { postStockMovement } from "./stock";
import { logAudit } from "./audit";

export const purchaseItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitRate: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional().default(0),
});

export const purchaseSchema = z.object({
  supplierId: z.string().min(1),
  purchaseDate: z.string().min(1),
  referenceInvoiceNumber: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export type PurchaseInput = z.input<typeof purchaseSchema>;

export async function createPurchase(input: PurchaseInput, userId?: string) {
  const data = purchaseSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const count = await tx.purchase.count();
    const purchaseNumber = `PUR-${String(count + 1).padStart(6, "0")}`;

    let subtotal = new Decimal(0);
    let taxTotal = new Decimal(0);

    // Create the purchase header first.
    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber,
        supplierId: data.supplierId,
        purchaseDate: new Date(data.purchaseDate),
        referenceInvoiceNumber: data.referenceInvoiceNumber ?? null,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        remarks: data.remarks ?? null,
        createdBy: userId ?? null,
      },
    });

    for (const it of data.items) {
      const lineSubtotal = round2(D(it.quantity).times(it.unitRate));
      const lineTax = round2(it.taxAmount ?? 0);
      const lineTotal = round2(lineSubtotal.plus(lineTax));
      subtotal = subtotal.plus(lineSubtotal);
      taxTotal = taxTotal.plus(lineTax);

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          itemId: it.itemId,
          quantity: it.quantity,
          unit: it.unit,
          unitRate: it.unitRate,
          taxAmount: lineTax,
          lineTotal,
        },
      });

      // Increase stock + recompute weighted-average rate.
      await postStockMovement(tx, {
        itemId: it.itemId,
        movementType: MOVEMENT_TYPES.PURCHASE_RECEIPT,
        quantityIn: it.quantity,
        unit: it.unit,
        rate: it.unitRate,
        sourceDocType: SOURCE_DOC.PURCHASE,
        sourceDocId: purchase.id,
        userId,
        remarks: `Purchase ${purchaseNumber}`,
      });
    }

    subtotal = round2(subtotal);
    taxTotal = round2(taxTotal);
    const totalAmount = round2(subtotal.plus(taxTotal));

    const updated = await tx.purchase.update({
      where: { id: purchase.id },
      data: { subtotal, taxAmount: taxTotal, totalAmount },
    });

    await logAudit(tx, {
      userId,
      action: "CREATE",
      entityType: "Purchase",
      entityId: purchase.id,
      newValue: { purchaseNumber, totalAmount: totalAmount.toFixed(2) },
      remarks: `Purchase ${purchaseNumber} posted`,
    });

    return tx.purchase.findUniqueOrThrow({
      where: { id: updated.id },
      include: { items: { include: { item: true } }, supplier: true },
    });
  });
}

/** List purchases with their supplier and items. */
export async function listPurchases() {
  return prisma.purchase.findMany({
    include: { supplier: true, items: { include: { item: true } } },
    orderBy: { purchaseDate: "desc" },
  });
}
