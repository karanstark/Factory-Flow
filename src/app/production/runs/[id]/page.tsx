import { notFound, redirect } from "next/navigation";
import { getRunDetail } from "../actions";
import PostRunForm from "../post-run-form";
import { inr, moneyStr, D } from "@/lib/currency";
import { yieldVariancePct, flagForVariance } from "@/lib/inventory-math";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const FLAG_CLS: Record<string, string> = {
  GREEN: "bg-emerald-400/10 text-emerald-300",
  AMBER: "bg-amber-400/10 text-amber-300",
  RED: "bg-rose-400/10 text-rose-300",
};

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, run } = await getRunDetail(id).catch(() => ({ user: null, run: null }));
  if (!user || !run) notFound();
  if (!["PRODUCTION", "ADMIN", "OWNER"].includes(user.role)) redirect("/dashboard");

  const isDraft = run.status === "DRAFT";
  const yv = yieldVariancePct(run.actualGoodOutput || 0, run.expectedOutput || 0);
  const yFlag = flagForVariance(yv, run.bom?.tolerance ?? 3);
  const tol = Number(run.bom?.tolerance ?? 3);

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{run.runNumber}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {run.product.name} · {dateFmt.format(run.productionDate)} · BOM v{run.bomVersion ?? "—"} · {run.status.toLowerCase()}
            </p>
          </div>
          <a href="/production/dashboard" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
            <ArrowLeft size={15} /> Dashboard
          </a>
        </div>

        <section className="grid gap-4 rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:grid-cols-4">
          <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Expected output</p><p className="mt-1 text-lg font-semibold text-white">{moneyStr(run.expectedOutput)} {run.product.unit}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Actual good</p><p className="mt-1 text-lg font-semibold text-white">{moneyStr(run.actualGoodOutput || 0)} {run.product.unit}</p></div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-600">Yield variance</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
              {moneyStr(yv)}%
              {!isDraft && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FLAG_CLS[yFlag]}`}>{yFlag}</span>}
            </p>
          </div>
          <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Cost / {run.product.unit}</p><p className="mt-1 text-lg font-semibold text-emerald-300">{run.status === "POSTED" ? inr(run.costPerPacket) : "—"}</p></div>
        </section>

        {/* Planned vs actual consumption with variance */}
        <section className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
          <h2 className="font-semibold text-white">Consumption — planned vs actual</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 font-medium">Planned</th>
                  <th className="pb-2 font-medium">Actual</th>
                  <th className="pb-2 font-medium">Variance</th>
                  <th className="pb-2 text-right font-medium">Flag</th>
                </tr>
              </thead>
              <tbody>
                {run.consumption.map((c) => {
                  const variance = c.variancePct !== null ? Number(c.variancePct) : null;
                  const flag = variance === null ? null : flagForVariance(variance, tol);
                  return (
                    <tr key={c.id} className="border-b border-white/[0.05] last:border-0">
                      <td className="py-2.5 text-slate-200">{c.item.name} <span className="text-xs text-slate-600">({c.unit})</span></td>
                      <td className="py-2.5 text-slate-400">{moneyStr(c.plannedQuantity)}</td>
                      <td className="py-2.5 text-slate-300">{moneyStr(c.actualQuantity)}</td>
                      <td className={`py-2.5 ${variance !== null && variance !== 0 ? "font-medium text-amber-300" : "text-slate-500"}`}>
                        {variance === null ? "—" : `${variance > 0 ? "+" : ""}${moneyStr(variance)}%`}
                      </td>
                      <td className="py-2.5 text-right">
                        {flag ? <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${FLAG_CLS[flag]}`}>{flag}</span> : <span className="text-xs text-slate-600">draft</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {run.status === "POSTED" && (
          <section className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
            <h2 className="font-semibold text-white">Costing snapshot</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    <th className="pb-2 font-medium">Component</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 font-medium">Rate</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {run.costLines.map((cl) => (
                    <tr key={cl.id} className="border-b border-white/[0.05] last:border-0">
                      <td className="py-2.5 text-slate-200">{cl.description}</td>
                      <td className="py-2.5 text-slate-400">{cl.quantity ? moneyStr(cl.quantity) : "—"}</td>
                      <td className="py-2.5 text-slate-400">{cl.rate ? inr(cl.rate) : "—"}</td>
                      <td className="py-2.5 text-right text-slate-300">{inr(cl.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-8 text-sm">
              <span className="text-slate-500">Total cost <span className="font-semibold text-white">{inr(run.totalCost)}</span></span>
              <span className="text-slate-500">Per packet <span className="font-semibold text-emerald-300">{inr(run.costPerPacket)}</span></span>
            </div>
          </section>
        )}

        {isDraft && (
          <PostRunForm
            runId={run.id}
            expectedOutput={run.expectedOutput.toString()}
            productUnit={run.product.unit}
            lines={run.consumption.map((c) => ({
              itemId: c.itemId,
              name: c.item.name,
              unit: c.unit,
              planned: moneyStr(c.plannedQuantity),
              isPackaging: c.isPackaging,
              stock: moneyStr(c.item.currentStock),
            }))}
          />
        )}
      </div>
    </main>
  );
}
