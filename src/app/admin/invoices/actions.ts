"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES, PAYMENT_METHODS } from "@/lib/constants";
import { recordPayment } from "@/server/payments";
import { createDispatch } from "@/server/dispatch";
import { cancelInvoiceWithCreditNote } from "@/server/invoice";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function getAdminInvoicesData() {
  await requireRole(ROLES.ADMIN, ROLES.OWNER, ROLES.ACCOUNTANT);
  const invoices = await prisma.invoice.findMany({
    include: {
      customer: { select: { id: true, name: true, code: true, state: true } },
      salesOrder: { select: { orderNumber: true } },
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, unit: true,
              inventoryItem: { select: { id: true, currentStock: true } },
            },
          },
        },
      },
      payments: { orderBy: { paymentDate: "desc" } },
      dispatches: { include: { items: true } },
      creditNotes: true,
    },
    orderBy: { invoiceDate: "desc" },
    take: 50,
  });
  return { invoices, paymentMethods: [...PAYMENT_METHODS] };
}

export async function recordPaymentAction(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  remarks?: string;
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER, ROLES.ACCOUNTANT);
  try {
    await recordPayment(
      {
        invoiceId: input.invoiceId,
        paymentDate: input.paymentDate,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || undefined,
        remarks: input.remarks || undefined,
      },
      user.id,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Payment failed." };
  }
}

export async function createDispatchAction(input: {
  invoiceId: string;
  dispatchDate: string;
  vehicleRef?: string;
  items: { productId: string; quantity: number }[];
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    await createDispatch(
      {
        invoiceId: input.invoiceId,
        dispatchDate: input.dispatchDate,
        vehicleRef: input.vehicleRef || undefined,
        items: input.items.filter((i) => i.quantity > 0),
      },
      user.id,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Dispatch failed." };
  }
}

export async function cancelInvoiceAction(input: {
  invoiceId: string;
  reason: string;
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    await cancelInvoiceWithCreditNote(input.invoiceId, user.id, input.reason || undefined);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Cancellation failed." };
  }
}
