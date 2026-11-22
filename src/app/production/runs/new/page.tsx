import { getProductionProducts } from "../actions";
import NewRunForm from "../new-run-form";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewRunPage() {
  const { user, boms } = await getProductionProducts();
  if (!["PRODUCTION", "ADMIN", "OWNER"].includes(user.role)) redirect("/dashboard");

  const opts = boms.map((b) => ({
    id: b.id,
    productId: b.productId,
    productName: b.product.name,
    expectedYield: b.expectedYield.toString(),
    yieldUnit: b.expectedYieldUnit,
    fgStock: `${b.product.inventoryItem.currentStock.toString()} ${b.product.unit}`,
  }));

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <a href="/production/dashboard" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
          <ArrowLeft size={15} /> Production dashboard
        </a>
        <div className="mt-4">
          {opts.length ? <NewRunForm boms={opts} /> : (
            <p className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-slate-500">
              No active BOMs — create one under Admin → Masters first.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
