// Payment & receivable management.
//   - Partial payments allowed.
//   - Outstanding = invoice.totalAmount - sum(payments).
//   - Payments exceeding outstanding are rejected (no silent overpayment).
//   - Invoice status becomes PARTIALLY_PAID or PAID accordingly.
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "@/lib/currency";
import { INVOICE_STATUS, PAYMENT_METHODS } from "@/lib/constants";
import { logAudit } from "./audit";

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS as unknown as [string, ...string[]]),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export async function getOutstanding(invoiceId: string): Promise<Decimal> {
  const [invoice, payments] = await Promise.all([
    prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } }),
    prisma.payment.findMany({ where: { invoiceId } }),
  ]);
  const paid = payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
  return round2(new Decimal(invoice.totalAmount).minus(paid));
}

export async function recordPayment(input: RecordPaymentInput, adminId: string) {
  const data = recordPaymentSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: data.invoiceId },
      include: { payments: true },
    });
    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw new Error("Cannot record a payment against a cancelled invoice.");
    }

    const paid = invoice.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
    const outstanding = round2(new Decimal(invoice.totalAmount).minus(paid));

    if (D(data.amount).gt(outstanding) && outstanding.gt(0)) {
      throw new Error(
        `Payment ₹${data.amount.toFixed(2)} exceeds outstanding ₹${outstanding.toFixed(2)}. Overpayment is not permitted without explicit handling.`,
      );
    }

    const count = await tx.payment.count();
    const paymentNumber = `PAY-${String(count + 1).padStart(6, "0")}`;

    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        paymentDate: new Date(data.paymentDate),
        amount: round2(data.amount),
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber ?? null,
        remarks: data.remarks ?? null,
        createdBy: adminId,
      },
    });

    const newPaid = round2(paid.plus(data.amount));
    const newOutstanding = round2(new Decimal(invoice.totalAmount).minus(newPaid));
    const status = newOutstanding.lte(0) ? INVOICE_STATUS.PAID : INVOICE_STATUS.PARTIALLY_PAID;
    await tx.invoice.update({ where: { id: invoice.id }, data: { status } });

    await logAudit(tx, {
      userId: adminId,
      action: "CREATE",
      entityType: "Payment",
      entityId: payment.id,
      newValue: { paymentNumber, amount: round2(data.amount).toFixed(2), outstanding: newOutstanding.toFixed(2) },
      remarks: `Payment ${paymentNumber} recorded for invoice ${invoice.invoiceNumber}`,
    });

    return tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { invoice: true, customer: true },
    });
  });
}

export async function listPayments() {
  return prisma.payment.findMany({
    include: { invoice: true, customer: true },
    orderBy: { paymentDate: "desc" },
  });
}

/** Customer-wise outstanding (across all their invoices). */
export async function customerOutstanding(customerId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { customerId, status: { not: INVOICE_STATUS.CANCELLED } },
    include: { payments: true },
  });
  let total = new Decimal(0);
  const rows = invoices.map((inv) => {
    const paid = inv.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
    const outstanding = round2(new Decimal(inv.totalAmount).minus(paid));
    total = total.plus(outstanding);
    return { invoiceNumber: inv.invoiceNumber, totalAmount: inv.totalAmount, paid, outstanding };
  });
  return { totalOutstanding: round2(total), rows };
}
