// Stock report CSV export — stock position + weighted-average valuation.
import { prisma } from "@/lib/prisma";
import { requireReportAccess } from "@/lib/report-access";
import { toCsv, csvResponse } from "@/lib/csv";
import { D, moneyStr } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireReportAccess();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const rows = items.map((it) => [
    it.code,
    it.name,
    it.sku,
    it.category,
    it.unit,
    moneyStr(it.currentStock),
    it.reorderLevel === null ? "" : moneyStr(it.reorderLevel),
    moneyStr(it.avgRate),
    moneyStr(D(it.currentStock).times(it.avgRate)),
  ]);

  const csv = toCsv(
    ["Code", "Item", "SKU", "Category", "Unit", "Stock", "Reorder Level", "Avg Rate", "Stock Value"],
    rows,
  );
  return csvResponse("stock-report.csv", csv);
}
