import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ROLES, ITEM_CATEGORY } from "@/lib/constants";
import { inr, moneyStr, D } from "@/lib/currency";
import { ArrowLeft, Download, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CATS = [
  ["ALL", "All items"],
  [ITEM_CATEGORY.RAW_MATERIAL, "Raw materials"],
  [ITEM_CATEGORY.PACKAGING, "Packaging"],
  [ITEM_CATEGORY.FINISHED_GOOD, "Finished goods"],
] as const;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const user = await requireRole(ROLES.ADMIN, ROLES.PRODUCTION, ROLES.OWNER, ROLES.ACCOUNTANT);
  if (!user) redirect("/login");
  const { cat } = await searchParams;
  const category = CATS.some(([c]) => c === cat) ? cat! : "ALL";

  const items = await prisma.inventoryItem.findMany({
    where: { active: true, ...(category !== "ALL" ? { category } : {}) },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Stock summary</h1>
            <p className="mt-1 text-sm text-slate-500">Balances are derived from the stock ledger (cached + reconcilable).</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/reports/export/stock-report" className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/10">
              <Download size={14} /> Export CSV
            </a>
            <a href={user.role === "PRODUCTION" ? "/production/dashboard" : user.role === "ACCOUNTANT" ? "/reports" : "/admin/dashboard"} className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
              <ArrowLeft size={15} /> Back
            </a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATS.map(([c, label]) => (
            <a key={c} href={`/inventory?cat=${c}`} className={`rounded-full px-3 py-1.5 text-xs font-medium ${category === c ? "bg-emerald-400/15 text-emerald-300" : "border border-white/10 text-slate-400 hover:text-white"}`}>{label}</a>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0e1625]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Unit</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Reorder</th>
                <th className="px-3 py-3 font-medium">Avg rate</th>
                <th className="px-3 py-3 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const low = it.reorderLevel !== null && D(it.currentStock).lte(it.reorderLevel);
                return (
                  <tr key={it.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-5 py-3">
                      <a href={`/inventory/${it.id}`} className="font-medium text-slate-200 hover:text-emerald-300 hover:underline">{it.name}</a>
                      <p className="text-[11px] text-slate-600">{it.code} · {it.sku}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{it.category.replaceAll("_", " ").toLowerCase()}</td>
                    <td className="px-3 py-3 text-slate-400">{it.unit}</td>
                    <td className={`px-3 py-3 font-medium ${low ? "text-amber-300" : "text-slate-200"}`}>
                      {moneyStr(it.currentStock)} {it.unit}
                      {low && <TriangleAlert size={12} className="ml-1.5 inline text-amber-400" />}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{it.reorderLevel !== null ? moneyStr(it.reorderLevel) : "—"}</td>
                    <td className="px-3 py-3 text-slate-400">{inr(it.avgRate)}</td>
                    <td className="px-3 py-3 text-right text-slate-200">{inr(D(it.currentStock).times(it.avgRate))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length && <p className="p-8 text-center text-sm text-slate-500">No items in this category.</p>}
        </div>
      </div>
    </main>
  );
}
