import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { inr, moneyStr, D } from "@/lib/currency";
import { ArrowLeft, Download } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function ItemLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(ROLES.ADMIN, ROLES.PRODUCTION, ROLES.OWNER, ROLES.ACCOUNTANT);
  if (!user) redirect("/login");
  const { id } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      stockMovements: {
        include: { user: { select: { name: true } } },
        orderBy: [{ createdAt: "asc" }, { movementNumber: "asc" }],
      },
    },
  });
  if (!item) notFound();

  const ledgerStock = item.stockMovements.reduce(
    (s, m) => s.plus(m.quantityIn).minus(m.quantityOut),
    D(0),
  );

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{item.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {item.code} · {item.category.replaceAll("_", " ").toLowerCase()} · stock {moneyStr(item.currentStock)} {item.unit} · avg {inr(item.avgRate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/reports/export/stock-ledger?item=${item.id}`} className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/10">
              <Download size={14} /> Ledger CSV
            </a>
            <a href="/inventory" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
              <ArrowLeft size={15} /> Stock summary
            </a>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          Ledger-derived balance: {moneyStr(ledgerStock)} {item.unit}
          {D(ledgerStock).minus(item.currentStock).abs().lt(0.01) ? " (matches cache ✓)" : " (MISMATCH — run reconciliation)"}
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0e1625]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Movement</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">In</th>
                <th className="px-3 py-3 font-medium">Out</th>
                <th className="px-3 py-3 font-medium">Balance</th>
                <th className="px-3 py-3 font-medium">Rate</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {item.stockMovements.map((m) => (
                <tr key={m.id} className="border-b border-white/[0.05] last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">{dateFmt.format(m.createdAt)}</td>
                  <td className="px-3 py-3 font-medium text-slate-300">{m.movementNumber}</td>
                  <td className="px-3 py-3 text-slate-400">{m.movementType.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="px-3 py-3 text-emerald-300">{Number(m.quantityIn) > 0 ? moneyStr(m.quantityIn) : ""}</td>
                  <td className="px-3 py-3 text-rose-300">{Number(m.quantityOut) > 0 ? moneyStr(m.quantityOut) : ""}</td>
                  <td className="px-3 py-3 text-slate-200">{moneyStr(m.balanceAfter)}</td>
                  <td className="px-3 py-3 text-slate-500">{m.rate ? inr(m.rate) : "—"}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{m.sourceDocType ?? "—"}{m.remarks ? ` · ${m.remarks}` : ""}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{m.user?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!item.stockMovements.length && <p className="p-8 text-center text-sm text-slate-500">No movements yet.</p>}
        </div>
      </div>
    </main>
  );
}
