// Stock ledger service — the architectural backbone of inventory.
//
// Every inventory change is a StockMovement. The cached InventoryItem
// .currentStock / .avgRate are updated inside the SAME transaction as the
// movement so they can never drift from the ledger (see reconcile.ts for the
// verification mechanism). Negative stock is rejected.
//
// All helpers accept a Prisma transaction client so callers can wrap many
// movements in one atomic $transaction (e.g. a production run issues several
// materials and receives finished goods together).
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { D, round2 } from "@/lib/currency";
import { MOVEMENT_TYPES, type MovementType } from "@/lib/constants";
import { weightedAverageRate } from "@/lib/inventory-math";

// Accepts both the singleton prisma client and a $transaction tx.
type Tx = Prisma.TransactionClient;

export interface PostMovementInput {
  itemId: string;
  movementType: MovementType;
  quantityIn?: Decimal.Value;
  quantityOut?: Decimal.Value;
  unit: string;
  sourceDocType?: string;
  sourceDocId?: string;
  rate?: Decimal.Value; // valuation rate applicable to this movement
  userId?: string;
  remarks?: string;
  itemCategory?: string; // optional, derived from item if absent
}

// Receipts that change the weighted-average valuation rate.
const RATE_CHANGING_IN = new Set<string>([
  MOVEMENT_TYPES.OPENING,
  MOVEMENT_TYPES.PURCHASE_RECEIPT,
]);

const EPS = new Decimal("0.000001");

/**
 * Post one stock movement and update the cached balance + avg rate in the
 * same transaction. Throws if stock would go negative.
 */
export async function postStockMovement(tx: Tx, input: PostMovementInput) {
  const inQty = D(input.quantityIn ?? 0);
  const outQty = D(input.quantityOut ?? 0);
  if (inQty.lte(0) && outQty.lte(0)) {
    throw new Error("A stock movement must have a positive in or out quantity.");
  }

  const item = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: input.itemId },
  });
  const currentStock = new Decimal(item.currentStock);
  const currentRate = new Decimal(item.avgRate);
  const newStock = currentStock.plus(inQty).minus(outQty);

  if (newStock.lt(0) && newStock.abs().gt(EPS)) {
    throw new Error(
      `Insufficient stock for "${item.name}": balance ${currentStock.toFixed(3)} ${item.unit}, ` +
        `attempted to issue ${outQty.toFixed(3)} ${item.unit}.`,
    );
  }

  // Weighted-average rate only changes on rate-changing receipts.
  let newRate = currentRate;
  if (inQty.gt(0) && RATE_CHANGING_IN.has(input.movementType)) {
    newRate = weightedAverageRate(currentStock, currentRate, inQty, input.rate ?? 0);
  }
  // Preserve valuation precision beyond currency cents. This allows exact
  // weighted averages such as ₹43.125/kg instead of prematurely storing ₹43.13.
  newRate = D(newRate).toDecimalPlaces(6);

  // The rate recorded on the movement (for costing reconstruction).
  let movementRate: Decimal | null = null;
  if (input.movementType === MOVEMENT_TYPES.PURCHASE_RECEIPT) {
    movementRate = round2(input.rate ?? 0);
  } else if (input.movementType === MOVEMENT_TYPES.OPENING) {
    movementRate = round2(input.rate ?? 0);
  } else if (outQty.gt(0)) {
    // Issues/dispatches/damage carry the current avg rate (the cost of issue).
    movementRate = D(currentRate).toDecimalPlaces(6);
  } else if (inQty.gt(0)) {
    // Non-rate-changing receipts (e.g. customer return) carry the avg rate.
    movementRate = D(currentRate).toDecimalPlaces(6);
  }

  const count = await tx.stockMovement.count();
  // Sequential-ish unique number (single-user demo). For production use a
  // dedicated sequence/counter table.
  const movementNumber = `MOV-${String(count + 1).padStart(6, "0")}`;

  const movement = await tx.stockMovement.create({
    data: {
      movementNumber,
      itemId: item.id,
      itemCategory: input.itemCategory ?? item.category,
      quantityIn: inQty,
      quantityOut: outQty,
      unit: input.unit,
      movementType: input.movementType,
      sourceDocType: input.sourceDocType ?? null,
      sourceDocId: input.sourceDocId ?? null,
      balanceAfter: round2(newStock),
      rate: movementRate,
      userId: input.userId ?? null,
      remarks: input.remarks ?? null,
    },
  });

  await tx.inventoryItem.update({
    where: { id: item.id },
    data: { currentStock: round2(newStock), avgRate: newRate },
  });

  return { movement, newStock: round2(newStock), newRate };
}

/** Convenience: record opening stock as the first OPENING movement. */
export async function postOpeningStock(
  tx: Tx,
  itemId: string,
  qty: Decimal.Value,
  rate: Decimal.Value,
  unit: string,
) {
  return postStockMovement(tx, {
    itemId,
    movementType: MOVEMENT_TYPES.OPENING,
    quantityIn: qty,
    unit,
    rate,
    sourceDocType: "OPENING",
    sourceDocId: itemId,
    remarks: "Opening stock",
  });
}
