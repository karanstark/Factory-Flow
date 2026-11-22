import { getPurchasesData } from "./actions";
import PurchaseForm from "./purchase-form";
import { inr, moneyStr } from "@/lib/currency";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function PurchasesPage() {
  const { purchases, suppliers, items } = await getPurchasesData();

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Purchases</h1>
            <p className="mt-1 text-sm text-slate-500">Supplier receipts — stock in and valuation updates.</p>
          </div>
          <a href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
            <ArrowLeft size={15} /> Dashboard
          </a>
        </div>

        <PurchaseForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          items={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
        />

        <section className="space-y-3">
          {purchases.map((p) => (
            <article key={p.id} className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">{p.purchaseNumber}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.supplier.name} · {dateFmt.format(p.purchaseDate)}
                    {p.referenceInvoiceNumber ? ` · Ref ${p.referenceInvoiceNumber}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{inr(p.totalAmount)}</p>
                  <p className="text-[10px] text-slate-500">tax {inr(p.taxAmount)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                {p.items.map((i) => (
                  <span key={i.id}>{i.item.name}: {moneyStr(i.quantity)} {i.unit} @ {inr(i.unitRate)}</span>
                ))}
              </div>
            </article>
          ))}
          {!purchases.length && <p className="text-sm text-slate-500">No purchases yet.</p>}
        </section>
      </div>
    </main>
  );
}
