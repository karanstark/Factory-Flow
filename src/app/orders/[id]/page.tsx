// Shared order detail: items, totals, status, linked invoice(s), payments and
// dispatches. Salesmen can only open their own orders; office roles can open
// any order.
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { inr, moneyStr, D } from "@/lib/currency";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      salesman: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      items: { include: { product: { include: { inventoryItem: { select: { currentStock: true } } } } } },
      invoices: {
        include: {
          items: true,
          payments: true,
          dispatches: { include: { items: { include: { product: { select: { name: true } } } } } },
          creditNotes: true,
        },
      },
    },
  });
  if (!order) notFound();
  if (user.role === ROLES.SALESMAN && order.salesmanId !== user.id) redirect("/salesman/dashboard");

  const officeRoles: string[] = [ROLES.ADMIN, ROLES.OWNER, ROLES.ACCOUNTANT];
  if (![ROLES.SALESMAN, ...officeRoles].includes(user.role as string)) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <a href={user.role === ROLES.SALESMAN ? "/salesman/dashboard" : "/admin/orders"} className="text-sm text-emerald-400 hover:underline">
          ← Back
        </a>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {order.customer.name} · {dateFmt.format(order.orderDate)} · {order.status.replaceAll("_", " ").toLowerCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-white">{inr(order.total)}</p>
            <p className="text-xs text-slate-500">before GST</p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
          <h2 className="font-semibold text-white">Items</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium">Dispatched</th>
                  <th className="pb-2 text-right font-medium">Rate</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="py-3 text-slate-200">{it.product.name} <span className="text-xs text-slate-600">({it.product.packSize})</span></td>
                    <td className="py-3 text-slate-300">{moneyStr(it.quantity)} {it.product.unit}</td>
                    <td className="py-3 text-slate-400">{moneyStr(it.dispatchedQuantity)}</td>
                    <td className="py-3 text-right text-slate-400">{inr(it.unitPrice)}</td>
                    <td className="py-3 text-right font-medium text-slate-200">{inr(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {order.remarks && <p className="mt-4 text-xs text-slate-500">Remarks: {order.remarks}</p>}
        </section>

        {order.invoices.map((inv) => {
          const paid = inv.payments.reduce((s, p) => s.plus(p.amount), D(0));
          const balance = D(inv.totalAmount).minus(paid);
          return (
            <section key={inv.id} className="mt-6 rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">Invoice {inv.invoiceNumber}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {dateFmt.format(inv.invoiceDate)} · {inv.placeOfSupply} · {inv.status.toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{inr(inv.totalAmount)}</span>
                  <a
                    href={`/invoices/${inv.id}/pdf`}
                    target="_blank"
                    className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/10"
                  >
                    PDF
                  </a>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-600">Taxable</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">{inr(inv.totalTaxable)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-600">GST</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {[inv.cgst.gt(0) && `CGST ${inr(inv.cgst)}`, inv.sgst.gt(0) && `SGST ${inr(inv.sgst)}`, inv.igst.gt(0) && `IGST ${inr(inv.igst)}`]
                      .filter(Boolean)
                      .join(" + ") || "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-600">Balance</p>
                  <p className="mt-1 text-sm font-medium text-amber-300">{inr(balance.lt(0) ? D(0) : balance)}</p>
                </div>
              </div>
              {inv.payments.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-400">Payments</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {inv.payments.map((p) => (
                      <li key={p.id}>
                        {dateFmt.format(p.paymentDate)} · {p.paymentMethod} · {inr(p.amount)}
                        {p.referenceNumber ? ` · ref ${p.referenceNumber}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inv.creditNotes.map((cn) => (
                <p key={cn.id} className="mt-3 text-xs text-rose-300">
                  Cancelled by credit note {cn.creditNoteNumber} on {dateFmt.format(cn.creditNoteDate)}
                  {cn.reason ? ` — ${cn.reason}` : ""}
                </p>
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}
