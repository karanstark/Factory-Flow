"use server";

import { requireRole } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/currency";
import { INVOICE_STATUS } from "@/lib/constants";

export async function getReportsDashboardData() {
  const user = await requireRole(ROLES.ACCOUNTANT, ROLES.ADMIN, ROLES.OWNER, ROLES.PRODUCTION);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [invoices, payments, customers, inventory] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { customer: { select: { name: true, code: true, state: true } }, items: true, payments: true },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.payment.findMany({
      include: { customer: { select: { name: true } }, invoice: { select: { invoiceNumber: true } } },
      orderBy: { paymentDate: "desc" },
      take: 20,
    }),
    prisma.customer.findMany({
      where: { active: true },
      include: { invoices: { where: { status: { not: "CANCELLED" } }, include: { payments: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, category: true, unit: true, currentStock: true, avgRate: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  const inventoryValue = inventory.reduce((total, item) => total + Number(item.currentStock) * Number(item.avgRate), 0);

  const postedInvoices = invoices.filter((i) => i.status === INVOICE_STATUS.POSTED);
  const partiallyPaid = invoices.filter((i) => i.status === INVOICE_STATUS.PARTIALLY_PAID);
  const paidInvoices = invoices.filter((i) => i.status === INVOICE_STATUS.PAID);

  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const totalPaid = invoices.reduce((sum, i) => {
    const paid = i.payments.reduce((p, pay) => p + Number(pay.amount), 0);
    return sum + paid;
  }, 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const thisMonthPayments = payments
    .filter((p) => p.paymentDate >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const customerBalances = customers.map((c) => {
    const invoiced = c.invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const paid = c.invoices.reduce((sum, i) => sum + i.payments.reduce((p, pay) => p + Number(pay.amount), 0), 0);
    return { customer: c, invoiced, paid, balance: Math.max(0, invoiced - paid) };
  });

  return {
    user,
    stats: {
      inventoryValue: inr(inventoryValue),
      totalInvoiced: inr(totalInvoiced),
      totalPaid: inr(totalPaid),
      totalOutstanding: inr(totalOutstanding),
      postedCount: postedInvoices.length,
      partiallyPaidCount: partiallyPaid.length,
      paidCount: paidInvoices.length,
      thisMonthPayments: inr(thisMonthPayments),
      activeCustomers: customers.length,
    },
    invoices: invoices.slice(0, 10),
    payments: payments.slice(0, 10),
    customerBalances: customerBalances.filter((c) => c.balance > 0).slice(0, 10),
    inventory,
  };
}