"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createCustomerAction, createSupplierAction, createStockItemAction,
  createProductAction, createBomAction,
} from "./actions";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500";
const labelCls = "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500";
const btn =
  "inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50";

function useSubmit() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null); setDone(false);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) { setDone(true); router.refresh(); }
      else setError(res.error ?? "Failed.");
    });
  }
  return { pending, error, done, run };
}

function Feedback({ error, done }: { error: string | null; done: boolean }) {
  return (
    <>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      {done && <p className="mt-2 text-xs text-emerald-300">Saved.</p>}
    </>
  );
}

const US_STATES = [
  ["33", "Tamil Nadu"], ["29", "Karnataka"], ["27", "Maharashtra"], ["07", "Delhi"],
  ["24", "Gujarat"], ["32", "Kerala"], ["36", "Telangana"], ["09", "Uttar Pradesh"],
];

export function CustomerForm({ salesmen }: { salesmen: { id: string; name: string }[] }) {
  const { pending, error, done, run } = useSubmit();
  const [f, setF] = useState({ name: "", customerType: "RETAILER", gstin: "", phone: "", address: "", stateCode: "33", creditLimit: "", salesmanId: "" });
  const stateName = US_STATES.find(([c]) => c === f.stateCode)?.[1] ?? "Tamil Nadu";
  return (
    <form
      className="mt-3 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createCustomerAction({
          name: f.name, customerType: f.customerType, gstin: f.gstin || undefined,
          phone: f.phone || undefined, address: f.address || undefined,
          state: stateName, stateCode: f.stateCode,
          creditLimit: f.creditLimit ? Number(f.creditLimit) : undefined,
          assignedSalesmanId: f.salesmanId || undefined,
        }));
      }}
    >
      <div><label className={labelCls}>Name</label><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className={labelCls}>Type</label>
        <select className={inputCls} value={f.customerType} onChange={(e) => setF({ ...f, customerType: e.target.value })}>
          <option value="RETAILER">Retailer</option><option value="DISTRIBUTOR">Distributor</option>
        </select></div>
      <div><label className={labelCls}>GSTIN</label><input className={inputCls} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value })} /></div>
      <div><label className={labelCls}>Phone</label><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div><label className={labelCls}>Address</label><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div><label className={labelCls}>State</label>
        <select className={inputCls} value={f.stateCode} onChange={(e) => setF({ ...f, stateCode: e.target.value })}>
          {US_STATES.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
        </select></div>
      <div><label className={labelCls}>Credit limit ₹</label><input type="number" className={inputCls} value={f.creditLimit} onChange={(e) => setF({ ...f, creditLimit: e.target.value })} /></div>
      <div><label className={labelCls}>Assigned salesman</label>
        <select className={inputCls} value={f.salesmanId} onChange={(e) => setF({ ...f, salesmanId: e.target.value })}>
          <option value="">— none —</option>
          {salesmen.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></div>
      <div className="sm:col-span-2"><button disabled={pending} className={btn}><Plus size={14} /> Add customer</button><Feedback error={error} done={done} /></div>
    </form>
  );
}

export function SupplierForm() {
  const { pending, error, done, run } = useSubmit();
  const [f, setF] = useState({ name: "", gstin: "", phone: "", address: "", stateCode: "33" });
  const stateName = US_STATES.find(([c]) => c === f.stateCode)?.[1] ?? "";
  return (
    <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      run(() => createSupplierAction({ name: f.name, gstin: f.gstin || undefined, phone: f.phone || undefined, address: f.address || undefined, state: stateName, stateCode: f.stateCode }));
    }}>
      <div><label className={labelCls}>Name</label><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className={labelCls}>GSTIN</label><input className={inputCls} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value })} /></div>
      <div><label className={labelCls}>Phone</label><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div><label className={labelCls}>State</label>
        <select className={inputCls} value={f.stateCode} onChange={(e) => setF({ ...f, stateCode: e.target.value })}>
          {US_STATES.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
        </select></div>
      <div className="sm:col-span-2"><label className={labelCls}>Address</label><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div className="sm:col-span-2"><button disabled={pending} className={btn}><Plus size={14} /> Add supplier</button><Feedback error={error} done={done} /></div>
    </form>
  );
}

export function StockItemForm() {
  const { pending, error, done, run } = useSubmit();
  const [f, setF] = useState({ name: "", sku: "", category: "RAW_MATERIAL", unit: "kg", reorderLevel: "", openingQty: "", openingRate: "" });
  return (
    <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={(e) => {
      e.preventDefault();
      run(() => createStockItemAction({
        name: f.name, sku: f.sku, category: f.category, unit: f.unit,
        reorderLevel: f.reorderLevel ? Number(f.reorderLevel) : undefined,
        openingQty: f.openingQty ? Number(f.openingQty) : 0,
        openingRate: f.openingRate ? Number(f.openingRate) : 0,
      }));
    }}>
      <div><label className={labelCls}>Name</label><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className={labelCls}>SKU</label><input required className={inputCls} value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
      <div><label className={labelCls}>Category</label>
        <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="RAW_MATERIAL">Raw material</option><option value="PACKAGING">Packaging</option>
        </select></div>
      <div><label className={labelCls}>Unit</label>
        <select className={inputCls} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
          {["kg", "g", "L", "ml", "pieces", "packets", "cartons"].map((u) => <option key={u} value={u}>{u}</option>)}
        </select></div>
      <div><label className={labelCls}>Reorder level</label><input type="number" className={inputCls} value={f.reorderLevel} onChange={(e) => setF({ ...f, reorderLevel: e.target.value })} /></div>
      <div><label className={labelCls}>Opening qty / rate</label>
        <div className="flex gap-2">
          <input type="number" placeholder="qty" className={inputCls} value={f.openingQty} onChange={(e) => setF({ ...f, openingQty: e.target.value })} />
          <input type="number" placeholder="rate" className={inputCls} value={f.openingRate} onChange={(e) => setF({ ...f, openingRate: e.target.value })} />
        </div></div>
      <div className="sm:col-span-3"><button disabled={pending} className={btn}><Plus size={14} /> Add item</button><Feedback error={error} done={done} /></div>
    </form>
  );
}

export function ProductForm() {
  const { pending, error, done, run } = useSubmit();
  const [f, setF] = useState({ name: "", sku: "", packSize: "", sellingPrice: "", gstRate: "5", hsnCode: "", openingQty: "", openingRate: "" });
  return (
    <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={(e) => {
      e.preventDefault();
      run(() => createProductAction({
        name: f.name, sku: f.sku, packSize: f.packSize,
        sellingPrice: Number(f.sellingPrice), gstRate: Number(f.gstRate), hsnCode: f.hsnCode,
        openingQty: f.openingQty ? Number(f.openingQty) : 0,
        openingRate: f.openingRate ? Number(f.openingRate) : 0,
      }));
    }}>
      <div><label className={labelCls}>Name</label><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className={labelCls}>SKU</label><input required className={inputCls} value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
      <div><label className={labelCls}>Pack size</label><input className={inputCls} value={f.packSize} onChange={(e) => setF({ ...f, packSize: e.target.value })} placeholder="200 g" /></div>
      <div><label className={labelCls}>Price ₹</label><input required type="number" step="0.01" className={inputCls} value={f.sellingPrice} onChange={(e) => setF({ ...f, sellingPrice: e.target.value })} /></div>
      <div><label className={labelCls}>GST %</label><input type="number" step="0.01" className={inputCls} value={f.gstRate} onChange={(e) => setF({ ...f, gstRate: e.target.value })} /></div>
      <div><label className={labelCls}>HSN</label><input required className={inputCls} value={f.hsnCode} onChange={(e) => setF({ ...f, hsnCode: e.target.value })} /></div>
      <div><label className={labelCls}>Opening stock qty / rate</label>
        <div className="flex gap-2">
          <input type="number" placeholder="qty" className={inputCls} value={f.openingQty} onChange={(e) => setF({ ...f, openingQty: e.target.value })} />
          <input type="number" placeholder="rate" className={inputCls} value={f.openingRate} onChange={(e) => setF({ ...f, openingRate: e.target.value })} />
        </div></div>
      <div className="sm:col-span-3"><button disabled={pending} className={btn}><Plus size={14} /> Add product</button><Feedback error={error} done={done} /></div>
      <p className="sm:col-span-3 text-[11px] text-slate-600">A finished-goods stock item is created automatically and linked to this product.</p>
    </form>
  );
}

export function BomForm({ products, stockItems }: { products: { id: string; name: string }[]; stockItems: { id: string; name: string; unit: string; category: string }[] }) {
  const { pending, error, done, run } = useSubmit();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [yield_, setYield] = useState("200");
  const [tolerance, setTolerance] = useState("3");
  const [rows, setRows] = useState<{ itemId: string; qty: string }[]>([{ itemId: "", qty: "" }]);
  return (
    <form className="mt-3 space-y-3" onSubmit={(e) => {
      e.preventDefault();
      run(() => createBomAction({
        productId, expectedYield: Number(yield_), expectedYieldUnit: "packets",
        tolerance: Number(tolerance),
        items: rows.filter((r) => r.itemId && Number(r.qty) > 0).map((r) => ({ itemId: r.itemId, standardQuantity: Number(r.qty) })),
      }));
    }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className={labelCls}>Product</label>
          <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id} className="bg-[#0b1220]">{p.name}</option>)}
          </select></div>
        <div><label className={labelCls}>Expected yield</label><input required type="number" className={inputCls} value={yield_} onChange={(e) => setYield(e.target.value)} /></div>
        <div><label className={labelCls}>Tolerance %</label><input type="number" className={inputCls} value={tolerance} onChange={(e) => setTolerance(e.target.value)} /></div>
      </div>
      <div className="space-y-2">
        <label className={labelCls}>Components (per batch)</label>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <select className={inputCls} value={r.itemId} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, itemId: e.target.value } : x)))}>
              <option value="" className="bg-[#0b1220]">Select material…</option>
              {stockItems.map((it) => <option key={it.id} value={it.id} className="bg-[#0b1220]">{it.name} ({it.unit})</option>)}
            </select>
            <input type="number" step="0.001" min="0" placeholder="Qty" className={`${inputCls} w-28`} value={r.qty} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
            {rows.length > 1 && <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="px-2 text-slate-500 hover:text-rose-300">✕</button>}
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, { itemId: "", qty: "" }])} className="text-xs text-emerald-400 hover:underline">+ Add component</button>
      </div>
      <button disabled={pending} className={btn}><Plus size={14} /> Create BOM</button>
      <Feedback error={error} done={done} />
    </form>
  );
}
