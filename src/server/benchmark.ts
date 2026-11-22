// The NIT benchmark scenario runner.
//
// Executes the exact supplied scenario through the REAL domain services
// (purchases, production, orders, invoicing, dispatch, payments) so the
// benchmark test validates actual application behavior rather than fixtures:
//
//   1. Purchase 60 kg flour at ₹45/kg        (flour wtd-avg -> ₹43.125/kg)
//   2. Produce one batch:
//        flour 40 kg, oil 10.5 L, spice 1.2 kg, pouches 194 (188 good + 6 dmg),
//        cartons 9, good output 188, labour ₹1200, gas ₹600
//   3. Retailer A (TN) orders 150 -> admin approves -> invoice -> dispatch 150
//   4. Distributor B (Karnataka) orders 120 -> approval FAILS (shortage 32)
//   5. Retailer A pays ₹4000 (outstanding -> ₹3875)
//
// Returns a summary for logging; the benchmark test independently queries the
// DB to assert the expected balances.
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/currency";
import { createPurchase } from "./purchases";
import { createProductionRun, postProductionRun } from "./production";
import { createOrder, approveOrder } from "./orders";
import { generateInvoiceFromOrder } from "./invoice";
import { createDispatch } from "./dispatch";
import { recordPayment } from "./payments";

export interface BenchmarkSummary {
  purchaseNumber: string;
  runNumber: string;
  retailerOrderNumber: string;
  retailerInvoiceNumber: string;
  retailerDispatchNumber: string;
  distributorOrderNumber: string;
  distributorShortage: number;
  paymentNumber: string;
  costPerPacket: string;
}

async function byCode(model: "inventoryItem" | "product" | "customer" | "supplier", code: string) {
  // @ts-expect-error - dynamic model lookup by code
  return prisma[model].findUniqueOrThrow({ where: { code } });
}

export async function runBenchmarkScenario(): Promise<BenchmarkSummary> {
  // --- Look up seeded entities by deterministic codes ---
  const flour = await byCode("inventoryItem", "RM-001");
  const oil = await byCode("inventoryItem", "RM-002");
  const spice = await byCode("inventoryItem", "RM-003");
  const pouch = await byCode("inventoryItem", "PKG-001");
  const carton = await byCode("inventoryItem", "PKG-002");
  const product = await byCode("product", "PROD-001");
  const supplier = await byCode("supplier", "SUP-001");
  const retailer = await byCode("customer", "CUST-001");
  const distributor = await byCode("customer", "CUST-002");

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@factoryflow.demo" } });
  const salesmanA = await prisma.user.findUniqueOrThrow({ where: { email: "salesman.a@factoryflow.demo" } });
  const salesmanB = await prisma.user.findUniqueOrThrow({ where: { email: "salesman.b@factoryflow.demo" } });
  const production = await prisma.user.findUniqueOrThrow({ where: { email: "production@factoryflow.demo" } });
  const bom = await prisma.bOM.findFirstOrThrow({
    where: { productId: product.id, status: "ACTIVE" },
    orderBy: { version: "desc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  // --- 1. Purchase 60 kg flour at ₹45/kg ---
  const purchase = await createPurchase(
    {
      supplierId: supplier.id,
      purchaseDate: today,
      items: [{ itemId: flour.id, quantity: 60, unit: "kg", unitRate: 45 }],
    },
    admin.id,
  );

  // --- 2. Production run (batch = expected yield = 200) ---
  const run = await createProductionRun(
    { productId: product.id, bomId: bom.id, batchSize: 200, productionDate: today },
    production.id,
  );
  // Actuals: flour 40, oil 10.5, spice 1.2, pouches 194 (188 good + 6 damaged),
  // cartons 9. Pouch actual (194) includes the 6 damaged.
  const posted = await postProductionRun(
    run.id,
    {
      consumption: [
        { itemId: flour.id, actualQuantity: 40 },
        { itemId: oil.id, actualQuantity: 10.5 },
        { itemId: spice.id, actualQuantity: 1.2 },
        { itemId: pouch.id, actualQuantity: 194 },
        { itemId: carton.id, actualQuantity: 9 },
      ],
      actualGoodOutput: 188,
      damagedPackaging: 6,
      damagedItemId: pouch.id,
      scrapWastage: 0,
      labourCost: 1200,
      gasPowerCost: 600,
      otherOverheads: 0,
    },
    production.id,
  );

  // --- 3. Retailer A orders 150 -> approve -> invoice -> dispatch 150 ---
  const retailerOrder = await createOrder(
    {
      customerId: retailer.id,
      orderDate: today,
      items: [{ productId: product.id, quantity: 150 }],
    },
    salesmanA.id,
    "SALESMAN",
  );
  await approveOrder(retailerOrder.id, admin.id);
  const retailerInvoice = await generateInvoiceFromOrder(retailerOrder.id, admin.id);
  const retailerDispatch = await createDispatch(
    {
      invoiceId: retailerInvoice.id,
      dispatchDate: today,
      items: [{ productId: product.id, quantity: 150 }],
    },
    admin.id,
  );

  // --- 4. Distributor B orders 120 -> approval must fail (shortage 32) ---
  const distributorOrder = await createOrder(
    {
      customerId: distributor.id,
      orderDate: today,
      items: [{ productId: product.id, quantity: 120 }],
    },
    salesmanB.id,
    "SALESMAN",
  );
  let distributorShortage = 0;
  try {
    await approveOrder(distributorOrder.id, admin.id);
    // If approval unexpectedly succeeded, recompute shortage defensively.
    const fg = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: product.inventoryItemId } });
    distributorShortage = Math.max(0, 120 - Number(fg.currentStock));
    throw new Error("Distributor B approval unexpectedly succeeded; benchmark expects a shortage.");
  } catch (e) {
    const err = e as Error;
    if (err.message.includes("unexpectedly succeeded")) {
      throw e; // surface the anomaly
    }
    // Expected: approval refused due to insufficient stock. Compute shortage.
    const fg = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: product.inventoryItemId } });
    distributorShortage = Math.max(0, 120 - Number(fg.currentStock));
  }

  // --- 5. Retailer A pays ₹4000 (outstanding -> ₹3875) ---
  const payment = await recordPayment(
    {
      invoiceId: retailerInvoice.id,
      paymentDate: today,
      amount: 4000,
      paymentMethod: "BANK",
      referenceNumber: "NEFT-DEMO-0001",
    },
    admin.id,
  );

  return {
    purchaseNumber: purchase.purchaseNumber,
    runNumber: posted.runNumber,
    retailerOrderNumber: retailerOrder.orderNumber,
    retailerInvoiceNumber: retailerInvoice.invoiceNumber,
    retailerDispatchNumber: retailerDispatch.dispatchNumber,
    distributorOrderNumber: distributorOrder.orderNumber,
    distributorShortage,
    paymentNumber: payment.paymentNumber,
    costPerPacket: posted.costPerPacket.toFixed(2),
  };
}
