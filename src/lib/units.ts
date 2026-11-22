// Unit conversion utilities.
//
// Design choice (documented assumption): the benchmark uses consistent units
// per material (flour: kg, oil: L, spice: kg, pouches: pieces, cartons:
// pieces), so most real work needs no conversion. We support:
//   - mass: kg <-> g  (factor 1000)
//   - volume: L/l <-> ml  (factor 1000)
//   - count: pieces, packets, pouches, units, cartons are all "count" units.
//
// Cross-conversion between DIFFERENT count units (e.g. cartons <-> packets)
// requires an explicit factor (a carton's packet capacity is product
// specific), so we never silently assume one. Same-category conversion with a
// missing factor throws rather than guessing. This honours both "support
// cartons to packets" (via an explicit factor) and "do not allow incompatible
// unit conversions".
import Decimal from "decimal.js";

const MASS = new Set(["kg", "g"]);
const VOLUME = new Set(["L", "l", "ml"]);
const COUNT = new Set(["pieces", "piece", "packets", "packet", "pouches", "pouch", "units", "unit", "cartons", "carton"]);

export type CountFactor = { from: string; to: string; factor: number };

function categoryOf(unit: string): "mass" | "volume" | "count" | undefined {
  if (MASS.has(unit)) return "mass";
  if (VOLUME.has(unit)) return "volume";
  if (COUNT.has(unit)) return "count";
  return undefined;
}

/**
 * Convert a quantity from one unit to another.
 * @param countFactors optional explicit factors for cross-count conversions
 *        (e.g. [{from:'cartons', to:'packets', factor:20}]).
 */
export function convertQuantity(
  quantity: Decimal.Value,
  fromUnit: string,
  toUnit: string,
  countFactors: CountFactor[] = [],
): Decimal {
  if (fromUnit === toUnit) return new Decimal(quantity);
  const fromCat = categoryOf(fromUnit);
  const toCat = categoryOf(toUnit);
  if (!fromCat || !toCat) {
    throw new Error(`Unknown unit: ${!fromCat ? fromUnit : toUnit}`);
  }
  if (fromCat !== toCat) {
    throw new Error(
      `Incompatible units: cannot convert ${fromUnit} (${fromCat}) to ${toUnit} (${toCat})`,
    );
  }
  // Same category.
  if (fromCat === "mass") {
    // base = g
    const inG = fromUnit === "kg" ? new Decimal(quantity).times(1000) : new Decimal(quantity);
    return toUnit === "kg" ? inG.div(1000) : inG;
  }
  if (fromCat === "volume") {
    const inMl = fromUnit === "ml" ? new Decimal(quantity) : new Decimal(quantity).times(1000);
    return toUnit === "ml" ? inMl : inMl.div(1000);
  }
  // count: same unit already handled. Different count units -> need factor.
  const f = countFactors.find((c) => c.from === fromUnit && c.to === toUnit);
  if (!f) {
    throw new Error(
      `Count-unit conversion ${fromUnit} -> ${toUnit} requires an explicit factor (provide countFactors).`,
    );
  }
  return new Decimal(quantity).times(f.factor);
}

export function areCompatible(fromUnit: string, toUnit: string): boolean {
  const a = categoryOf(fromUnit);
  const b = categoryOf(toUnit);
  return !!a && a === b;
}
