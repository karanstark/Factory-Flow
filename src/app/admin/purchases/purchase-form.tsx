"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createPurchaseAction } from "./actions";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500";
const labelCls = "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500";

interface ItemOpt { id: string; name: string; unit: string }

export default function PurchaseForm({ suppliers, items }: { suppliers: { id: string; name: string }[]; items: ItemOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [refNo, setRefNo] = useState("");
  const [rows, setRows] = useState<{ itemId: string; qty: string; rate: string; tax: string }[]>([{ itemId: "", qty: "", rate: "", tax: "0" }]);

  const itemById = new Map(items.map((i) => [i.id, i]));

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createPurchaseAction({
        supplierId,
        purchaseDate: date,
        referenceInvoiceNumber: refNo || undefined,
        items: rows
          .filter((r) => r.itemId && Number(r.qty) > 0)
          .map((r) => ({
            itemId: r.itemId,
            quantity: Number(r.qty),
            unit: itemById.get(r.itemId)?.unit ?? "",
            unitRate: Number(r.rate) || 0,
            taxAmount: Number(r.tax) || 0,
          })),
      });
      if (res.ok) {
        setRows([{ itemId: "", qty: "", rate: "", tax: "0" }]);
        setRefNo("");
        router.refresh();
      } else setError(res.error ?? "Purchase failed.");
    });
  }

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
      <h2 className="font-semibold text-white">New purchase</h2>
      <p className="mt-1 text-xs text-slate-500">Receives stock and updates weighted-average valuation.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Supplier</label>
          <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.map((s) => <option key={s.id} value={s.id} className="bg-[#0b1220]">{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Supplier invoice no.</label>
          <input className={inputCls} value={refNo} onChange={(e) => setRefNo(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <label className={labelCls}>Items</label>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_90px_80px_32px] gap-2">
            <select className={inputCls} value={r.itemId} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, itemId: e.target.value } : x)))}>
              <option value="" className="bg-[#0b1220]">Select item…</option>
              {items.map((it) => <option key={it.id} value={it.id} className="bg-[#0b1220]">{it.name} ({it.unit})</option>)}
            </select>
            <input type="number" placeholder="Qty" className={inputCls} value={r.qty} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
            <input type="number" placeholder="Rate" className={inputCls} value={r.rate} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))} />
            <input type="number" placeholder="Tax" className={inputCls} value={r.tax} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, tax: e.target.value } : x)))} />
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-300">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, { itemId: "", qty: "", rate: "", tax: "0" }])} className="text-xs text-emerald-400 hover:underline">+ Add item</button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={submit} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
          <Plus size={14} /> {pending ? "Posting…" : "Post purchase"}
        </button>
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
