"use server";

import { requireRole } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/currency";
import { ORDER_STATUS, PRODUCTION_STATUS } from "@/lib/constants";

export async function getAdminDashboardData() {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [inventory, orders, recentRuns, invoices, users, customers] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, category: true, unit: true, currentStock: true, reorderLevel: true, avgRate: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.salesOrder.findMany({
      include: { customer: { select: { name: true } }, items: { select: { id: true } } },
      orderBy: { orderDate: "desc" },
      take: 10,
    }),
    prisma.productionRun.findMany({
      where: { status: { not: PRODUCTION_STATUS.REVERSED } },
      include: { product: { select: { name: true } } },
      orderBy: { productionDate: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { customer: { select: { name: true } }, payments: { select: { amount: true } } },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.customer.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true, customerType: true, assignedSalesmanId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const lowStock = inventory.filter((item) => item.reorderLevel !== null && Number(item.currentStock) <= Number(item.reorderLevel));
  const inventoryValue = inventory.reduce((total, item) => total + Number(item.currentStock) * Number(item.avgRate), 0);
  const CLOSED_STATUSES = new Set([ORDER_STATUS.DISPATCHED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED]);
  const openOrders = orders.filter((o) => !CLOSED_STATUSES.has(o.status)).length;
  const awaitingReview = orders.filter((o) => o.status === ORDER_STATUS.SUBMITTED || o.status === ORDER_STATUS.UNDER_REVIEW).length;
  const producedThisMonth = recentRuns
    .filter((run) => run.status === PRODUCTION_STATUS.POSTED && run.productionDate >= monthStart)
    .reduce((total, run) => total + Number(run.actualGoodOutput), 0);
  const outstanding = invoices.reduce((total, inv) => {
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return total + Math.max(0, Number(inv.totalAmount) - paid);
  }, 0);

  return {
    user,
    stats: {
      inventoryValue: inr(inventoryValue),
      inventoryCount: inventory.length,
      lowStockCount: lowStock.length,
      openOrders,
      awaitingReview,
      producedThisMonth,
      outstanding: inr(outstanding),
      outstandingRaw: outstanding,
      activeUsers: users.filter((u) => u.active).length,
      totalCustomers: customers.length,
    },
    lowStock,
    orders,
    recentRuns,
    invoices: invoices.slice(0, 5),
    users: users.slice(0, 5),
  };
}