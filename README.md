# FactoryFlow

FactoryFlow is a web prototype for a small packaged-snack manufacturer. It models the workflow from a field salesperson's retailer order through admin approval, inventory-aware production, GST invoicing, dispatch, payment collection, and finance reporting.

## Why this stack

FactoryFlow uses Next.js, React, and TypeScript to provide one responsive web application for salespeople in the field and the factory's office roles, without maintaining separate mobile and desktop clients. Prisma with SQLite keeps the complete relational data model easy to run locally, while Decimal arithmetic, server-side business services, and Vitest tests support auditable stock and financial calculations.

## Implemented workflows

| Tier | Workflow | What the app supports |
| --- | --- | --- |
| Must | Access and roles | Login, session handling, role-based dashboards (salesman / admin / production / accountant / owner), admin user management |
| Must | Masters | Customers, suppliers, raw materials, packaging, finished-good products and versioned BOMs — all creatable from Admin → Masters |
| Must | Sales | Mobile-first order entry on the salesman dashboard; admin approval queue with live stock check; approve/reject |
| Must | Billing | GST invoice (CGST+SGST intra-state, IGST inter-state) generated from approved orders, downloadable as PDF, cancellable only via credit note |
| Must | Fulfilment | Dispatch against an invoice deducts finished-goods stock atomically; partial dispatch tracked per order line |
| Must | Production | BOM-scaled draft runs; posting issues materials, records damaged packaging, receives good output, computes planned-vs-actual consumption and yield variance with GREEN/AMBER/RED flags, and snapshots an immutable cost per packet |
| Must | Inventory | Stock ledger (every movement traceable to its source doc + user) with cached balances reconciled by `reconcileAll()`; stock summary and per-item ledger pages; reorder-level low-stock flags |
| Must | Reports | Sales register, stock report, stock ledger and GST summary — all exportable to CSV (Excel-compatible) |
| Should | Purchasing | Supplier purchase entry; weighted-average valuation updates automatically |
| Should | Receivables | Partial payments, outstanding balances, customer-wise balances and ageing buckets |
| Should | Costing | Cost per packet including labour, gas/power and other overheads |
| Should | Audit | Audit trail page; invoice edits are impossible — cancellation goes through a numbered credit note |
| Stretch | Low-stock alerts | Reorder levels on every item; flagged on dashboards and the stock summary |

This is a working prototype, not a complete accounting or statutory-compliance product.

## Benchmark results

Run the seeded scenario and automated checks with `npm run seed` or `npm run bench`. The benchmark integration test checks the figures below against the actual services and database.

| Check | Result |
| --- | ---: |
| Flour closing balance | 120 kg |
| Oil closing balance | 19.5 L |
| Pouches closing balance | 306 pieces |
| Finished goods after production | 238 packets |
| Finished goods after Retailer A dispatch | 88 packets |
| Yield variance | 188 actual vs 200 expected: −6%, flagged AMBER |
| Oil consumption variance | +5%, flagged AMBER |
| Retailer A invoice | ₹7,500 taxable + ₹187.50 CGST + ₹187.50 SGST = ₹7,875 |
| Retailer A outstanding | ₹3,875 after ₹4,000 payment |
| Distributor B order | 32-packet shortage; approval remains blocked |
| Cost per good packet | ₹31.14 |

### Costing and variance assumptions

Flour is valued at the weighted-average receipt rate after purchasing 60 kg at ₹45/kg: `(100 × ₹42 + 60 × ₹45) ÷ 160 = ₹43.125/kg`. The production material and packaging cost is ₹4,055: flour ₹1,725, oil ₹1,470, spice ₹240, 194 pouches (188 used and 6 damaged) ₹485, and 9 cartons ₹135. Adding ₹1,200 labour and ₹600 gas/power gives ₹5,855; dividing by 188 good packets gives ₹31.1436, displayed as **₹31.14 per packet**. Other overheads are zero in this scenario. The cost of damaged packaging is included in the run cost and allocated across good output.

The BOM tolerance is 3%. The variance rule treats an absolute variance up to 3% as GREEN, above 3% through 6% as AMBER, and above 6% as RED. Thus yield at exactly −6% and oil at +5% are flagged AMBER. Distributor B's inter-state order is not invoiced because stock approval fails; the GST service calculates IGST for inter-state invoices, but no IGST invoice exists for this blocked order.

## Technology

- **Application:** Next.js 16 App Router, React 19, TypeScript
- **UI:** Tailwind CSS 4, Radix UI, Lucide, Recharts
- **Database/ORM:** SQLite locally, Prisma
- **Input validation/forms:** Zod, React Hook Form
- **Arithmetic:** `decimal.js` and Prisma Decimal values for money, inventory valuation, and derived financial totals
- **Tests:** Vitest unit and database integration tests

## Requirements

- Node.js 20.9 or later
- npm

## Run locally

```bash
git clone https://github.com/karanstark/Factory-Flow.git
cd Factory-Flow
npm install
```

Create a `.env` file in the project root:

```dotenv
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-a-random-secret-at-least-16-characters-long"
```

Generate a suitable session secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Load the benchmark data and start the app:

```bash
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Data warning:** `npm run seed` force-resets the local database, clears its data, loads demo master data, and runs the benchmark scenario. `npm run db:reset` also uses Prisma's force-reset option; `npm run db:seed` clears existing rows when it loads the seed. Do not run these commands against data you need to keep.

### Demo accounts

All seeded users use the demo password `demo1234`.

| Role | Email |
| --- | --- |
| Admin | `admin@factoryflow.demo` |
| Owner | `owner@factoryflow.demo` |
| Salesperson | `salesman.a@factoryflow.demo` |
| Salesperson | `salesman.b@factoryflow.demo` |
| Production | `production@factoryflow.demo` |
| Accountant | `accountant@factoryflow.demo` |

These are fictional local-demo credentials. Do not use them in a public deployment. Configure a unique, secure `SESSION_SECRET` and replace demo accounts before exposing the application.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server after building |
| `npm test` | Run all unit and integration tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run bench` | Run the NIT benchmark integration test |
| `npm run seed` | Reset the local database, load demo data, and run the benchmark scenario |
| `npm run db:reset` | Force-reset/create the local schema (destructive) |
| `npm run db:seed` | Clear and reload demo data |
| `npm run studio` | Open Prisma Studio |

## Data model and integrity

The main entities are `User`, `Customer`, `Supplier`, `InventoryItem`, `Product`, versioned `BOM`/`BOMItem`, `Purchase`/`PurchaseItem`, `ProductionRun`/`ProductionConsumption`/`ProductionCostLine`, `StockMovement`, `SalesOrder`/`SalesOrderItem`, `Invoice`/`InvoiceItem`, `Dispatch`/`DispatchItem`, `Payment`, and `AuditLog`. The stock ledger is the source of truth; `InventoryItem.currentStock` and `avgRate` are transactionally maintained caches that can be reconciled against ledger movements.

See [docs/design-note.md](./docs/design-note.md) for the data model, stock/BOM calculations, valuation, and costing details.

## Docker (one-command run)

```bash
docker compose up --build
```

The container pushes the Prisma schema, seeds the benchmark data on first boot, and serves the app on http://localhost:3000. Set `SEED=0` to skip reseeding; the SQLite file lives in the `factoryflow-data` volume.

## Known gaps

- **Offline order capture, batch/expiry FEFO, visit log with GPS, Tally export, e-Invoice/e-Way Bill, Tamil UI:** not implemented (stretch goals — only low-stock alerts were picked up).
- **Credit notes** cancel the invoice and record the reversal, but do not auto-return dispatched stock; record a customer-return/adjustment movement if goods physically come back.
- **Edit audit coverage:** creates/posts/approvals/cancellations are logged with user and time; there is no before/after diff UI for draft edits.
- **Demo video:** record a walkthrough of the seeded scenario (salesman order → approval → invoice PDF → dispatch → payment) for submission.
- The seeded benchmark scenario runs automatically on `npm run seed`; the same flow can be replayed through the UI.

The code uses dummy/demo data only. It has not been reviewed as production accounting, security, or GST-compliance software.

## License

No license is currently specified in this repository.
