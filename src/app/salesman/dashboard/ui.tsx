import {
  ClipboardList,
  CreditCard,
  Search,
  TrendingUp,
  Users,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { inr } from "@/lib/currency";
import { ORDER_STATUS } from "@/lib/constants";
import { getSalesmanDashboardData } from "./actions";
import { logoutAction } from "@/app/login/actions";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === ORDER_STATUS.DISPATCHED
      ? "bg-emerald-400/10 text-emerald-300"
      : status === ORDER_STATUS.REJECTED || status === ORDER_STATUS.CANCELLED
        ? "bg-rose-400/10 text-rose-300"
        : status === ORDER_STATUS.SUBMITTED || status === ORDER_STATUS.UNDER_REVIEW
          ? "bg-sky-400/10 text-sky-300"
          : "bg-slate-400/10 text-slate-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${tone}`}>
      {status === ORDER_STATUS.DISPATCHED ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
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

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof TrendingUp; tone: string }) {
  const toneClasses = {
    blue: "bg-sky-400/10 text-sky-300",
    emerald: "bg-emerald-400/10 text-emerald-300",
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

export default async function SalesmanDashboardUI() {
  const data = await getSalesmanDashboardData();
  const { user, stats, orders, customers, invoices } = data;

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b1220] px-5 py-6 lg:flex">
        <a href="/salesman/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-white">FactoryFlow</span>
            <span className="block text-[11px] text-slate-500">Sales workspace</span>
          </span>
        </a>

        <div className="mt-11 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</div>
        <nav className="mt-3 space-y-1">
          <a href="#overview" className="flex items-center gap-3 rounded-xl bg-emerald-400/[0.09] px-3 py-2.5 text-sm font-medium text-emerald-300">
            <TrendingUp size={17} /> Overview
          </a>
          <a href="#orders" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <ClipboardList size={17} /> Orders
          </a>
          <a href="#customers" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Users size={17} /> Customers
          </a>
          <a href="#receivables" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <CreditCard size={17} /> Receivables
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500">Salesman</p>
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
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span className="font-bold text-white">FactoryFlow</span>
            </div>
            <div className="hidden text-sm text-slate-500 lg:block">Sales / <span className="text-slate-300">Sales Overview</span></div>
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
              <p className="text-sm text-slate-500">Your sales performance at a glance</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">Sales Overview</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live data
            </div>
          </section>

          <section aria-label="Sales summary" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Open orders" value={numberFormatter.format(stats.openOrders)} detail={`${stats.activeCustomers} assigned customers`} icon={ClipboardList} tone="blue" />
            <StatCard label="Pending review" value={numberFormatter.format(stats.pendingReview)} detail="Awaiting admin approval" icon={AlertCircle} tone="amber" />
            <StatCard label="Active customers" value={numberFormatter.format(stats.activeCustomers)} detail="Assigned to you" icon={Users} tone="violet" />
            <StatCard label="Outstanding" value={stats.outstanding} detail="Unpaid invoices" icon={CreditCard} tone="amber" />
          </section>

          <section id="orders" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-white">Recent Orders</h2>
                  <p className="mt-1 text-xs text-slate-500">Latest orders and current status</p>
                </div>
                {stats.pendingReview > 0 && (
                  <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-300">
                    {stats.pendingReview} awaiting review
                  </span>
                )}
              </div>
              {orders.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        <th className="pb-3 font-medium">Order</th>
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-white/[0.05] last:border-0">
                          <td className="py-3.5">
                            <p className="font-medium text-slate-200">{order.orderNumber}</p>
                            <p className="mt-0.5 text-[11px] text-slate-600">{order.items.length} items</p>
                          </td>
                          <td className="py-3.5 text-slate-400">{order.customer.name}</td>
                          <td className="py-3.5 text-slate-500">{dateFormatter.format(order.orderDate)}</td>
                          <td className="py-3.5 text-right"><StatusBadge status={order.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Search} message="No orders yet" />
              )}
            </div>
          </section>

          <section id="customers" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-white">My Customers</h2>
                  <p className="mt-1 text-xs text-slate-500">Assigned customers and credit limits</p>
                </div>
              </div>
              {customers.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Code</th>
                        <th className="pb-3 font-medium">Credit Limit</th>
                        <th className="pb-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={c.id} className="border-b border-white/[0.05] last:border-0">
                          <td className="py-3.5 font-medium text-slate-200">{c.name}</td>
                          <td className="py-3.5 text-slate-400">{c.code}</td>
                          <td className="py-3.5 text-slate-500">{c.creditLimit ? inr(Number(c.creditLimit)) : "—"}</td>
                          <td className="py-3.5 text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Users} message="No customers assigned" />
              )}
            </div>
          </section>

          <section id="receivables" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Outstanding Receivables</h2>
                  <p className="mt-1 text-xs text-slate-500">Unpaid invoices for your customers</p>
                </div>
              </div>
              {invoices.length ? (
                <div className="space-y-4">
                  {invoices.map((invoice) => {
                    const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const balance = Math.max(0, Number(invoice.totalAmount) - paid);
                    const paidRatio = Number(invoice.totalAmount) > 0 ? Math.min(100, (paid / Number(invoice.totalAmount)) * 100) : 0;
                    return (
                      <div key={invoice.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-200">{invoice.customer.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{invoice.invoiceNumber}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`text-sm font-medium ${balance ? "text-amber-300" : "text-emerald-300"}`}>{inr(balance)}</p>
                            <p className="text-[10px] text-slate-600">{balance ? `${inr(paid)} paid` : "Settled"}</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${paidRatio}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={CreditCard} message="No outstanding invoices" />
              )}
            </div>
          </section>

          <footer className="flex flex-col gap-2 py-8 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>FactoryFlow · Sales workspace</span>
            <span className="flex items-center gap-1.5"><ArrowUpRight size={12} /> Live data</span>
          </footer>
        </div>
      </main>
    </div>
  );
}