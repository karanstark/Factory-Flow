import { prisma } from "@/lib/prisma";
import { inr, moneyStr, D } from "@/lib/currency";
import { ORDER_STATUS } from "@/lib/constants";
import { getAdminOrdersData } from "./actions";
import OrderActions from "./order-actions";
import { logoutAction } from "@/app/login/actions";
import { ClipboardList, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === ORDER_STATUS.DISPATCHED
      ? "bg-emerald-400/10 text-emerald-300"
      : status === ORDER_STATUS.REJECTED || status === ORDER_STATUS.CANCELLED
        ? "bg-rose-400/10 text-rose-300"
        : status === ORDER_STATUS.APPROVED || status === ORDER_STATUS.INVOICED
          ? "bg-sky-400/10 text-sky-300"
          : "bg-amber-400/10 text-amber-300";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${tone}`}>
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export default async function AdminOrdersPage() {
  const { orders } = await getAdminOrdersData();

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white">
              <ClipboardList className="text-emerald-300" size={24} /> Order approvals
            </h1>
            <p className="mt-1 text-sm text-slate-500">Review submitted orders, approve against stock, and raise GST invoices.</p>
          </div>
          <a href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
            <ArrowLeft size={15} /> Dashboard
          </a>
        </div>

        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const shortageLines = order.items.filter(
              (it) => D(it.quantity).gt(it.product.inventoryItem.currentStock),
            ).length;
            const hasInvoice = order.invoices.length > 0;
            return (
              <article key={order.id} className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <a href={`/orders/${order.id}`} className="font-semibold text-white hover:text-emerald-300 hover:underline">
                      {order.orderNumber}
                    </a>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {order.customer.name} ({order.customer.code}) · {order.customer.state} · {dateFmt.format(order.orderDate)}
                      {order.salesman ? ` · by ${order.salesman.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-1 text-sm font-medium text-white">{inr(order.total)}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium">Ordered</th>
                        <th className="pb-2 font-medium">In stock</th>
                        <th className="pb-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((it) => {
                        const short = D(it.quantity).gt(it.product.inventoryItem.currentStock);
                        return (
                          <tr key={it.id} className="border-b border-white/[0.05] last:border-0">
                            <td className="py-2.5 text-slate-200">{it.product.name}</td>
                            <td className="py-2.5 text-slate-300">{moneyStr(it.quantity)} {it.product.unit}</td>
                            <td className={`py-2.5 ${short ? "font-medium text-amber-300" : "text-slate-400"}`}>
                              {moneyStr(it.product.inventoryItem.currentStock)} {it.product.unit}
                              {short && " ⚠"}
                            </td>
                            <td className="py-2.5 text-right text-slate-300">{inr(it.lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <OrderActions
                  orderId={order.id}
                  status={order.status}
                  hasInvoice={hasInvoice}
                  shortageCount={shortageLines}
                />
              </article>
            );
          })}
          {!orders.length && (
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-slate-500">
              No sales orders yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
