import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function AuditPage() {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  if (!user) redirect("/login");

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Audit trail</h1>
            <p className="mt-1 text-sm text-slate-500">Every business event with user and timestamp.</p>
          </div>
          <a href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
            <ArrowLeft size={15} /> Dashboard
          </a>
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0e1625]">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-3 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Action</th>
                <th className="px-3 py-3 font-medium">Entity</th>
                <th className="px-3 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-white/[0.05] last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">{dateFmt.format(l.createdAt)}</td>
                  <td className="px-3 py-3 text-slate-300">{l.user?.name ?? "system"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      l.action === "CANCEL" || l.action === "REJECT" || l.action === "REVERSE"
                        ? "bg-rose-400/10 text-rose-300"
                        : l.action === "APPROVE" || l.action === "POST"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-sky-400/10 text-sky-300"
                    }`}>{l.action}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-400">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{l.remarks ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <p className="p-8 text-center text-sm text-slate-500">No audit events yet.</p>}
        </div>
      </div>
    </main>
  );
}
