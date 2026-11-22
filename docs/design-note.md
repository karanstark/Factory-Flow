# FactoryFlow design note

FactoryFlow is a responsive web prototype for a small packaged-snack factory. It uses Next.js/React/TypeScript for role-specific screens and server-side workflows, Prisma for relational persistence, and SQLite for an easy local demo. The relational model and data access are isolated behind Prisma; SQLite is the tested local target, while PostgreSQL is a documented migration direction rather than a verified deployment.

## Data model

```text
User ──< SalesOrder >── Customer
  │           │
  │           └──< Invoice ──< InvoiceItem
  │                    │
  │                    ├──< Dispatch ──< DispatchItem
  │                    └──< Payment
  │
  ├──< ProductionRun >── Product ── InventoryItem
  │           │                    └──< BOMItem >── InventoryItem
  │           ├──< ProductionConsumption >── InventoryItem
  │           └──< ProductionCostLine >────── InventoryItem (optional)
  │
  ├──< StockMovement >── InventoryItem
  └──< AuditLog

Supplier ──< Purchase ──< PurchaseItem >── InventoryItem
```

`InventoryItem` is the unified stock-keeping record for raw materials, packaging, and finished goods. Products link sellable SKUs to finished-goods inventory. A production run stores the BOM/version used, planned and actual consumption, yield, posting state, and immutable cost lines. Orders, invoices, dispatches, payments, stock movements, and audit events retain links to their business records.

## Stock ledger and BOM consumption

`StockMovement` is the inventory source of truth. Every opening, purchase receipt, production issue/receipt, packaging-damage event, dispatch, or reversal records the item, in/out quantity, movement type, source document, user, timestamp, and resulting balance. Business services post the movement and update cached `currentStock`/`avgRate` inside the same Prisma transaction. Negative stock is rejected. `reconcileAll()` sums ledger quantities and replays eligible receipts to compare the derived balance and rate with the caches.

For a batch, planned BOM use is scaled by `batchSize / BOM.expectedYield`. Posting records actual input quantities and per-line consumption variance, records damaged packaging separately from usable packaging, and receives only actual good output as finished stock. Yield variance is `(actual good output − expected output) / expected output × 100`. The benchmark's 188 good packets against 200 expected is −6%; oil use of 10.5 L against 10 L planned is +5%. At a 3% BOM tolerance, both are AMBER under the current inclusive threshold rules.

## Valuation and manufacturing cost

The implemented inventory valuation method is **weighted average**, not FIFO. Opening stock and purchase receipts update the average:

```text
new average = (old quantity × old average + receipt quantity × receipt rate)
              / (old quantity + receipt quantity)
```

Issues retain the average rate at issue time. A production run snapshots its materials, labour, gas/power, and other overheads in `ProductionCostLine`, so later receipts do not rewrite historical run cost. Each material line is actual quantity × the issue-time weighted-average rate, rounded to currency precision; total run cost is divided by actual good output. Damaged packaging remains part of run cost and is allocated to good packets. The benchmark total is ₹4,055 materials/packaging + ₹1,200 labour + ₹600 gas/power + ₹0 other overhead = ₹5,855; ₹5,855 / 188 = ₹31.1436, displayed as ₹31.14 per packet.

Prisma `Decimal` and `decimal.js` are used for persisted money, tax, inventory valuation, and financial aggregation. Currency display rounds to two decimal places. Quantity and percentage values use decimal arithmetic in domain calculations; conversion to a JavaScript number is limited to display-only UI needs such as chart widths.

## Benchmark scenario

The reproducible seeded scenario and assertions are in `prisma/seed.ts`, `src/server/benchmark.ts`, and `tests/benchmark.test.ts`. Expected outcomes: flour 120 kg, oil 19.5 L, pouches 306, finished goods 238 after production and 88 after Retailer A dispatch, Retailer A invoice ₹7,875 with split CGST/SGST, outstanding ₹3,875, and Distributor B blocked with a 32-packet shortage. The integration test also checks reconciliation and duplicate-post prevention.

## Boundaries

This note describes the implemented prototype, not a production accounting system. FIFO valuation, offline sync, batch/expiry tracking, and statutory e-invoicing remain unimplemented. Credit notes exist (`CreditNote` model): cancelling an invoice marks it CANCELLED, issues a sequential `CN-<fy>-<n>` document with reason and actor, and never deletes the invoice; dispatched stock is not auto-returned (record a return movement if goods come back).
