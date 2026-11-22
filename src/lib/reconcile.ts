// Reconciliation between ledger-derived balances and the cached
// currentStock/avgRate on InventoryItem. The ledger (StockMovement) is the
// source of truth; the cached fields are kept in sync inside each posting
// transaction. This module lets us verify they still agree.
import Decimal from "decimal.js";
import { prisma } from "./prisma";
import { MOVEMENT_TYPES } from "./constants";

export interface Reconciliation {
  itemId: string;
  itemName: string;
  cachedStock: Decimal;
  ledgerStock: Decimal;
  stockMatches: boolean;
  cachedRate: Decimal;
  ledgerRate: Decimal;
  rateMatches: boolean;
}

/** Sum of (quantityIn - quantityOut) across all movements for an item. */
export async function deriveStock(itemId: string): Promise<Decimal> {
  const movements = await prisma.stockMovement.findMany({
    where: { itemId },
    orderBy: { createdAt: "asc" },
    select: { quantityIn: true, quantityOut: true },
  });
  let stock = new Decimal(0);
  for (const m of movements) {
    stock = stock.plus(m.quantityIn).minus(m.quantityOut);
  }
  return stock;
}

/**
 * Derive the weighted-average rate by replaying receipt movements only
 * (OPENING + PURCHASE_RECEIPT). Issues/dispatches/damage do not change the
 * weighted-average rate. Customer returns are ignored for rate derivation
 * (they return at the prevailing average, not a new purchase rate).
 */
export async function deriveAvgRate(itemId: string): Promise<Decimal> {
  const receipts = await prisma.stockMovement.findMany({
    where: {
      itemId,
      movementType: {
        in: [MOVEMENT_TYPES.OPENING, MOVEMENT_TYPES.PURCHASE_RECEIPT],
      },
    },
    orderBy: { createdAt: "asc" },
    select: { quantityIn: true, rate: true },
  });
  let stock = new Decimal(0);
  let value = new Decimal(0);
  for (const r of receipts) {
    const qty = new Decimal(r.quantityIn);
    const rate = r.rate ? new Decimal(r.rate) : new Decimal(0);
    value = value.plus(qty.times(rate));
    stock = stock.plus(qty);
  }
  if (stock.isZero()) return new Decimal(0);
  return value.div(stock);
}

/** Reconcile a single item's cached balance against the ledger. */
export async function reconcileItem(itemId: string): Promise<Reconciliation> {
  const item = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: itemId },
  });
  const ledgerStock = await deriveStock(itemId);
  const ledgerRate = await deriveAvgRate(itemId);
  const cachedStock = new Decimal(item.currentStock);
  const cachedRate = new Decimal(item.avgRate);
  const EPS = 0.01;
  return {
    itemId,
    itemName: item.name,
    cachedStock,
    ledgerStock,
    stockMatches: ledgerStock.minus(cachedStock).abs().lt(EPS),
    cachedRate,
    ledgerRate,
    rateMatches: ledgerRate.minus(cachedRate).abs().lt(EPS),
  };
}

/** Reconcile every inventory item; returns mismatches (empty = all good). */
export async function reconcileAll(): Promise<Reconciliation[]> {
  const items = await prisma.inventoryItem.findMany({ select: { id: true } });
  const results: Reconciliation[] = [];
  for (const it of items) {
    const r = await reconcileItem(it.id);
    if (!r.stockMatches || !r.rateMatches) results.push(r);
  }
  return results;
}
