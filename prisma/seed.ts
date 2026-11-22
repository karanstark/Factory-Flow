// FACTORYFLOW deterministic seed.
//   npm run seed  ->  prisma db push --force-reset && tsx prisma/seed.ts
//
// Resets the DB, loads master data + opening stock (setupDatabase), then runs
// the full NIT benchmark scenario via the real domain services.
//
// Demo login (ALL roles use the same demo password): demo1234
//   admin@factoryflow.demo  salesman.a@factoryflow.demo  salesman.b@factoryflow.demo
//   production@factoryflow.demo  accountant@factoryflow.demo  owner@factoryflow.demo
//
// The finished-goods opening rate (50 packets @ ₹30) is an assumption — the
// benchmark specifies no FG opening rate; it does not affect any benchmark
// check (production cost/packet is computed from the run's own costs).
process.loadEnvFile?.();

import { prisma } from "@/lib/prisma";
import { deleteAllData, setupDatabase } from "@/server/setup";
import { runBenchmarkScenario } from "@/server/benchmark";

async function main() {
  console.log("→ Clearing existing data…");
  await deleteAllData();

  console.log("→ Loading master data + opening stock…");
  await setupDatabase();

  console.log("→ Running NIT benchmark scenario…");
  const summary = await runBenchmarkScenario();

  console.log("\n=== BENCHMARK SCENARIO COMPLETE ===");
  console.log(`Purchase:             ${summary.purchaseNumber}`);
  console.log(`Production run:        ${summary.runNumber}  (cost/packet ₹${summary.costPerPacket})`);
  console.log(`Retailer A order:      ${summary.retailerOrderNumber}`);
  console.log(`Retailer A invoice:    ${summary.retailerInvoiceNumber}`);
  console.log(`Retailer A dispatch:   ${summary.retailerDispatchNumber}`);
  console.log(`Distributor B order:   ${summary.distributorOrderNumber}  (shortage ${summary.distributorShortage})`);
  console.log(`Retailer A payment:   ${summary.paymentNumber}`);
  console.log("=== Demo login: any role email @factoryflow.demo, password: demo1234 ===\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
