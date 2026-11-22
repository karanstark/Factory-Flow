"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, FileText } from "lucide-react";
import { approveOrderAction, rejectOrderAction, generateInvoiceAction } from "./actions";

const btn =
  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50";

export default function OrderActions({
  orderId,
  status,
  hasInvoice,
  shortageCount,
}: {
  orderId: string;
  status: string;
  hasInvoice: boolean;
  shortageCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error ?? "Action failed.");
    });
  }

  const canApprove = status === "SUBMITTED" || status === "UNDER_REVIEW";
  const canInvoice = status === "APPROVED" && !hasInvoice;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {canApprove && (
          <>
            <button
              disabled={pending || shortageCount > 0}
              title={shortageCount > 0 ? "Insufficient finished-goods stock" : "Approve order"}
              onClick={() => run(() => approveOrderAction(orderId))}
              className={`${btn} bg-emerald-500 text-slate-950 hover:bg-emerald-400`}
            >
              <Check size={14} /> Approve
            </button>
            <button
              disabled={pending}
              onClick={() => setRejecting((v) => !v)}
              className={`${btn} border border-rose-400/30 text-rose-300 hover:bg-rose-400/10`}
            >
              <X size={14} /> Reject
            </button>
          </>
        )}
        {canInvoice && (
          <button
            disabled={pending}
            onClick={() => run(() => generateInvoiceAction(orderId))}
            className={`${btn} bg-sky-500 text-slate-950 hover:bg-sky-400`}
          >
            <FileText size={14} /> Generate GST invoice
          </button>
        )}
        {status === "APPROVED" && hasInvoice && (
          <span className="text-xs text-slate-500">Invoiced — see Invoices</span>
        )}
      </div>
      {shortageCount > 0 && canApprove && (
        <p className="mt-2 text-xs text-amber-300">{shortageCount} item line(s) short on stock — approval will be blocked.</p>
      )}
      {rejecting && (
        <div className="mt-3 flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason"
            className="flex-1 rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-rose-400/50"
          />
          <button
            disabled={pending}
            onClick={() => run(() => rejectOrderAction(orderId, reason))}
            className={`${btn} bg-rose-500 text-white hover:bg-rose-400`}
          >
            Confirm reject
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
