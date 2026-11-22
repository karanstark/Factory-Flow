"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES, ITEM_CATEGORY } from "@/lib/constants";
import { createPurchase } from "@/server/purchases";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function getPurchasesData() {
  await requireRole(ROLES.ADMIN, ROLES.OWNER, ROLES.ACCOUNTANT);
  const [purchases, suppliers, items] = await Promise.all([
    prisma.purchase.findMany({
      include: { supplier: true, items: { include: { item: { select: { name: true, unit: true } } } } },
      orderBy: { purchaseDate: "desc" },
      take: 30,
    }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({
      where: { category: { in: [ITEM_CATEGORY.RAW_MATERIAL, ITEM_CATEGORY.PACKAGING] }, active: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { purchases, suppliers, items };
}

export async function createPurchaseAction(input: {
  supplierId: string;
  purchaseDate: string;
  referenceInvoiceNumber?: string;
  remarks?: string;
  items: { itemId: string; quantity: number; unit: string; unitRate: number; taxAmount?: number }[];
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    const items = input.items.filter((i) => i.itemId && i.quantity > 0);
    if (!input.supplierId || !items.length) return { ok: false, error: "Supplier and at least one item are required." };
    await createPurchase(
      {
        supplierId: input.supplierId,
        purchaseDate: input.purchaseDate,
        referenceInvoiceNumber: input.referenceInvoiceNumber || undefined,
        remarks: input.remarks || undefined,
        items,
      },
      user.id,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Purchase failed." };
  }
}
