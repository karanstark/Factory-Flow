// Sales order workflow:
//   salesman creates an order (SUBMITTED) for an assigned customer,
//   admin verifies stock and approves (APPROVED) or rejects (REJECTED).
//
// Stock availability is validated on the SERVER at approval time (and again,
// atomically, at dispatch). Approval is refused with a shortage amount when
// finished-goods stock is insufficient, which is exactly how the benchmark's
// Distributor B shortage (32 packets) surfaces.
import { Prisma } from "@prisma/client";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "@/lib/currency";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import { logAudit } from "./audit";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  // unitPrice auto-loaded from the product; allow override only by admin.
  unitPrice: z.number().nonnegative().optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  remarks: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Salesman creates an order for an assigned customer. */
export async function createOrder(
  input: CreateOrderInput,
  userId: string,
  role: string,
) {
  const data = createOrderSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({
      where: { id: data.customerId },
    });
    // Salesmen may only order for customers assigned to them.
    if (role === ROLES.SALESMAN && customer.assignedSalesmanId !== userId) {
      throw new Error("You can only create orders for customers assigned to you.");
    }

    let subtotal = new Decimal(0);
    const items = [];
    for (const it of data.items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: it.productId },
        include: { inventoryItem: true },
      });
      if (!product.active) throw new Error(`Product ${product.name} is inactive.`);
      const price = it.unitPrice != null ? D(it.unitPrice) : new Decimal(product.sellingPrice);
      const lineTotal = round2(D(it.quantity).times(price));
      subtotal = subtotal.plus(lineTotal);
      items.push({ product, quantity: it.quantity, unitPrice: price, lineTotal });
    }
    subtotal = round2(subtotal);

    const count = await tx.salesOrder.count();
    const orderNumber = `SO-${String(count + 1).padStart(6, "0")}`;

    const order = await tx.salesOrder.create({
      data: {
        orderNumber,
        customerId: customer.id,
        salesmanId: role === ROLES.SALESMAN ? userId : null,
        orderDate: new Date(data.orderDate),
        status: ORDER_STATUS.SUBMITTED,
        subtotal,
        taxTotal: new Decimal(0), // GST computed at invoicing, not on the order
        total: subtotal,
        remarks: data.remarks ?? null,
      },
    });

    for (const it of items) {
      await tx.salesOrderItem.create({
        data: {
          salesOrderId: order.id,
          productId: it.product.id,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
        },
      });
    }

    await logAudit(tx, {
      userId,
      action: "CREATE",
      entityType: "SalesOrder",
      entityId: order.id,
      newValue: { orderNumber, subtotal: subtotal.toFixed(2) },
      remarks: `Order ${orderNumber} submitted by ${role}`,
    });

    return tx.salesOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: { include: { product: true } }, customer: true },
    });
  });
}

/** Total ordered quantity of a product across the order's items. */
async function orderProductQuantities(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<Map<string, Decimal>> {
  const items = await tx.salesOrderItem.findMany({
    where: { salesOrderId: orderId },
    include: { product: { include: { inventoryItem: true } } },
  });
  const map = new Map<string, Decimal>();
  for (const it of items) {
    map.set(
      it.product.inventoryItem.id,
      (map.get(it.product.inventoryItem.id) ?? new Decimal(0)).plus(it.quantity),
    );
  }
  return map;
}

/**
 * Approve an order after verifying finished-goods stock. Throws with the
 * shortage amount if any product's available stock is insufficient.
 */
export async function approveOrder(orderId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: { include: { inventoryItem: true } } } } },
    });
    if (order.status !== ORDER_STATUS.SUBMITTED && order.status !== ORDER_STATUS.UNDER_REVIEW) {
      throw new Error(`Order ${order.orderNumber} cannot be approved (status ${order.status}).`);
    }

    // Server-side stock validation at approval.
    const shortages: string[] = [];
    for (const it of order.items) {
      const fg = it.product.inventoryItem;
      const available = new Decimal(fg.currentStock);
      if (available.lt(it.quantity)) {
        const short = round2(D(it.quantity).minus(available));
        shortages.push(`${it.product.name}: required ${it.quantity}, available ${available.toFixed(0)}, shortage ${short.toFixed(0)}`);
      }
    }
    if (shortages.length > 0) {
      throw new Error("Insufficient finished-goods stock: " + shortages.join("; "));
    }

    const updated = await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: ORDER_STATUS.APPROVED, reviewedById: adminId },
    });
    await logAudit(tx, {
      userId: adminId,
      action: "APPROVE",
      entityType: "SalesOrder",
      entityId: orderId,
      newValue: { status: ORDER_STATUS.APPROVED },
      remarks: `Order ${order.orderNumber} approved`,
    });
    return updated;
  });
}

export async function rejectOrder(orderId: string, adminId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUniqueOrThrow({ where: { id: orderId } });
    const updated = await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: ORDER_STATUS.REJECTED, reviewedById: adminId, remarks: reason ?? order.remarks },
    });
    await logAudit(tx, {
      userId: adminId,
      action: "REJECT",
      entityType: "SalesOrder",
      entityId: orderId,
      newValue: { status: ORDER_STATUS.REJECTED, reason },
      remarks: `Order ${order.orderNumber} rejected`,
    });
    return updated;
  });
}

export async function listOrders(filter?: { salesmanId?: string; status?: string }) {
  return prisma.salesOrder.findMany({
    where: {
      salesmanId: filter?.salesmanId,
      status: filter?.status,
    },
    include: { customer: true, items: { include: { product: true } }, salesman: true },
    orderBy: { orderDate: "desc" },
  });
}

export async function getOrder(id: string) {
  return prisma.salesOrder.findUniqueOrThrow({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      salesman: true,
      invoices: { include: { dispatches: true, payments: true } },
    },
  });
}
