# FactoryFlow

FactoryFlow is a web-based order-to-audit management system for a manufacturing business. It brings inventory, purchasing, production, sales, dispatch, payments, and reporting into one role-based application.

## Features

- Role-aware dashboards for administrators, owners, production staff, salespeople, and accountants
- User and access management
- Inventory and stock movement tracking
- Supplier purchasing and bill-of-materials management
- Production runs, material consumption, and cost tracking
- Sales orders, invoices, dispatches, and payments
- Reports and audit history
- Local demo data and a benchmark business workflow

## Tech stack

- **Application:** Next.js 16 App Router, React 19, TypeScript
- **Styling and UI:** Tailwind CSS 4, Radix UI, Lucide, Recharts
- **Database:** SQLite for local development; Prisma ORM
- **Validation and forms:** Zod, React Hook Form
- **Tests:** Vitest

## Requirements

- Node.js 20.9 or later
- npm

## Getting started

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/karanstark/Factory-Flow.git
   cd Factory-Flow
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:

   ```dotenv
   DATABASE_URL="file:./dev.db"
   SESSION_SECRET="replace-this-with-a-random-secret-at-least-16-characters-long"
   ```

   Generate a random secret with Node.js:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Replace the `SESSION_SECRET` example with the generated value. Keep `.env` private and do not commit it.

4. Initialize the local database and load demo data:

   ```bash
   npm run seed
   ```

   **Warning:** `npm run seed` resets the database before loading demo data. Do not run it against a database containing data you need to keep.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

After running the seed command, the demo password for all seeded accounts is `demo1234`.

| Role | Email |
| --- | --- |
| Admin | `admin@factoryflow.demo` |
| Owner | `owner@factoryflow.demo` |
| Salesperson | `salesman.a@factoryflow.demo` |
| Salesperson | `salesman.b@factoryflow.demo` |
| Production | `production@factoryflow.demo` |
| Accountant | `accountant@factoryflow.demo` |

These are local demo credentials. Change them and configure a secure session secret before deploying or exposing the application.

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server (after building) |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run bench` | Run the benchmark tests |
| `npm run db:reset` | Reset/create the database schema; this can delete existing data |
| `npm run db:seed` | Load demo data into the database |
| `npm run studio` | Open Prisma Studio |

`npm run db:reset` uses Prisma's force-reset option and can delete existing database data. The `npm run seed` command also resets the database, then loads demo data and runs the benchmark scenario.

## Project structure

```text
prisma/       Prisma schema, local SQLite database, and seed script
src/app/      Next.js routes and role-specific dashboards
src/lib/      Authentication, sessions, permissions, and shared utilities
src/server/   Business logic for inventory, production, orders, and finance
tests/        Unit and benchmark tests
```

## Database notes

Local development uses SQLite, configured by `DATABASE_URL` in `.env`. The Prisma schema is in `prisma/schema.prisma`. The schema documents the intended PostgreSQL/Supabase production configuration; switching databases requires updating the Prisma datasource and applying the appropriate schema/migration workflow.

## License

No license is currently specified in this repository.
