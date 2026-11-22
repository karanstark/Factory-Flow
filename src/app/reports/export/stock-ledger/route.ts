// Stock ledger CSV export — every StockMovement row (optionally one item via
// ?item=<id>), the audit-grade movement history.
import { prisma } from "@/lib/prisma";
import { requireReportAccess } from "@/lib/report-access";
import { toCsv, csvResponse } from "@/lib/csv";
import { moneyStr } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireReportAccess();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const itemId = new URL(req.url).searchParams.get("item");
  const movements = await prisma.stockMovement.findMany({
    where: itemId ? { itemId } : {},
    include: { item: true, user: { select: { name: true } } },
    orderBy: [{ createdAt: "asc" }, { movementNumber: "asc" }],
  });

  const rows = movements.map((m) => [
    m.movementNumber,
    m.createdAt.toISOString(),
    m.item.code,
    m.item.name,
    m.itemCategory,
    m.movementType,
    moneyStr(m.quantityIn),
    moneyStr(m.quantityOut),
    m.unit,
    moneyStr(m.balanceAfter),
    m.rate === null ? "" : moneyStr(m.rate),
    m.sourceDocType ?? "",
    m.sourceDocId ?? "",
    m.user?.name ?? "",
    m.remarks ?? "",
  ]);

  const csv = toCsv(
    [
      "Movement No", "Date", "Item Code", "Item", "Category", "Type", "Qty In",
      "Qty Out", "Unit", "Balance After", "Rate", "Source Doc", "Source ID",
      "User", "Remarks",
    ],
    rows,
  );
  return csvResponse(itemId ? `stock-ledger-${itemId}.csv` : "stock-ledger.csv", csv);
}
