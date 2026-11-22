"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES, ORDER_STATUS } from "@/lib/constants";
import { approveOrder, rejectOrder } from "@/server/orders";
import { generateInvoiceFromOrder } from "@/server/invoice";
import { D } from "@/lib/currency";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function getAdminOrdersData() {
  await requireRole(ROLES.ADMIN, ROLES.OWNER);
  const orders = await prisma.salesOrder.findMany({
    include: {
      customer: { select: { id: true, name: true, code: true, state: true } },
      salesman: { select: { name: true } },
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, packSize: true, unit: true, sellingPrice: true,
              inventoryItem: { select: { id: true, currentStock: true } },
            },
          },
        },
      },
      invoices: { select: { id: true, invoiceNumber: true, status: true } },
    },
    orderBy: { orderDate: "desc" },
    take: 50,
  });
  return { orders };
}

export async function approveOrderAction(orderId: string): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    await approveOrder(orderId, user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Approval failed." };
  }
}

export async function rejectOrderAction(orderId: string, reason: string): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    await rejectOrder(orderId, user.id, reason || undefined);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Rejection failed." };
  }
}

export async function generateInvoiceAction(orderId: string): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER, ROLES.ACCOUNTANT);
  try {
    await generateInvoiceFromOrder(orderId, user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invoicing failed." };
  }
}
