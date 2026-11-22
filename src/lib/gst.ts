// Pure GST calculation (no DB) so it can be unit-tested directly.
//   intra-state (same state as seller): CGST + SGST, each = gstRate/2
//   inter-state  (different state):      IGST = gstRate
import Decimal from "decimal.js";
import { D, round2, pct } from "./currency";

export interface GstBreakdown {
  taxableValue: Decimal;
  gstRate: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  taxTotal: Decimal;
  total: Decimal;
}

export function computeGst(
  taxableValue: Decimal.Value,
  gstRatePercent: Decimal.Value,
  isInterState: boolean,
): GstBreakdown {
  const taxable = D(taxableValue);
  const rate = D(gstRatePercent);
  if (isInterState) {
    const igst = pct(taxable, rate);
    return {
      taxableValue: round2(taxable),
      gstRate: round2(rate),
      cgst: new Decimal(0),
      sgst: new Decimal(0),
      igst: round2(igst),
      taxTotal: round2(igst),
      total: round2(taxable.plus(igst)),
    };
  }
  const half = rate.div(2);
  const cgst = pct(taxable, half);
  const sgst = pct(taxable, half);
  return {
    taxableValue: round2(taxable),
    gstRate: round2(rate),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: new Decimal(0),
    taxTotal: round2(cgst.plus(sgst)),
    total: round2(taxable.plus(cgst).plus(sgst)),
  };
}

/** Indian financial year label "2026-27" for a date (Apr 1 -> Mar 31). */
export function financialYear(date: Date): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1; // April is month index 3
  return `${start}-${String(start + 1).slice(-2)}`;
}
