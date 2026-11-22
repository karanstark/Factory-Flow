"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Truck, Ban } from "lucide-react";
import { recordPaymentAction, createDispatchAction, cancelInvoiceAction } from "./actions";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500";
const labelCls = "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500";
const btn =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export interface InvoiceOpsData {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: string;
  isInterState: boolean;
  items: { productId: string; name: string; unit: string; quantity: string; dispatched: string; available: string }[];
  paid: string;
  outstanding: string;
  paymentMethods: string[];
}

export default function InvoiceOps({ invoice }: { invoice: InvoiceOpsData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "payment" | "dispatch" | "cancel">("none");
  const today = new Date().toISOString().slice(0, 10);

  const [payAmount, setPayAmount] = useState(invoice.outstanding);
  const [payMethod, setPayMethod] = useState(invoice.paymentMethods[0] ?? "CASH");
  const [payDate, setPayDate] = useState(today);
  const [payRef, setPayRef] = useState("");

  const [dispatchDate, setDispatchDate] = useState(today);
  const [vehicle, setVehicle] = useState("");
  const [dispatchQty, setDispatchQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(invoice.items.map((i) => [i.productId, i.quantity])),
  );

  const [cancelReason, setCancelReason] = useState("");

  const cancelled = invoice.status === "CANCELLED";
  const canPay = !cancelled && Number(invoice.outstanding) > 0;
  const canDispatch = !cancelled;
  const canCancel = !cancelled;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, close = true) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (close) setPanel("none");
        router.refresh();
      } else {
        setError(res.error ?? "Action failed.");
      }
    });
  }

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {canPay && (
          <button onClick={() => setPanel(panel === "payment" ? "none" : "payment")} className={`${btn} border border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10`}>
            <CreditCard size={13} /> Record payment
          </button>
        )}
        {canDispatch && (
          <button onClick={() => setPanel(panel === "dispatch" ? "none" : "dispatch")} className={`${btn} border border-sky-400/30 text-sky-300 hover:bg-sky-400/10`}>
            <Truck size={13} /> Dispatch
          </button>
        )}
        {canCancel && (
          <button onClick={() => setPanel(panel === "cancel" ? "none" : "cancel")} className={`${btn} border border-rose-400/30 text-rose-300 hover:bg-rose-400/10`}>
            <Ban size={13} /> Cancel (credit note)
          </button>
        )}
      </div>

      {panel === "payment" && (
        <div className="mt-3 grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" min="0.01" step="0.01" className={inputCls} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Method</label>
            <select className={inputCls} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {invoice.paymentMethods.map((m) => (
                <option key={m} value={m} className="bg-[#0b1220]">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Reference</label>
            <input className={inputCls} value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="NEFT/UPI ref" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              disabled={pending || !(Number(payAmount) > 0)}
              onClick={() =>
                run(() =>
                  recordPaymentAction({
                    invoiceId: invoice.id,
                    amount: Number(payAmount),
                    paymentMethod: payMethod,
                    paymentDate: payDate,
                    referenceNumber: payRef || undefined,
                  }),
                )
              }
              className={`${btn} bg-emerald-500 text-slate-950 hover:bg-emerald-400`}
            >
              Save payment
            </button>
          </div>
        </div>
      )}

      {panel === "dispatch" && (
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Dispatch date</label>
              <input type="date" className={inputCls} value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Vehicle / LR ref (optional)</label>
              <input className={inputCls} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. TN-10-AB-1234" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {invoice.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 text-sm">
                <span className="flex-1 text-slate-300">
                  {item.name} <span className="text-xs text-slate-600">(in stock: {item.available})</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`${inputCls} w-28 text-center`}
                  value={dispatchQty[item.productId] ?? ""}
                  onChange={(e) => setDispatchQty((s) => ({ ...s, [item.productId]: e.target.value }))}
                />
                <span className="w-14 text-xs text-slate-500">{item.unit}</span>
              </div>
            ))}
          </div>
          <button
            disabled={pending}
            onClick={() =>
              run(() =>
                createDispatchAction({
                  invoiceId: invoice.id,
                  dispatchDate,
                  vehicleRef: vehicle || undefined,
                  items: invoice.items.map((i) => ({ productId: i.productId, quantity: Number(dispatchQty[i.productId] ?? 0) })),
                }),
              )
            }
            className={`${btn} mt-3 bg-sky-500 text-slate-950 hover:bg-sky-400`}
          >
            Post dispatch
          </button>
        </div>
      )}

      {panel === "cancel" && (
        <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-4">
          <p className="text-xs text-slate-400">
            Cancelling issues a credit note and marks the invoice CANCELLED. Posted invoices are never deleted.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className={inputCls}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for credit note"
            />
            <button
              disabled={pending}
              onClick={() => run(() => cancelInvoiceAction({ invoiceId: invoice.id, reason: cancelReason }), true)}
              className={`${btn} shrink-0 bg-rose-500 text-white hover:bg-rose-400`}
            >
              Issue credit note
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
