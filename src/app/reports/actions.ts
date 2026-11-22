"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { D, inr } from "@/lib/currency";
import { INVOICE_STATUS, ROLES } from "@/lib/constants";

export async function getReportsDashboardData() {
  const user = await requireRole(ROLES.ACCOUNTANT, ROLES.ADMIN, ROLES.OWNER, ROLES.PRODUCTION);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [invoices, payments, customers, inventory, monthPaymentTotal] = await Promise.all([
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
    prisma.payment.aggregate({
      where: { paymentDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);

  const inventoryValue = inventory.reduce(
    (total, item) => total.plus(D(item.currentStock).times(item.avgRate)),
    D(0),
  );

  const postedInvoices = invoices.filter((i) => i.status === INVOICE_STATUS.POSTED);
  const partiallyPaid = invoices.filter((i) => i.status === INVOICE_STATUS.PARTIALLY_PAID);
  const paidInvoices = invoices.filter((i) => i.status === INVOICE_STATUS.PAID);

  const totalInvoiced = invoices.reduce((sum, i) => sum.plus(i.totalAmount), D(0));
  const totalPaid = invoices.reduce((sum, i) => {
    return sum.plus(i.payments.reduce((paid, payment) => paid.plus(payment.amount), D(0)));
  }, D(0));
  const totalOutstanding = totalInvoiced.minus(totalPaid);
  const thisMonthPayments = monthPaymentTotal._sum.amount ?? D(0);

  const customerBalances = customers.map((c) => {
    const invoiced = c.invoices.reduce((sum, i) => sum.plus(i.totalAmount), D(0));
    const paid = c.invoices.reduce(
      (sum, i) => sum.plus(i.payments.reduce((invoicePaid, payment) => invoicePaid.plus(payment.amount), D(0))),
      D(0),
    );
    const balance = invoiced.minus(paid);
    return {
      customer: c,
      invoiced: invoiced.toString(),
      paid: paid.toString(),
      balance: balance.toString(),
    };
  });

  // GST summary across non-cancelled invoices.
  const gst = invoices.reduce(
    (acc, i) => ({
      taxable: acc.taxable.plus(i.totalTaxable),
      cgst: acc.cgst.plus(i.cgst),
      sgst: acc.sgst.plus(i.sgst),
      igst: acc.igst.plus(i.igst),
      count: acc.count + 1,
    }),
    { taxable: D(0), cgst: D(0), sgst: D(0), igst: D(0), count: 0 },
  );

  // Simple ageing of unpaid invoice balances by days since invoice date.
  const now = Date.now();
  const ageing = { "0-30": D(0), "31-60": D(0), "61-90": D(0), "90+": D(0) };
  for (const i of invoices) {
    const paidSum = i.payments.reduce((s, p) => s.plus(p.amount), D(0));
    const bal = D(i.totalAmount).minus(paidSum);
    if (bal.lte(0)) continue;
    const days = Math.floor((now - i.invoiceDate.getTime()) / 86400000);
    const bucket = days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
    ageing[bucket as keyof typeof ageing] = ageing[bucket as keyof typeof ageing].plus(bal);
  }

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
    customerBalances: customerBalances.filter((c) => D(c.balance).gt(0)).slice(0, 10),
    inventory,
    gstSummary: {
      taxable: inr(gst.taxable), cgst: inr(gst.cgst), sgst: inr(gst.sgst), igst: inr(gst.igst),
      invoiceCount: gst.count,
    },
    ageing: Object.fromEntries(Object.entries(ageing).map(([k, v]) => [k, inr(v)])),
  };
}