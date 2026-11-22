"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES, CUSTOMER_TYPE, ITEM_CATEGORY } from "@/lib/constants";
import { createBom } from "@/server/bom";
import { postStockMovement } from "@/server/stock";
import { MOVEMENT_TYPES, SOURCE_DOC } from "@/lib/constants";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function nextCode(prefix: string, model: "customer" | "supplier" | "inventoryItem" | "product"): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = await (prisma[model] as any).count();
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

// ---------- Customers ----------
export async function createCustomerAction(input: {
  name: string; customerType: string; gstin?: string; phone?: string;
  address?: string; state: string; stateCode: string; creditLimit?: number;
  assignedSalesmanId?: string;
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    if (!input.name || !input.state || !input.stateCode) return { ok: false, error: "Name, state and state code are required." };
    const code = await nextCode("CUST", "customer");
    await prisma.customer.create({
      data: {
        code, name: input.name, customerType: input.customerType || CUSTOMER_TYPE.RETAILER,
        gstin: input.gstin || null, phone: input.phone || null, address: input.address || null,
        state: input.state, stateCode: input.stateCode, placeOfSupply: input.state,
        creditLimit: input.creditLimit ?? null,
        assignedSalesmanId: input.assignedSalesmanId || null,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create customer." };
  }
}

// ---------- Suppliers ----------
export async function createSupplierAction(input: {
  name: string; gstin?: string; phone?: string; address?: string; state?: string; stateCode?: string;
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    if (!input.name) return { ok: false, error: "Supplier name is required." };
    const code = await nextCode("SUP", "supplier");
    await prisma.supplier.create({
      data: {
        code, name: input.name, gstin: input.gstin || null, phone: input.phone || null,
        address: input.address || null, state: input.state || null, stateCode: input.stateCode || null,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create supplier." };
  }
}

// ---------- Raw material / packaging items ----------
export async function createStockItemAction(input: {
  name: string; sku: string; category: string; unit: string;
  reorderLevel?: number; openingQty?: number; openingRate?: number;
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER, ROLES.PRODUCTION);
  try {
    if (!input.name || !input.sku || !input.unit) return { ok: false, error: "Name, SKU and unit are required." };
    if (![ITEM_CATEGORY.RAW_MATERIAL, ITEM_CATEGORY.PACKAGING].includes(input.category as never)) {
      return { ok: false, error: "Category must be RAW_MATERIAL or PACKAGING (finished goods come from Products)." };
    }
    const prefix = input.category === ITEM_CATEGORY.RAW_MATERIAL ? "RM" : "PKG";
    const code = await nextCode(prefix, "inventoryItem");
    const openingQty = input.openingQty ?? 0;
    const openingRate = input.openingRate ?? 0;
    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          code, name: input.name, sku: input.sku, category: input.category, unit: input.unit,
          reorderLevel: input.reorderLevel ?? null,
          openingStock: openingQty, openingRate,
          currentStock: 0, avgRate: 0,
        },
      });
      if (openingQty > 0) {
        await postStockMovement(tx, {
          itemId: item.id,
          movementType: MOVEMENT_TYPES.OPENING,
          quantityIn: openingQty,
          unit: input.unit,
          rate: openingRate,
          sourceDocType: SOURCE_DOC.OPENING,
          sourceDocId: item.id,
          userId: user.id,
          remarks: "Opening stock",
        });
      }
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create item." };
  }
}

// ---------- Finished-good product (creates its FG stock item too) ----------
export async function createProductAction(input: {
  name: string; sku: string; packSize: string; sellingPrice: number; gstRate: number;
  hsnCode: string; category?: string; unit?: string; openingQty?: number; openingRate?: number;
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  try {
    if (!input.name || !input.sku || !(input.sellingPrice >= 0) || !input.hsnCode) {
      return { ok: false, error: "Name, SKU, price and HSN are required." };
    }
    const fgCode = await nextCode("FG", "inventoryItem");
    const prodCode = await nextCode("PROD", "product");
    const unit = input.unit || "packets";
    const openingQty = input.openingQty ?? 0;
    const openingRate = input.openingRate ?? 0;
    await prisma.$transaction(async (tx) => {
      const fg = await tx.inventoryItem.create({
        data: {
          code: fgCode, name: `${input.name} (finished)`, sku: `FG-${input.sku}`, category: ITEM_CATEGORY.FINISHED_GOOD,
          unit, openingStock: openingQty, openingRate, currentStock: 0, avgRate: 0,
        },
      });
      await tx.product.create({
        data: {
          code: prodCode, name: input.name, sku: input.sku,
          category: input.category || "Packaged Snacks", packSize: input.packSize || "",
          sellingPrice: input.sellingPrice, gstRate: input.gstRate, hsnCode: input.hsnCode,
          unit, inventoryItemId: fg.id,
        },
      });
      if (openingQty > 0) {
        await postStockMovement(tx, {
          itemId: fg.id, movementType: MOVEMENT_TYPES.OPENING, quantityIn: openingQty,
          unit, rate: openingRate, sourceDocType: SOURCE_DOC.OPENING, sourceDocId: fg.id,
          userId: user.id, remarks: "Opening stock",
        });
      }
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create product." };
  }
}

// ---------- BOM ----------
export async function createBomAction(input: {
  productId: string; expectedYield: number; expectedYieldUnit?: string; tolerance?: number;
  notes?: string; items: { itemId: string; standardQuantity: number }[];
}): Promise<ActionResult> {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER, ROLES.PRODUCTION);
  try {
    const items = input.items.filter((i) => i.itemId && i.standardQuantity > 0);
    if (!input.productId || !(input.expectedYield > 0) || !items.length) {
      return { ok: false, error: "Product, yield and at least one component are required." };
    }
    // Fill unit from the inventory item so BOM rows stay consistent.
    const invItems = await prisma.inventoryItem.findMany({
      where: { id: { in: items.map((i) => i.itemId) } },
      select: { id: true, unit: true },
    });
    const unitById = new Map(invItems.map((i) => [i.id, i.unit]));
    await createBom(
      {
        productId: input.productId,
        expectedYield: input.expectedYield,
        expectedYieldUnit: input.expectedYieldUnit || "packets",
        tolerance: input.tolerance ?? 3,
        notes: input.notes || undefined,
        items: items.map((i) => ({ itemId: i.itemId, standardQuantity: i.standardQuantity, unit: unitById.get(i.itemId) ?? "" })),
      },
      user.id,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create BOM." };
  }
}

// ---------- Masters data for the forms ----------
export async function getMastersData() {
  await requireRole(ROLES.ADMIN, ROLES.OWNER, ROLES.PRODUCTION);
  const [customers, suppliers, stockItems, products, salesmen, boms] = await Promise.all([
    prisma.customer.findMany({ include: { assignedSalesman: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({
      where: { category: { in: [ITEM_CATEGORY.RAW_MATERIAL, ITEM_CATEGORY.PACKAGING] } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      include: {
        inventoryItem: { select: { currentStock: true } },
        boms: { orderBy: { version: "desc" }, take: 1, include: { items: { include: { item: { select: { name: true } } } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { role: ROLES.SALESMAN, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.bOM.findMany({ include: { product: { select: { name: true } }, items: { include: { item: { select: { name: true, unit: true } } } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  return { customers, suppliers, stockItems, products, salesmen, boms };
}
