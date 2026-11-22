// Pure inventory/production math — no DB, no side effects — so the benchmark
// business calculations can be unit-tested directly (see tests/).
import Decimal from "decimal.js";
import { D, round2 } from "./currency";
import { VarianceFlag } from "./constants";

/**
 * Weighted-average valuation rate after receiving `inQty` at `inRate`.
 *   newAvg = (currentStock*currentAvg + inQty*inRate) / (currentStock + inQty)
 * Issues/dispatches do NOT change the weighted-average rate — only receipts do.
 */
export function weightedAverageRate(
  currentStock: Decimal.Value,
  currentRate: Decimal.Value,
  inQty: Decimal.Value,
  inRate: Decimal.Value,
): Decimal {
  const totalQty = D(currentStock).plus(inQty);
  if (totalQty.isZero() || totalQty.lte(0)) return new Decimal(0);
  const totalValue = D(currentStock)
    .times(currentRate)
    .plus(D(inQty).times(inRate));
  return totalValue.div(totalQty);
}

/** Consumption variance % = ((actual - planned) / planned) * 100 */
export function consumptionVariancePct(
  actual: Decimal.Value,
  planned: Decimal.Value,
): Decimal {
  if (D(planned).isZero()) return new Decimal(0);
  return round2(D(actual).minus(planned).div(planned).times(100));
}

/** Yield variance % = ((actualOutput - expectedOutput) / expectedOutput) * 100 */
export function yieldVariancePct(
  actualOutput: Decimal.Value,
  expectedOutput: Decimal.Value,
): Decimal {
  if (D(expectedOutput).isZero()) return new Decimal(0);
  return round2(D(actualOutput).minus(expectedOutput).div(expectedOutput).times(100));
}

/**
 * Map an absolute variance % to a severity flag given the tolerance (in %):
 *   |v| <= tolerance        => GREEN
 *   tolerance < |v| <= 2x    => AMBER
 *   |v| > 2x                => RED
 */
export function flagForVariance(
  variancePctValue: Decimal.Value,
  tolerance: Decimal.Value,
): VarianceFlag {
  const abs = D(variancePctValue).abs().toNumber();
  const tol = D(tolerance).toNumber();
  if (tol <= 0) {
    // No tolerance configured: any non-zero is a warning.
    return abs === 0 ? "GREEN" : "RED";
  }
  if (abs <= tol) return "GREEN";
  if (abs <= tol * 2) return "AMBER";
  return "RED";
}

/** Cost per good packet = totalRunCost / actualGoodOutput */
export function costPerUnit(
  totalRunCost: Decimal.Value,
  actualGoodOutput: Decimal.Value,
): Decimal {
  if (D(actualGoodOutput).isZero() || D(actualGoodOutput).lte(0)) {
    return new Decimal(0);
  }
  return round2(D(totalRunCost).div(actualGoodOutput));
}
