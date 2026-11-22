import Decimal from "decimal.js";
import { inr, moneyStr, D } from "@/lib/currency";
import { getAdminInvoicesData } from "./actions";
import InvoiceOps, { type InvoiceOpsData } from "./invoice-ops";
import { ArrowLeft, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-emerald-400/10 text-emerald-300"
      : status === "PARTIALLY_PAID"
        ? "bg-amber-400/10 text-amber-300"
        : status === "CANCELLED"
          ? "bg-rose-400/10 text-rose-300"
          : "bg-sky-400/10 text-sky-300";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${tone}`}>
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export default async function AdminInvoicesPage() {
  const { invoices, paymentMethods } = await getAdminInvoicesData();

  const opsData: InvoiceOpsData[] = invoices.map((inv) => {
    const paid = inv.payments.reduce((s, p) => s.plus(p.amount), D(0));
    const outstanding = D(inv.totalAmount).minus(paid);
    const dispatchedByProduct = new Map<string, Decimal>();
    for (const d of inv.dispatches) {
      for (const di of d.items) {
        dispatchedByProduct.set(
          di.productId,
          (dispatchedByProduct.get(di.productId) ?? new Decimal(0)).plus(di.quantity),
        );
      }
    }
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      totalAmount: moneyStr(inv.totalAmount),
      isInterState: inv.isInterState,
      paid: moneyStr(paid),
      outstanding: moneyStr(outstanding.lt(0) ? D(0) : outstanding),
      paymentMethods,
      items: inv.items
        .filter((i) => i.product)
        .map((i) => ({
          productId: i.productId,
          name: i.description,
          unit: i.product!.unit,
          quantity: moneyStr(i.quantity),
          dispatched: moneyStr(dispatchedByProduct.get(i.productId) ?? 0),
          available: moneyStr(i.product!.inventoryItem.currentStock),
        })),
    };
  });
  const opsById = new Map(opsData.map((o) => [o.id, o]));

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white">
              <FileText className="text-emerald-300" size={24} /> Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-500">GST invoices — PDF, payments, dispatch and credit notes.</p>
          </div>
          <a href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
            <ArrowLeft size={15} /> Dashboard
          </a>
        </div>

        <div className="mt-6 space-y-4">
          {invoices.map((inv) => {
            const ops = opsById.get(inv.id)!;
            const paid = inv.payments.reduce((s, p) => s.plus(p.amount), D(0));
            const balance = D(inv.totalAmount).minus(paid);
            return (
              <article key={inv.id} className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-white">{inv.invoiceNumber}</h2>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {inv.customer.name} ({inv.customer.code}) · {dateFmt.format(inv.invoiceDate)} · FY {inv.financialYear}
                      {inv.isInterState ? " · Inter-state (IGST)" : " · Intra-state (CGST+SGST)"}
                      {inv.salesOrder ? ` · Order ${inv.salesOrder.orderNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{inr(inv.totalAmount)}</p>
                      <p className="text-[10px] text-slate-500">
                        paid {inr(paid)} · due {inr(balance.lt(0) ? D(0) : balance)}
                      </p>
                    </div>
                    <a
                      href={`/invoices/${inv.id}/pdf`}
                      target="_blank"
                      className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/10"
                    >
                      PDF
                    </a>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>Taxable {inr(inv.totalTaxable)}</span>
                  {inv.cgst.gt(0) && <span>CGST {inr(inv.cgst)}</span>}
                  {inv.sgst.gt(0) && <span>SGST {inr(inv.sgst)}</span>}
                  {inv.igst.gt(0) && <span>IGST {inr(inv.igst)}</span>}
                  {inv.dispatches.length > 0 && <span>{inv.dispatches.length} dispatch(es)</span>}
                  {inv.creditNotes.map((cn) => (
                    <span key={cn.id} className="text-rose-300">CN {cn.creditNoteNumber}</span>
                  ))}
                </div>

                <InvoiceOps invoice={ops} />
              </article>
            );
          })}
          {!invoices.length && (
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-slate-500">
              No invoices yet — generate one from an approved order.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
