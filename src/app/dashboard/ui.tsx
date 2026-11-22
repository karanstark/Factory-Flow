import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Factory,
  FileText,
  IndianRupee,
  PackageCheck,
  Search,
  TriangleAlert,
  Users,
  Shield,
  TrendingUp,
} from "lucide-react";
import { inr } from "@/lib/currency";
import { ORDER_STATUS, PRODUCTION_STATUS } from "@/lib/constants";
import { getOwnerDashboardData } from "./actions";
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

export default async function OwnerDashboardUI() {
  const data = await getOwnerDashboardData();
  const { user, stats, lowStock, orders, recentRuns, invoices, users } = data;

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrator",
    SALESMAN: "Salesman",
    PRODUCTION: "Production",
    ACCOUNTANT: "Accountant",
    OWNER: "Owner",
  };

  const maxRunOutput = Math.max(1, ...recentRuns.map((run) => Number(run.actualGoodOutput || run.expectedOutput)));

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b1220] px-5 py-6 lg:flex">
        <a href="/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <Shield size={21} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-white">FactoryFlow</span>
            <span className="block text-[11px] text-slate-500">Owner workspace</span>
          </span>
        </a>

        <div className="mt-11 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</div>
        <nav className="mt-3 space-y-1">
          <a href="#overview" className="flex items-center gap-3 rounded-xl bg-emerald-400/[0.09] px-3 py-2.5 text-sm font-medium text-emerald-300">
            <TrendingUp size={17} /> Overview
          </a>
          <a href="#inventory" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Boxes size={17} /> Inventory
          </a>
          <a href="#orders" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <ClipboardList size={17} /> Orders
          </a>
          <a href="#production" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Factory size={17} /> Production
          </a>
          <a href="#finance" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <FileText size={17} /> Finance
          </a>
          <a href="/admin/users" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Users size={17} /> Team
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500">Owner</p>
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
              <Shield className="text-emerald-300" size={20} />
              <span className="font-bold text-white">FactoryFlow</span>
            </div>
            <div className="hidden text-sm text-slate-500 lg:block">Owner / <span className="text-slate-300">Business Overview</span></div>
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
              <p className="text-sm text-slate-500">Executive view of the entire business</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">Business Overview</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live business data
            </div>
          </section>

          <section aria-label="Business summary" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Inventory value" value={stats.inventoryValue} detail={`${stats.inventoryCount} active stock items`} icon={Boxes} tone="emerald" />
            <StatCard label="Open orders" value={numberFormatter.format(stats.openOrders)} detail={`${stats.awaitingReview} awaiting review`} icon={ClipboardList} tone="blue" />
            <StatCard label="Produced this month" value={numberFormatter.format(stats.producedThisMonth)} detail="Good units from posted runs" icon={Factory} tone="violet" />
            <StatCard label="Receivables" value={stats.outstanding} detail={`${invoices.length} active invoices`} icon={IndianRupee} tone="amber" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <article id="production" className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">Production Activity</h2>
                  <p className="mt-1 text-xs text-slate-500">Latest production runs and good output</p>
                </div>
                <span className="rounded-lg border border-white/[0.07] px-2.5 py-1.5 text-[11px] text-slate-400">Recent runs</span>
              </div>
              {recentRuns.length ? (
                <div className="mt-6 space-y-5">
                  {recentRuns.map((run) => {
                    const output = Number(run.actualGoodOutput);
                    const expected = Number(run.expectedOutput);
                    const barWidth = Math.min(100, (Math.max(output, expected) / maxRunOutput) * 100);
                    const isPosted = run.status === PRODUCTION_STATUS.POSTED;
                    return (
                      <div key={run.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-200">{run.product.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{run.runNumber} · {dateFormatter.format(run.productionDate)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-medium text-white">{numberFormatter.format(output || expected)} <span className="text-xs font-normal text-slate-500">units</span></p>
                            <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wide ${isPosted ? "text-emerald-300" : "text-amber-300"}`}>
                              {run.status.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div className={`h-full rounded-full ${isPosted ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Factory} message="No production runs yet" />
              )}
            </article>

            <article id="inventory" className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">Stock Watch</h2>
                  <p className="mt-1 text-xs text-slate-500">Items at or below reorder level</p>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${stats.lowStockCount ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                  {stats.lowStockCount ? <TriangleAlert size={13} /> : <PackageCheck size={13} />}
                  {stats.lowStockCount ? `${stats.lowStockCount} need attention` : "All stocked"}
                </span>
              </div>
              {lowStock.length ? (
                <div className="mt-5 divide-y divide-white/[0.06]">
                  {lowStock.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{item.code} · {item.category.replaceAll("_", " ").toLowerCase()}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-amber-300">{numberFormatter.format(Number(item.currentStock))} <span className="text-xs font-normal text-slate-500">{item.unit}</span></p>
                        <p className="text-[10px] text-slate-600">Reorder at {numberFormatter.format(Number(item.reorderLevel))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={PackageCheck} message="No items below reorder level" />
              )}
            </article>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <article id="orders" className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-white">Recent Sales Orders</h2>
                  <p className="mt-1 text-xs text-slate-500">Latest orders across all salesmen</p>
                </div>
                {stats.awaitingReview > 0 && (
                  <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-300">
                    {stats.awaitingReview} awaiting review
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
                            <p className="mt-0.5 text-[11px] text-slate-600">{order.items.length} line items</p>
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
                <EmptyState icon={Search} message="No sales orders yet" />
              )}
            </article>

            <article id="finance" className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Receivables</h2>
                  <p className="mt-1 text-xs text-slate-500">Outstanding balances by customer</p>
                </div>
                <IndianRupee size={18} className="text-slate-500" />
              </div>
              {invoices.length ? (
                <div className="mt-5 space-y-4">
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
                <EmptyState icon={FileText} message="No invoices yet" />
              )}
            </article>
          </section>

          <section className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Team Members</h2>
                  <p className="mt-1 text-xs text-slate-500">All registered users</p>
                </div>
                <a href="/admin/users" className="text-sm text-emerald-400 hover:underline">Manage users</a>
              </div>
              {users.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/[0.05] last:border-0">
                          <td className="py-3.5 font-medium text-slate-200">{u.name}</td>
                          <td className="py-3.5 text-slate-400">{u.email}</td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium
                              {u.role === "ADMIN" || u.role === "OWNER" ? "bg-violet-400/10 text-violet-300" :
                               u.role === "PRODUCTION" ? "bg-orange-400/10 text-orange-300" :
                               u.role === "ACCOUNTANT" ? "bg-sky-400/10 text-sky-300" :
                               "bg-emerald-400/10 text-emerald-300"
                              }">
                              {roleLabels[u.role]}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${u.active ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                              {u.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-500 text-xs">{dateFormatter.format(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Users} message="No team members" />
              )}
            </div>
          </section>

          <footer className="flex flex-col gap-2 py-8 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>FactoryFlow · Order-to-audit operations</span>
            <span className="flex items-center gap-1.5"><ArrowUpRight size={12} /> Live data</span>
          </footer>
        </div>
      </main>
    </div>
  );
}