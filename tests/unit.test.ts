// Unit tests for the pure business-calculation helpers (no DB).
// These cover the calculations the evaluation explicitly asks to test.
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  weightedAverageRate,
  consumptionVariancePct,
  yieldVariancePct,
  flagForVariance,
  costPerUnit,
} from "@/lib/inventory-math";
import { computeGst, financialYear } from "@/lib/gst";
import { computeRunCost } from "@/server/costing";
import { convertQuantity } from "@/lib/units";
import { planConsumptionForBatch } from "@/server/bom";

const approx = (d: Decimal.Value, n: number, eps = 0.0001) =>
  expect(Number(d)).toBeCloseTo(n, Math.round(-Math.log10(eps)));

describe("weighted-average purchase costing", () => {
  it("computes flour avg rate after 60kg @ ₹45 added to 100kg @ ₹42", () => {
    // (100*42 + 60*45) / 160 = 43.125
    const r = weightedAverageRate(100, 42, 60, 45);
    approx(r, 43.125);
  });
  it("handles a first receipt from zero stock", () => {
    approx(weightedAverageRate(0, 0, 100, 42), 42);
  });
});

describe("BOM planned consumption scaling", () => {
  const bom = {
    expectedYield: 200,
    items: [
      { itemId: "f", item: { name: "Flour", category: "RAW_MATERIAL" }, standardQuantity: 40, unit: "kg" },
      { itemId: "o", item: { name: "Oil", category: "RAW_MATERIAL" }, standardQuantity: 10, unit: "L" },
      { itemId: "p", item: { name: "Pouch", category: "PACKAGING" }, standardQuantity: 200, unit: "pieces" },
    ],
  };
  it("scales 1:1 when batch == expectedYield", () => {
    const plan = planConsumptionForBatch(bom, 200);
    approx(plan.find((p) => p.itemId === "f")!.plannedQuantity, 40);
    approx(plan.find((p) => p.itemId === "p")!.plannedQuantity, 200);
  });
  it("scales down for a half batch", () => {
    const plan = planConsumptionForBatch(bom, 100);
    approx(plan.find((p) => p.itemId === "f")!.plannedQuantity, 20);
    approx(plan.find((p) => p.itemId === "o")!.plannedQuantity, 5);
  });
  it("flags packaging components", () => {
    const plan = planConsumptionForBatch(bom, 200);
    expect(plan.find((p) => p.itemId === "p")!.isPackaging).toBe(true);
    expect(plan.find((p) => p.itemId === "f")!.isPackaging).toBe(false);
  });
});

describe("variance calculations", () => {
  it("consumption variance % = (actual - planned)/planned * 100", () => {
    approx(consumptionVariancePct(10.5, 10), 5); // oil +5%
    approx(consumptionVariancePct(40, 40), 0); // flour 0%
    approx(consumptionVariancePct(194, 200), -3); // pouches -3%
    approx(consumptionVariancePct(9, 10), -10); // cartons -10%
  });
  it("yield variance % = (actual - expected)/expected * 100", () => {
    approx(yieldVariancePct(188, 200), -6);
  });
  it("zero planned/expected yields 0 variance (no divide-by-zero)", () => {
    expect(consumptionVariancePct(5, 0).toNumber()).toBe(0);
    expect(yieldVariancePct(5, 0).toNumber()).toBe(0);
  });
});

describe("variance flag thresholds (tol=3%)", () => {
  it("GREEN within tolerance", () => expect(flagForVariance(0, 3)).toBe("GREEN"));
  it("GREEN at the boundary (<=3)", () => expect(flagForVariance(-3, 3)).toBe("GREEN"));
  it("AMBER between 1x and 2x tolerance", () => {
    expect(flagForVariance(5, 3)).toBe("AMBER"); // oil +5%
    expect(flagForVariance(-6, 3)).toBe("AMBER"); // yield -6%
  });
  it("RED beyond 2x tolerance", () => expect(flagForVariance(-10, 3)).toBe("RED")); // cartons -10%
});

describe("GST calculations", () => {
  it("intra-state: CGST+SGST split (Retailer A, 5%)", () => {
    const g = computeGst(7500, 5, false);
    approx(g.cgst, 187.5);
    approx(g.sgst, 187.5);
    approx(g.igst, 0);
    approx(g.total, 7875);
  });
  it("inter-state: IGST (Distributor B, 5%)", () => {
    const g = computeGst(7500, 5, true);
    approx(g.igst, 375);
    approx(g.cgst, 0);
    approx(g.sgst, 0);
    approx(g.total, 7875);
  });
});

describe("cost per good packet", () => {
  it("total run cost / actual good packets", () => {
    approx(costPerUnit(5855, 188), 31.14);
  });
  it("full costing engine for the benchmark run", () => {
    const cost = computeRunCost(
      [
        { itemId: "f", itemName: "Flour", category: "RAW_MATERIAL", quantity: 40, rate: 43.125 },
        { itemId: "o", itemName: "Oil", category: "RAW_MATERIAL", quantity: 10.5, rate: 140 },
        { itemId: "s", itemName: "Spice", category: "RAW_MATERIAL", quantity: 1.2, rate: 200 },
        { itemId: "p", itemName: "Pouch", category: "PACKAGING", quantity: 194, rate: 2.5 },
        { itemId: "c", itemName: "Carton", category: "PACKAGING", quantity: 9, rate: 15 },
      ],
      { labourCost: 1200, gasPowerCost: 600, otherOverheads: 0, actualGoodOutput: 188 },
    );
    // 1725 + 1470 + 240 + 485 + 135 + 1200 + 600 = 5855
    approx(cost.totalMaterialCost, 4055); // 1725+1470+240+485+135
    approx(cost.totalCost, 5855);
    approx(cost.costPerPacket, 31.14);
  });
});

describe("unit conversions", () => {
  it("kg -> g", () => approx(convertQuantity(1, "kg", "g"), 1000));
  it("g -> kg", () => approx(convertQuantity(500, "g", "kg"), 0.5));
  it("L -> ml", () => approx(convertQuantity(1, "L", "ml"), 1000));
  it("rejects incompatible units", () => {
    expect(() => convertQuantity(1, "kg", "pieces")).toThrow(/Incompatible/);
  });
  it("cartons -> packets needs an explicit factor", () => {
    expect(() => convertQuantity(1, "cartons", "packets")).toThrow(/explicit factor/);
    approx(convertQuantity(1, "cartons", "packets", [{ from: "cartons", to: "packets", factor: 20 }]), 20);
  });
});

describe("financial year", () => {
  it("Nov 2026 -> 2026-27", () => expect(financialYear(new Date(2026, 10, 1))).toBe("2026-27"));
  it("Jan 2027 -> 2026-27", () => expect(financialYear(new Date(2027, 0, 15))).toBe("2026-27"));
});
