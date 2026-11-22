import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Factory,
  FileText,
  IndianRupee,
  PackageCheck,
  Search,
  TriangleAlert,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { inr } from "@/lib/currency";
import { PRODUCTION_STATUS } from "@/lib/constants";
import { getProductionDashboardData } from "./actions";
import { logoutAction } from "@/app/login/actions";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === PRODUCTION_STATUS.POSTED
      ? "bg-emerald-400/10 text-emerald-300"
      : status === PRODUCTION_STATUS.REVERSED
        ? "bg-rose-400/10 text-rose-300"
        : "bg-amber-400/10 text-amber-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${tone}`}>
      {status.toLowerCase()}
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

function StockTable({ title, items, emptyIcon }: { title: string; items: any[]; emptyIcon: typeof Search }) {
  if (!items.length) return <EmptyState icon={emptyIcon} message={`No ${title.toLowerCase()}`} />;
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
      <h3 className="font-semibold text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
              <th className="pb-3 font-medium">Item</th>
              <th className="pb-3 font-medium">Code</th>
              <th className="pb-3 font-medium">Stock</th>
              <th className="pb-3 font-medium">Reorder</th>
              <th className="pb-3 text-right font-medium">Avg Rate</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-white/[0.05] last:border-0">
                <td className="py-3">
                  <p className="font-medium text-slate-200">{item.name}</p>
                </td>
                <td className="py-3 text-slate-400">{item.code}</td>
                <td className="py-3 text-slate-300">{numberFormatter.format(Number(item.currentStock))} {item.unit}</td>
                <td className="py-3">{item.reorderLevel ? numberFormatter.format(Number(item.reorderLevel)) : "—"}</td>
                <td className="py-3 text-right text-slate-500">{inr(Number(item.avgRate))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default async function ProductionDashboardUI() {
  const data = await getProductionDashboardData();
  const { user, stats, recentRuns, lowStock, boms, rawMaterials, packaging, finishedGoods } = data;

  const maxRunOutput = Math.max(1, ...recentRuns.map((run) => Number(run.actualGoodOutput || run.expectedOutput)));

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b1220] px-5 py-6 lg:flex">
        <a href="/production/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <Factory size={21} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-white">FactoryFlow</span>
            <span className="block text-[11px] text-slate-500">Production workspace</span>
          </span>
        </a>

        <div className="mt-11 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</div>
        <nav className="mt-3 space-y-1">
          <a href="/production/runs/new" className="flex items-center gap-3 rounded-xl bg-emerald-400/[0.09] px-3 py-2.5 text-sm font-medium text-emerald-300">
            <Factory size={17} /> New run
          </a>
          <a href="#overview" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-300">
            <TrendingUp size={17} /> Overview
          </a>
          <a href="#runs" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Activity size={17} /> Production Runs
          </a>
          <a href="/inventory" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Boxes size={17} /> Stock ledger
          </a>
          <a href="#stock" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <Boxes size={17} /> Stock Levels
          </a>
          <a href="#boms" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <FileText size={17} /> BOMs
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500">Production</p>
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
              <Factory className="text-emerald-300" size={20} />
              <span className="font-bold text-white">FactoryFlow</span>
            </div>
            <div className="hidden text-sm text-slate-500 lg:block">Production / <span className="text-slate-300">Production Overview</span></div>
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
              <p className="text-sm text-slate-500">Production performance and inventory status</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">Production Overview</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live data
            </div>
          </section>

          <section aria-label="Production summary" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Posted runs" value={numberFormatter.format(stats.postedRuns)} detail={`${stats.draftRuns} draft runs`} icon={Factory} tone="emerald" />
            <StatCard label="Produced this month" value={numberFormatter.format(stats.producedThisMonth)} detail="Good units from posted runs" icon={TrendingUp} tone="violet" />
            <StatCard label="Avg cost/packet" value={stats.avgCostPerPacket} detail="Across posted runs" icon={IndianRupee} tone="amber" />
            <StatCard label="Low stock items" value={numberFormatter.format(stats.lowStockCount)} detail="Need reorder attention" icon={AlertCircle} tone="blue" />
          </section>

          <section id="runs" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-semibold text-white">Recent Production Runs</h2>
                  <p className="mt-1 text-xs text-slate-500">Latest production activity</p>
                </div>
              </div>
              {recentRuns.length ? (
                <div className="space-y-5">
                  {recentRuns.map((run) => {
                    const output = Number(run.actualGoodOutput);
                    const expected = Number(run.expectedOutput);
                    const barWidth = Math.min(100, (Math.max(output, expected) / maxRunOutput) * 100);
                    const isPosted = run.status === PRODUCTION_STATUS.POSTED;
                    return (
                      <div key={run.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <a href={`/production/runs/${run.id}`} className="truncate text-sm font-medium text-slate-200 hover:text-emerald-300 hover:underline">{run.product.name}</a>
                            <p className="mt-0.5 text-xs text-slate-500">{run.runNumber} · {dateFormatter.format(run.productionDate)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-medium text-white">{numberFormatter.format(output || expected)} <span className="text-xs font-normal text-slate-500">units</span></p>
                            <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wide ${isPosted ? "text-emerald-300" : "text-amber-300"}`}>
                              {run.status.toLowerCase()}
                            </p>
                            {isPosted && (
                              <p className="mt-0.5 text-xs text-slate-500">Cost: {inr(Number(run.costPerPacket))}/packet</p>
                            )}
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
            </div>
          </section>

          <section id="stock" className="mt-6 grid gap-6 xl:grid-cols-3">
            <StockTable title="Raw Materials" items={rawMaterials} emptyIcon={Search} />
            <StockTable title="Packaging" items={packaging} emptyIcon={Search} />
            <StockTable title="Finished Goods" items={finishedGoods} emptyIcon={Search} />
          </section>

          <section id="boms" className="mt-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <h2 className="font-semibold text-white mb-4">Active BOMs</h2>
              {boms.length ? (
                <div className="space-y-4">
                  {boms.map((bom) => (
                    <div key={bom.id} className="rounded-xl border border-white/[0.07] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-200">{bom.product.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">v{bom.version} · Yield: {numberFormatter.format(Number(bom.expectedYield))} {bom.expectedYieldUnit}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                            Active
                          </span>
                          <p className="mt-1 text-xs text-slate-500">{bom.items.length} components</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FileText} message="No active BOMs" />
              )}
            </div>
          </section>

          <footer className="flex flex-col gap-2 py-8 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>FactoryFlow · Production workspace</span>
            <span className="flex items-center gap-1.5"><ArrowUpRight size={12} /> Live data</span>
          </footer>
        </div>
      </main>
    </div>
  );
}