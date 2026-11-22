// Money helpers. All currency math goes through decimal.js (Prisma returns
// Decimal objects for Decimal fields) so we never use floating point.
import Decimal from "decimal.js";

// Plenty of precision for financial work; round to 2 dp only when storing or
// displaying money.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const D = (v: Decimal.Value): Decimal => new Decimal(v ?? 0);

/** Round a Decimal-ish value to 2 decimal places. */
export function round2(v: Decimal.Value): Decimal {
  return D(v).toDecimalPlaces(2);
}

/** Multiply and round to 2 dp. */
export function mul2(a: Decimal.Value, b: Decimal.Value): Decimal {
  return round2(D(a).times(b));
}

/** Add two money values and round to 2 dp. */
export function add2(a: Decimal.Value, b: Decimal.Value): Decimal {
  return round2(D(a).plus(b));
}

/** Subtract and round to 2 dp. */
export function sub2(a: Decimal.Value, b: Decimal.Value): Decimal {
  return round2(D(a).minus(b));
}

/** Percent of a value, rounded to 2 dp. e.g. pct(7500, 2.5) => 187.50 */
export function pct(base: Decimal.Value, ratePercent: Decimal.Value): Decimal {
  return round2(D(base).times(ratePercent).div(100));
}

/** Format a Decimal/number/string as Indian Rupees with 2 decimals. */
export function inr(v: Decimal.Value): string {
  const d = round2(v);
  // Use en-IN for the lakh/crore grouping; show exactly 2 decimals.
  return "₹" + d.toNumber().toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Plain numeric string with 2 decimals (used in exports/calculations). */
export function moneyStr(v: Decimal.Value): string {
  return round2(v).toFixed(2);
}

/**
 * Convert a Decimal amount to integer paise to avoid any float drift when
 * passing values around. 1 rupee = 100 paise.
 */
export function toPaise(v: Decimal.Value): number {
  return round2(v).times(100).toNumber();
}

/** Convert integer paise back to a Decimal rupee value. */
export function fromPaise(paise: number): Decimal {
  return round2(D(paise).div(100));
}
