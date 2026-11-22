"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { postRunAction } from "./actions";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500";
const labelCls = "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500";

interface Line {
  itemId: string;
  name: string;
  unit: string;
  planned: string;
  isPackaging: boolean;
  stock: string;
}

export default function PostRunForm({
  runId,
  lines,
  expectedOutput,
  productUnit,
}: {
  runId: string;
  lines: Line[];
  expectedOutput: string;
  productUnit: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [actuals, setActuals] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((l) => [l.itemId, l.planned])),
  );
  const [goodOutput, setGoodOutput] = useState(expectedOutput);
  const [damagedQty, setDamagedQty] = useState("0");
  const [damagedItemId, setDamagedItemId] = useState(lines.find((l) => l.isPackaging)?.itemId ?? "");
  const [scrap, setScrap] = useState("0");
  const [labour, setLabour] = useState("0");
  const [gas, setGas] = useState("0");
  const [overheads, setOverheads] = useState("0");
  const packagingLines = lines.filter((l) => l.isPackaging);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await postRunAction(runId, {
        consumption: lines.map((l) => ({ itemId: l.itemId, actualQuantity: Number(actuals[l.itemId] ?? 0) })),
        actualGoodOutput: Number(goodOutput) || 0,
        damagedPackaging: Number(damagedQty) || 0,
        damagedItemId: damagedItemId || null,
        scrapWastage: Number(scrap) || 0,
        labourCost: Number(labour) || 0,
        gasPowerCost: Number(gas) || 0,
        otherOverheads: Number(overheads) || 0,
      });
      if (res.ok) router.refresh();
      else setError(res.error ?? "Posting failed.");
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-emerald-400/20 bg-[#0e1625] p-5">
      <h2 className="font-semibold text-white">Post run — enter actuals</h2>
      <p className="mt-1 text-xs text-slate-500">Actual quantities default to the BOM plan; adjust for what was really used.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
              <th className="pb-2 font-medium">Material</th>
              <th className="pb-2 font-medium">Planned</th>
              <th className="pb-2 font-medium">In stock</th>
              <th className="pb-2 font-medium">Actual used</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.itemId} className="border-b border-white/[0.05] last:border-0">
                <td className="py-2.5 text-slate-200">{l.name} {l.isPackaging && <span className="text-[10px] text-slate-600">(packaging)</span>}</td>
                <td className="py-2.5 text-slate-400">{l.planned} {l.unit}</td>
                <td className="py-2.5 text-slate-500">{l.stock} {l.unit}</td>
                <td className="py-2.5">
                  <input
                    type="number" min="0" step="0.001"
                    className={`${inputCls} w-28 text-center`}
                    value={actuals[l.itemId] ?? ""}
                    onChange={(e) => setActuals((s) => ({ ...s, [l.itemId]: e.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Good output ({productUnit})</label>
          <input type="number" min="0" className={inputCls} value={goodOutput} onChange={(e) => setGoodOutput(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Damaged packaging qty</label>
          <input type="number" min="0" step="0.001" className={inputCls} value={damagedQty} onChange={(e) => setDamagedQty(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Damaged item</label>
          <select className={inputCls} value={damagedItemId} onChange={(e) => setDamagedItemId(e.target.value)}>
            {packagingLines.map((l) => <option key={l.itemId} value={l.itemId} className="bg-[#0b1220]">{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Scrap / wastage</label>
          <input type="number" min="0" className={inputCls} value={scrap} onChange={(e) => setScrap(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Labour ₹</label>
          <input type="number" min="0" className={inputCls} value={labour} onChange={(e) => setLabour(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Gas / power ₹</label>
          <input type="number" min="0" className={inputCls} value={gas} onChange={(e) => setGas(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <label className={labelCls}>Other overheads ₹</label>
          <input type="number" min="0" className={`${inputCls} sm:max-w-xs`} value={overheads} onChange={(e) => setOverheads(e.target.value)} />
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

      <button onClick={submit} disabled={pending} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
        <CheckCircle2 size={16} /> {pending ? "Posting…" : "Post run (issues stock, computes variance & cost)"}
      </button>
    </section>
  );
}
