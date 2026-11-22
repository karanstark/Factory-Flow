// Manufacturing costing engine.
//   totalCost      = material cost + packaging cost + labour + gas/power + other
//   material cost  = sum(actualQty * weighted-avg rate)  (rate captured at issue time)
//   costPerPacket  = totalCost / actualGoodOutput
//
// Damaged-packaging cost is INCLUDED in the run cost (the damaged units were
// still consumed/paid for) and therefore allocated across the good packets.
// This is a documented accounting assumption — it slightly raises cost per
// good packet, which is the conservative, auditor-friendly treatment.
//
// Kept DB-free so it is unit-testable directly.
import Decimal from "decimal.js";
import { D, round2 } from "@/lib/currency";
import { costPerUnit } from "@/lib/inventory-math";

export interface CostMaterialLine {
  itemId: string;
  itemName: string;
  category: string; // RAW_MATERIAL | PACKAGING
  quantity: Decimal.Value;
  rate: Decimal.Value; // weighted-avg valuation rate at time of issue
}

export interface CostResultLine {
  itemId: string;
  name: string;
  category: string;
  quantity: Decimal;
  rate: Decimal;
  amount: Decimal;
}

export interface CostResult {
  materialLines: CostResultLine[];
  totalMaterialCost: Decimal;
  labourCost: Decimal;
  gasPowerCost: Decimal;
  otherOverheads: Decimal;
  totalCost: Decimal;
  actualGoodOutput: Decimal;
  costPerPacket: Decimal;
}

export function computeRunCost(
  materials: CostMaterialLine[],
  overheads: {
    labourCost: Decimal.Value;
    gasPowerCost: Decimal.Value;
    otherOverheads: Decimal.Value;
    actualGoodOutput: Decimal.Value;
  },
): CostResult {
  let totalMaterial = new Decimal(0);
  const materialLines: CostResultLine[] = materials.map((m) => {
    const amount = round2(D(m.quantity).times(m.rate));
    totalMaterial = totalMaterial.plus(amount);
    return {
      itemId: m.itemId,
      name: m.itemName,
      category: m.category,
      quantity: D(m.quantity),
      rate: D(m.rate),
      amount,
    };
  });
  totalMaterial = round2(totalMaterial);

  const labourCost = round2(overheads.labourCost);
  const gasPowerCost = round2(overheads.gasPowerCost);
  const otherOverheads = round2(overheads.otherOverheads);
  const totalCost = round2(
    totalMaterial.plus(labourCost).plus(gasPowerCost).plus(otherOverheads),
  );
  const costPerPacket = costPerUnit(totalCost, overheads.actualGoodOutput);

  return {
    materialLines,
    totalMaterialCost: totalMaterial,
    labourCost,
    gasPowerCost,
    otherOverheads,
    totalCost,
    actualGoodOutput: D(overheads.actualGoodOutput),
    costPerPacket,
  };
}
