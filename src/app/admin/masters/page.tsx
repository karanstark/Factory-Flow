import { getMastersData } from "./actions";
import { CustomerForm, SupplierForm, StockItemForm, ProductForm, BomForm } from "./forms";
import { inr, moneyStr, D } from "@/lib/currency";
import { ArrowLeft, Database } from "lucide-react";

export const dynamic = "force-dynamic";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
      <h2 className="font-semibold text-white">{title}</h2>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {children}
    </section>
  );
}

const th = "pb-2 font-medium";
const td = "py-2 text-slate-400";

export default async function MastersPage() {
  const { customers, suppliers, stockItems, products, salesmen, boms } = await getMastersData();

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white">
              <Database className="text-emerald-300" size={24} /> Masters
            </h1>
            <p className="mt-1 text-sm text-slate-500">Customers, suppliers, raw materials, products and BOMs.</p>
          </div>
          <a href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
            <ArrowLeft size={15} /> Dashboard
          </a>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Customers" hint={`${customers.length} on file`}>
            <div className="mt-3 max-h-56 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  <th className={th}>Name</th><th className={th}>Type</th><th className={th}>State</th><th className={`${th} text-right`}>Credit</th>
                </tr></thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.05] last:border-0">
                      <td className={`${td} text-slate-200`}>{c.name} <span className="text-xs text-slate-600">{c.code}</span></td>
                      <td className={td}>{c.customerType.toLowerCase()}</td>
                      <td className={td}>{c.stateCode}</td>
                      <td className={`${td} text-right`}>{c.creditLimit ? inr(c.creditLimit) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CustomerForm salesmen={salesmen} />
          </Section>

          <Section title="Suppliers" hint={`${suppliers.length} on file`}>
            <div className="mt-3 max-h-56 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  <th className={th}>Name</th><th className={th}>GSTIN</th><th className={th}>State</th>
                </tr></thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.05] last:border-0">
                      <td className={`${td} text-slate-200`}>{s.name} <span className="text-xs text-slate-600">{s.code}</span></td>
                      <td className={td}>{s.gstin ?? "—"}</td>
                      <td className={td}>{s.state ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SupplierForm />
          </Section>

          <Section title="Raw materials & packaging" hint={`${stockItems.length} items`}>
            <div className="mt-3 max-h-56 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  <th className={th}>Item</th><th className={th}>Cat</th><th className={th}>Unit</th><th className={`${th} text-right`}>Stock</th><th className={`${th} text-right`}>Rate</th>
                </tr></thead>
                <tbody>
                  {stockItems.map((it) => (
                    <tr key={it.id} className="border-b border-white/[0.05] last:border-0">
                      <td className={`${td} text-slate-200`}>{it.name} <span className="text-xs text-slate-600">{it.code}</span></td>
                      <td className={td}>{it.category === "RAW_MATERIAL" ? "RM" : "PKG"}</td>
                      <td className={td}>{it.unit}</td>
                      <td className={`${td} text-right`}>{moneyStr(it.currentStock)}</td>
                      <td className={`${td} text-right`}>{inr(it.avgRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <StockItemForm />
          </Section>

          <Section title="Products (finished goods)" hint={`${products.length} SKUs`}>
            <div className="mt-3 max-h-56 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  <th className={th}>Product</th><th className={th}>Price</th><th className={th}>GST</th><th className={`${th} text-right`}>Stock</th><th className={th}>BOM</th>
                </tr></thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-white/[0.05] last:border-0">
                      <td className={`${td} text-slate-200`}>{p.name} <span className="text-xs text-slate-600">{p.code}</span></td>
                      <td className={td}>{inr(p.sellingPrice)}</td>
                      <td className={td}>{moneyStr(p.gstRate)}%</td>
                      <td className={`${td} text-right`}>{moneyStr(p.inventoryItem.currentStock)}</td>
                      <td className={td}>{p.boms[0] ? `v${p.boms[0].version}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ProductForm />
          </Section>

          <Section title="Bills of materials" hint={`${boms.length} versions`}>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {boms.map((b) => (
                <div key={b.id} className="rounded-xl border border-white/[0.06] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{b.product.name} <span className="text-xs text-slate-600">v{b.version}</span></span>
                    <span className="text-xs text-slate-500">yield {moneyStr(b.expectedYield)} {b.expectedYieldUnit} · tol {moneyStr(b.tolerance)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {b.items.map((i) => `${i.item.name} ${moneyStr(i.standardQuantity)}${i.unit}`).join(" · ")}
                  </p>
                </div>
              ))}
              {!boms.length && <p className="text-xs text-slate-600">No BOMs yet.</p>}
            </div>
            <BomForm products={products.map((p) => ({ id: p.id, name: p.name }))} stockItems={stockItems} />
          </Section>
        </div>
      </div>
    </main>
  );
}
