"use server";

import { requireRole } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/currency";
import { ORDER_STATUS } from "@/lib/constants";
import { createOrder } from "@/server/orders";
import type { CreateOrderInput } from "@/server/orders";

export interface ActionResult {
  ok: boolean;
  error?: string;
  orderNumber?: string;
}

export async function createSalesOrderAction(input: CreateOrderInput): Promise<ActionResult> {
  const user = await requireRole(ROLES.SALESMAN);
  try {
    const order = await createOrder(input, user.id, user.role);
    return { ok: true, orderNumber: order.orderNumber };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the order." };
  }
}

export async function getSalesmanDashboardData() {
  const user = await requireRole(ROLES.SALESMAN);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [orders, customers, invoices, products] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { salesmanId: user.id },
      include: { customer: { select: { name: true } }, items: { select: { id: true } } },
      orderBy: { orderDate: "desc" },
      take: 10,
    }),
    prisma.customer.findMany({
      where: { assignedSalesmanId: user.id, active: true },
      select: { id: true, name: true, code: true, creditLimit: true },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      where: { customer: { assignedSalesmanId: user.id }, status: { not: "CANCELLED" } },
      include: { customer: { select: { name: true } }, payments: { select: { amount: true } } },
      orderBy: { invoiceDate: "desc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { active: true },
      include: { inventoryItem: { select: { currentStock: true, unit: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const CLOSED_STATUSES = new Set<string>([ORDER_STATUS.DISPATCHED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED]);
  const openOrders = orders.filter((o) => !CLOSED_STATUSES.has(o.status));
  const pendingReview = orders.filter((o) => o.status === ORDER_STATUS.SUBMITTED || o.status === ORDER_STATUS.UNDER_REVIEW);
  const outstanding = invoices.reduce((total, inv) => {
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return total + Math.max(0, Number(inv.totalAmount) - paid);
  }, 0);

  return {
    user,
    stats: {
      openOrders: openOrders.length,
      pendingReview: pendingReview.length,
      activeCustomers: customers.length,
      outstanding: inr(outstanding),
      outstandingRaw: outstanding,
    },
    orders,
    customers,
    invoices,
    products,
  };
}