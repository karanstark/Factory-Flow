"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { createRunAction } from "./actions";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500";
const labelCls = "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500";

interface BomOpt {
  id: string;
  productId: string;
  productName: string;
  expectedYield: string;
  yieldUnit: string;
  fgStock: string;
}

export default function NewRunForm({ boms }: { boms: BomOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bomId, setBomId] = useState(boms[0]?.id ?? "");
  const [batchSize, setBatchSize] = useState(boms[0]?.expectedYield ?? "200");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const selected = boms.find((b) => b.id === bomId);

  function submit() {
    setError(null);
    if (!selected) return setError("Select a product/BOM.");
    startTransition(async () => {
      const res = await createRunAction({
        productId: selected.productId,
        bomId,
        batchSize: Number(batchSize),
        productionDate: date,
      });
      if (res.ok && res.runId) router.push(`/production/runs/${res.runId}`);
      else setError(res.error ?? "Could not create run.");
    });
  }

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-white/[0.07] bg-[#0e1625] p-6">
      <h1 className="text-xl font-semibold text-white">New production run</h1>
      <p className="mt-1 text-sm text-slate-500">Creates a draft run with planned material consumption from the active BOM.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Product / BOM</label>
          <select className={inputCls} value={bomId} onChange={(e) => { setBomId(e.target.value); const b = boms.find((x) => x.id === e.target.value); if (b) setBatchSize(b.expectedYield); }}>
            {boms.map((b) => (
              <option key={b.id} value={b.id} className="bg-[#0b1220]">
                {b.productName} — batch of {b.expectedYield} {b.yieldUnit}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Batch size (expected output)</label>
          <input type="number" min="1" className={inputCls} value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Production date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-slate-500">
            Finished-goods stock now: <span className="text-slate-300">{selected ? selected.fgStock : "—"}</span>
          </p>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

      <button onClick={submit} disabled={pending} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
        <Play size={16} /> {pending ? "Creating…" : "Create draft run"}
      </button>
    </section>
  );
}
