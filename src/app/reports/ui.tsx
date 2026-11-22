import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CreditCard,
  FileText,
  IndianRupee,
  PackageCheck,
  Search,
  TriangleAlert,
  TrendingUp,
  Users,
  Calculator,
} from "lucide-react";
import { inr } from "@/lib/currency";
import { INVOICE_STATUS } from "@/lib/constants";
import { getReportsDashboardData } from "./actions";
import { logoutAction } from "@/app/login/actions";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === INVOICE_STATUS.PAID
      ? "bg-emerald-400/10 text-emerald-300"
      : status === INVOICE_STATUS.PARTIALLY_PAID
        ? "bg-amber-400/10 text-amber-300"
        : status === INVOICE_STATUS.CANCELLED
          ? "bg-rose-400/10 text-rose-300"
          : "bg-sky-400/10 text-sky-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${tone}`}>
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Search; message: string }) {
  return (
    <div className="mt-6 flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-center">
      <Icon size={20} className="text-slate-600" />
      <p className="mt-2 text-xs text-slate-500">{message}</p>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Activity; tone: string }) {
  const toneClasses = {
    emerald: "bg-emerald-400/10 text-emerald-300",
    blue: "bg-sky-400/10 text-sky-300",
    violet: "bg-violet-400/10 text-violet-300",
    amber: "bg-amber-400/10 text-amber-300",
  };
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone as keyof typeof toneClasses]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 truncate text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

export default async function ReportsDashboardUI() {
  const data = await getReportsDashboardData();
  const { user, stats, invoices, payments, customerBalances, inventory } = data;

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrator",
    SALESMAN: "Salesman",
    PRODUCTION: "Production",
    ACCOUNTANT: "Accountant",
    OWNER: "Owner",
  };

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b1220] px-5 py-6 lg:flex">
        <a href="/reports" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <Calculator size={21} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-white">FactoryFlow</span>
            <span className="block text-[11px] text-slate-500">Finance workspace</span>
          </span>
        </a>

        <div className="mt-11 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</div>
        <nav className="mt-3 space-y-1">
          <a href="#overview" className="flex items-center gap-3 rounded-xl bg-emerald-400/[0.09] px-3 py-2.5 text-sm font-medium text-emerald-300">
            <TrendingUp size={17} /> Overview
          </a>
          <a href="#invoices" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <FileText size={17} /> Invoices
          </a>
          <a href="#payments" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <CreditCard size={17} /> Payments
          </a>
          <a href="#receivables" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Users size={17} /> Receivables
          </a>
          <a href="#inventory" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Boxes size={17} /> Inventory Value
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-4">
            <button className="w-full rounded-lg border border-white/[0.08] px-3 py-2 text-left text-xs text-slate-400 transition hover:border-white/15 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main id="overview" className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#080d18]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <Calculator className="text-emerald-300" size={20} />
              <span className="font-bold text-white">FactoryFlow</span>
            </div>
            <div className="hidden text-sm text-slate-500 lg:block">Finance / <span className="text-slate-300">Reports Overview</span></div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-emerald-300 lg:hidden">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
          <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-slate-500">Financial summary and receivables tracking</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">Finance & Reports</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live data
            </div>
          </section>

          <section aria-label="Finance summary" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Inventory value" value={stats.inventoryValue} detail="Current stock valuation" icon={Boxes} tone="emerald" />
            <StatCard label="Total invoiced" value={stats.totalInvoiced} detail={`${stats.postedCount} posted, ${stats.partiallyPaidCount} partial`} icon={FileText} tone="blue" />
            <StatCard label="Total collected" value={stats.totalPaid} detail={`₹${stats.thisMonthPayments} this month`} icon={CreditCard} tone="violet" />
            <StatCard label="Outstanding" value={stats.totalOutstanding} detail={`${customerBalances.length} customers with balance`} icon={IndianRupee} tone="amber" />
          </section>

          <section id="invoices" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Recent Invoices</h2>
                  <p className="mt-1 text-xs text-slate-500">All invoices with payment status</p>
                </div>
              </div>
              {invoices.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        <th className="pb-3 font-medium">Invoice</th>
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Total</th>
                        <th className="pb-3 font-medium">Paid</th>
                        <th className="pb-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => {
                        const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                        const balance = Math.max(0, Number(invoice.totalAmount) - paid);
                        return (
                          <tr key={invoice.id} className="border-b border-white/[0.05] last:border-0">
                            <td className="py-3.5 font-medium text-slate-200">{invoice.invoiceNumber}</td>
                            <td className="py-3.5 text-slate-400">{invoice.customer.name}</td>
                            <td className="py-3.5 text-slate-500">{dateFormatter.format(invoice.invoiceDate)}</td>
                            <td className="py-3.5 text-slate-300">{inr(Number(invoice.totalAmount))}</td>
                            <td className="py-3.5 text-slate-300">{inr(paid)}</td>
                            <td className="py-3.5 text-right"><StatusBadge status={invoice.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={FileText} message="No invoices yet" />
              )}
            </div>
          </section>

          <section id="payments" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Recent Payments</h2>
                  <p className="mt-1 text-xs text-slate-500">Payment collection activity</p>
                </div>
              </div>
              {payments.length ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                          <CreditCard size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-200">{payment.customer.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">Invoice: {payment.invoice.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-emerald-300">{inr(Number(payment.amount))}</p>
                        <p className="text-[10px] text-slate-500">{payment.paymentMethod} · {dateFormatter.format(payment.paymentDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CreditCard} message="No payments recorded" />
              )}
            </div>
          </section>

          <section id="receivables" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Outstanding Receivables</h2>
                  <p className="mt-1 text-xs text-slate-500">Customers with unpaid balances</p>
                </div>
              </div>
              {customerBalances.length ? (
                <div className="space-y-4">
                  {customerBalances.map(({ customer, invoiced, paid, balance }) => {
                    const paidRatio = invoiced > 0 ? Math.min(100, (paid / invoiced) * 100) : 0;
                    return (
                      <div key={customer.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-200">{customer.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{customer.code} · {customer.state}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-medium text-amber-300">{inr(balance)}</p>
                            <p className="text-[10px] text-slate-600">{inr(invoiced)} invoiced · {inr(paid)} paid</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${paidRatio}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Users} message="All customers paid up" />
              )}
            </div>
          </section>

          <section id="inventory" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Inventory Valuation</h2>
                  <p className="mt-1 text-xs text-slate-500">Current stock valuation by category</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                      <th className="pb-3 font-medium">Item</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium">Stock</th>
                      <th className="pb-3 text-right font-medium">Avg Rate</th>
                      <th className="pb-3 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const value = Number(item.currentStock) * Number(item.avgRate);
                      return (
                        <tr key={item.id} className="border-b border-white/[0.05] last:border-0">
                          <td className="py-3">
                            <p className="font-medium text-slate-200">{item.name}</p>
                          </td>
                          <td className="py-3 text-slate-400">{item.category.replaceAll("_", " ")}</td>
                          <td className="py-3 text-slate-300">{numberFormatter.format(Number(item.currentStock))} {item.unit}</td>
                          <td className="py-3 text-right text-slate-500">{inr(Number(item.avgRate))}</td>
                          <td className="py-3 text-right font-medium text-slate-200">{inr(value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <footer className="flex flex-col gap-2 py-8 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>FactoryFlow · Finance & reports</span>
            <span className="flex items-center gap-1.5"><ArrowUpRight size={12} /> Live data</span>
          </footer>
        </div>
      </main>
    </div>
  );
}