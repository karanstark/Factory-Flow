"use client";

// Mobile-first order entry: pick an assigned customer, add product lines,
// submit. Designed for a salesman on a phone — large tap targets, one column.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Send } from "lucide-react";
import { createSalesOrderAction } from "./actions";

interface CustomerOpt {
  id: string;
  name: string;
  code: string;
}
interface ProductOpt {
  id: string;
  name: string;
  packSize: string;
  sellingPrice: string | number;
  unit: string;
  stock: number;
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none focus:border-emerald-500";
const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400";

export default function OrderForm({ customers, products }: { customers: CustomerOpt[]; products: ProductOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<{ productId: string; qty: string }[]>([{ productId: products[0]?.id ?? "", qty: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = productById.get(l.productId);
        const qty = Number(l.qty);
        return p && qty > 0 ? sum + qty * Number(p.sellingPrice) : sum;
      }, 0),
    [lines, productById],
  );

  function updateLine(i: number, patch: Partial<{ productId: string; qty: string }>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function submit() {
    setError(null);
    setDone(null);
    const items = lines
      .filter((l) => l.productId && Number(l.qty) > 0)
      .map((l) => ({ productId: l.productId, quantity: Number(l.qty) }));
    if (!customerId) return setError("Select a customer.");
    if (!items.length) return setError("Add at least one product with a quantity.");
    startTransition(async () => {
      const res = await createSalesOrderAction({
        customerId,
        orderDate,
        items,
        remarks: remarks || undefined,
      });
      if (res.ok) {
        setDone(`Order ${res.orderNumber} submitted for approval.`);
        setLines([{ productId: products[0]?.id ?? "", qty: "" }]);
        setRemarks("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not create the order.");
      }
    });
  }

  return (
    <section id="new-order" className="mt-6 rounded-2xl border border-emerald-400/20 bg-[#0e1625] p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">New Order</h2>
        <p className="mt-1 text-xs text-slate-500">Submit an order for admin approval. Stock is verified on approval.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Customer</label>
          <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0b1220]">
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Order date</label>
          <input type="date" className={inputCls} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <label className={labelCls}>Items</label>
        {lines.map((line, i) => {
          const p = productById.get(line.productId);
          return (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <select
                  className={inputCls}
                  value={line.productId}
                  onChange={(e) => updateLine(i, { productId: e.target.value })}
                >
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id} className="bg-[#0b1220]">
                      {prod.name} — ₹{Number(prod.sellingPrice)} · stock {prod.stock}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="Qty"
                className={`${inputCls} w-24 text-center`}
                value={line.qty}
                onChange={(e) => updateLine(i, { qty: e.target.value })}
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:border-rose-400/40 hover:text-rose-300"
                  aria-label="Remove line"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, { productId: products[0]?.id ?? "", qty: "" }])}
          className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      <div className="mt-5">
        <label className={labelCls}>Remarks (optional)</label>
        <input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. delivery this week" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          Estimated total: <span className="font-semibold text-white">₹{total.toFixed(2)}</span> <span className="text-xs text-slate-600">(before GST)</span>
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          <Send size={17} /> {pending ? "Submitting…" : "Submit order"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{error}</p>}
      {done && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{done}</p>}
    </section>
  );
}
