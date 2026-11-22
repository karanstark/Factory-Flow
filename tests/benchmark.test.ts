// The automated benchmark test: resets the DB, loads the NIT benchmark, runs
// the full scenario through the real services, and asserts every expected
// balance from the spec's "EXPECTED BENCHMARK CHECKS".
import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { deleteAllData, setupDatabase } from "@/server/setup";
import { runBenchmarkScenario } from "@/server/benchmark";
import { postProductionRun } from "@/server/production";
import { yieldVariancePct } from "@/lib/inventory-math";
import { reconcileAll } from "@/lib/reconcile";
import { getOutstanding } from "@/server/payments";

const approx = (d: { toNumber: () => number } | number, n: number, eps = 0.01) =>
  expect(typeof d === "number" ? d : d.toNumber()).toBeCloseTo(n, Math.round(-Math.log10(eps)));

const byCode = (code: string) =>
  prisma.inventoryItem.findUniqueOrThrow({ where: { code } });

beforeAll(async () => {
  await deleteAllData();
  await setupDatabase();
  await runBenchmarkScenario();
}, 60000);

describe("NIT benchmark — stock balances after the full scenario", () => {
  it("flour: 100 + 60 (purchase) - 40 (production) = 120 kg", async () => {
    approx((await byCode("RM-001")).currentStock, 120);
  });
  it("oil: 30 - 10.5 (production) = 19.5 L", async () => {
    approx((await byCode("RM-002")).currentStock, 19.5);
  });
  it("pouches: 500 - 188 (issued) - 6 (damaged) = 306 pieces", async () => {
    approx((await byCode("PKG-001")).currentStock, 306);
  });
  it("cartons: 30 - 9 (production) = 21 pieces", async () => {
    approx((await byCode("PKG-002")).currentStock, 21);
  });
  it("finished goods: 50 + 188 (produced) - 150 (dispatched) = 88 packets", async () => {
    approx((await byCode("FG-001")).currentStock, 88);
  });
});

describe("NIT benchmark — valuation & variance", () => {
  it("flour weighted-average rate = ₹43.125/kg after purchase", async () => {
    approx((await byCode("RM-001")).avgRate, 43.125);
  });
  it("oil consumption variance = +5%", async () => {
    const run = await prisma.productionRun.findFirstOrThrow({
      include: { consumption: { include: { item: true } } },
    });
    const oilLine = run.consumption.find((c) => c.item.code === "RM-002")!;
    approx(oilLine.variancePct ?? 0, 5);
  });
  it("yield variance = -6%", async () => {
    const run = await prisma.productionRun.findFirstOrThrow();
    approx(yieldVariancePct(run.actualGoodOutput, run.expectedOutput), -6);
  });
  it("cost per good packet = ₹31.14 (5855 / 188)", async () => {
    const run = await prisma.productionRun.findFirstOrThrow();
    approx(run.costPerPacket, 31.14);
  });
  it("production run is POSTED", async () => {
    const run = await prisma.productionRun.findFirstOrThrow();
    expect(run.status).toBe("POSTED");
  });
});

describe("NIT benchmark — sales / GST invoice", () => {
  it("Retailer A invoice: taxable 7500, CGST 187.50, SGST 187.50, total 7875", async () => {
    const inv = await prisma.invoice.findFirstOrThrow({
      where: { salesOrder: { customer: { code: "CUST-001" } } },
    });
    approx(inv.totalTaxable, 7500);
    approx(inv.cgst, 187.5);
    approx(inv.sgst, 187.5);
    approx(inv.igst, 0);
    approx(inv.totalAmount, 7875);
  });
  it("Retailer A order is DISPATCHED", async () => {
    const so = await prisma.salesOrder.findFirstOrThrow({
      where: { customer: { code: "CUST-001" } },
    });
    expect(so.status).toBe("DISPATCHED");
  });
});

describe("NIT benchmark — receivables & shortage", () => {
  it("Retailer A outstanding = ₹3875 (7875 - 4000)", async () => {
    const inv = await prisma.invoice.findFirstOrThrow({
      where: { salesOrder: { customer: { code: "CUST-001" } } },
    });
    approx(await getOutstanding(inv.id), 3875);
  });
  it("Distributor B order is NOT approved (shortage blocks approval)", async () => {
    const so = await prisma.salesOrder.findFirstOrThrow({
      where: { customer: { code: "CUST-002" } },
    });
    expect(so.status).toBe("SUBMITTED");
  });
  it("Distributor B shortage = 32 packets (120 ordered - 88 available)", async () => {
    const fg = await byCode("FG-001");
    approx(120 - Number(fg.currentStock), 32);
  });
});

describe("NIT benchmark — integrity guarantees", () => {
  it("reconciliation: cached balances match the ledger (no mismatches)", async () => {
    const mismatches = await reconcileAll();
    expect(mismatches).toEqual([]);
  });
  it("duplicate production posting is prevented", async () => {
    const run = await prisma.productionRun.findFirstOrThrow({
      include: { consumption: true },
    });
    await expect(
      postProductionRun(run.id, {
        consumption: run.consumption.map((line) => ({
          itemId: line.itemId,
          actualQuantity: Number(line.actualQuantity),
        })),
        actualGoodOutput: Number(run.actualGoodOutput),
        damagedPackaging: 0,
        damagedItemId: null,
        scrapWastage: 0,
        labourCost: 0,
        gasPowerCost: 0,
        otherOverheads: 0,
      }),
    ).rejects.toThrow(/already posted/);
  });
});
