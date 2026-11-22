// Reusable deterministic database setup: master data + opening stock + BOM.
// Used by both prisma/seed.ts (CLI) and the benchmark test so they share one
// source of truth for the NIT benchmark starting point.
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  ROLES, CUSTOMER_TYPE, ITEM_CATEGORY,
} from "@/lib/constants";
import { postOpeningStock } from "@/server/stock";
import { createBom } from "@/server/bom";

export const DEMO_PASSWORD = "demo1234";

export const DEMO_USERS = [
  { email: "admin@factoryflow.demo", name: "Admin User", role: ROLES.ADMIN },
  { email: "salesman.a@factoryflow.demo", name: "Salesman A (Retailer A)", role: ROLES.SALESMAN },
  { email: "salesman.b@factoryflow.demo", name: "Salesman B (Distributor B)", role: ROLES.SALESMAN },
  { email: "production@factoryflow.demo", name: "Production Supervisor", role: ROLES.PRODUCTION },
  { email: "accountant@factoryflow.demo", name: "Accountant / Auditor", role: ROLES.ACCOUNTANT },
  { email: "owner@factoryflow.demo", name: "Owner", role: ROLES.OWNER },
];

/** Delete everything in reverse FK dependency order (safe to re-run). */
export async function deleteAllData() {
  const order = [
    "auditLog", "stockMovement", "payment", "dispatchItem", "dispatch",
    "invoiceItem", "invoice", "salesOrderItem", "salesOrder",
    "productionCostLine", "productionConsumption", "productionRun",
    "purchaseItem", "purchase", "bOMItem", "bOM",
    "customer", "product", "supplier", "inventoryItem", "user",
  ];
  for (const model of order) {
    // @ts-expect-error dynamic model
    await prisma[model].deleteMany({});
  }
}

/** Create master data + opening stock + BOM. Returns nothing; benchmark.ts
 *  looks entities up by their deterministic codes. */
export async function setupDatabase() {
  const pw = await hashPassword(DEMO_PASSWORD);
  const creds = { passwordHash: pw.hash, salt: pw.salt };

  const users: Record<string, { id: string }> = {};
  for (const u of DEMO_USERS) {
    users[u.email] = await prisma.user.create({ data: { ...u, ...creds } });
  }

  const supplier = await prisma.supplier.create({
    data: {
      code: "SUP-001", name: "Chennai Wholesale Traders (DEMO)", gstin: "33SUPP1234C1Z9",
      phone: "044-0000000", address: "Market St, Chennai", state: "Tamil Nadu", stateCode: "33",
    },
  });

  const flour = await prisma.inventoryItem.create({ data: { code: "RM-001", name: "Rice Flour", sku: "RM-FLOUR", category: ITEM_CATEGORY.RAW_MATERIAL, unit: "kg", reorderLevel: 50, openingStock: 100, openingRate: 42, currentStock: 0, avgRate: 0 } });
  const oil = await prisma.inventoryItem.create({ data: { code: "RM-002", name: "Cooking Oil", sku: "RM-OIL", category: ITEM_CATEGORY.RAW_MATERIAL, unit: "L", reorderLevel: 15, openingStock: 30, openingRate: 140, currentStock: 0, avgRate: 0 } });
  const spice = await prisma.inventoryItem.create({ data: { code: "RM-003", name: "Salt & Spice Mix", sku: "RM-SPICE", category: ITEM_CATEGORY.RAW_MATERIAL, unit: "kg", reorderLevel: 3, openingStock: 5, openingRate: 200, currentStock: 0, avgRate: 0 } });
  const pouch = await prisma.inventoryItem.create({ data: { code: "PKG-001", name: "200 g Pouch", sku: "PKG-POUCH-200", category: ITEM_CATEGORY.PACKAGING, unit: "pieces", reorderLevel: 200, openingStock: 500, openingRate: 2.5, currentStock: 0, avgRate: 0 } });
  const carton = await prisma.inventoryItem.create({ data: { code: "PKG-002", name: "Carton", sku: "PKG-CARTON", category: ITEM_CATEGORY.PACKAGING, unit: "pieces", reorderLevel: 20, openingStock: 30, openingRate: 15, currentStock: 0, avgRate: 0 } });
  const fg = await prisma.inventoryItem.create({ data: { code: "FG-001", name: "Murukku 200 g (finished)", sku: "FG-MURUKKU-200", category: ITEM_CATEGORY.FINISHED_GOOD, unit: "packets", reorderLevel: 100, openingStock: 50, openingRate: 30, currentStock: 0, avgRate: 0 } });

  const product = await prisma.product.create({
    data: {
      code: "PROD-001", name: "Murukku 200 g", sku: "MUR-200", description: "South Indian fried snack, 200g pack",
      category: "Packaged Snacks", packSize: "200 g", sellingPrice: 50, gstRate: 5,
      hsnCode: "20041000", unit: "packet", inventoryItemId: fg.id,
    },
  });

  await prisma.customer.create({
    data: {
      code: "CUST-001", name: "Retailer A", customerType: CUSTOMER_TYPE.RETAILER,
      gstin: "33RETAA1234A1Z9", phone: "9000000001", address: "MG Road, Tiruchirappalli",
      state: "Tamil Nadu", stateCode: "33", placeOfSupply: "Tamil Nadu",
      creditLimit: 50000, assignedSalesmanId: users["salesman.a@factoryflow.demo"].id,
    },
  });
  await prisma.customer.create({
    data: {
      code: "CUST-002", name: "Distributor B", customerType: CUSTOMER_TYPE.DISTRIBUTOR,
      gstin: "29DISTB1234B1Z2", phone: "9000000002", address: "Commercial St, Bengaluru",
      state: "Karnataka", stateCode: "29", placeOfSupply: "Karnataka",
      creditLimit: 200000, assignedSalesmanId: users["salesman.b@factoryflow.demo"].id,
    },
  });

  await createBom({
    productId: product.id,
    expectedYield: 200,
    expectedYieldUnit: "packets",
    tolerance: 3,
    notes: "One batch yields 200 packets of 200g Murukku.",
    items: [
      { itemId: flour.id, standardQuantity: 40, unit: "kg" },
      { itemId: oil.id, standardQuantity: 10, unit: "L" },
      { itemId: spice.id, standardQuantity: 1.2, unit: "kg" },
      { itemId: pouch.id, standardQuantity: 200, unit: "pieces" },
      { itemId: carton.id, standardQuantity: 10, unit: "pieces" },
    ],
  }, users["production@factoryflow.demo"].id);

  // Opening stock as OPENING ledger movements (ledger = source of truth).
  await prisma.$transaction(async (tx) => {
    await postOpeningStock(tx, flour.id, 100, 42, "kg");
    await postOpeningStock(tx, oil.id, 30, 140, "L");
    await postOpeningStock(tx, spice.id, 5, 200, "kg");
    await postOpeningStock(tx, pouch.id, 500, 2.5, "pieces");
    await postOpeningStock(tx, carton.id, 30, 15, "pieces");
    await postOpeningStock(tx, fg.id, 50, 30, "packets");
  });
}
