// GST summary CSV export — per-invoice tax split for GSTR-style review.
import { prisma } from "@/lib/prisma";
import { requireReportAccess } from "@/lib/report-access";
import { toCsv, csvResponse } from "@/lib/csv";
import { moneyStr, D } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireReportAccess();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { customer: { select: { name: true, stateCode: true } } },
    orderBy: { invoiceDate: "asc" },
  });

  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.invoiceDate.toISOString().slice(0, 10),
    inv.financialYear,
    inv.customer.name,
    inv.customer.stateCode,
    inv.isInterState ? "Inter-state" : "Intra-state",
    moneyStr(inv.totalTaxable),
    moneyStr(inv.cgst),
    moneyStr(inv.sgst),
    moneyStr(inv.igst),
    moneyStr(inv.totalAmount),
  ]);

  const totals = invoices.reduce(
    (acc, inv) => ({
      taxable: acc.taxable.plus(inv.totalTaxable),
      cgst: acc.cgst.plus(inv.cgst),
      sgst: acc.sgst.plus(inv.sgst),
      igst: acc.igst.plus(inv.igst),
      total: acc.total.plus(inv.totalAmount),
    }),
    { taxable: D(0), cgst: D(0), sgst: D(0), igst: D(0), total: D(0) },
  );
  rows.push([
    "TOTAL", "", "", "", "", "",
    moneyStr(totals.taxable), moneyStr(totals.cgst), moneyStr(totals.sgst),
    moneyStr(totals.igst), moneyStr(totals.total),
  ]);

  const csv = toCsv(
    ["Invoice No", "Date", "FY", "Customer", "State Code", "Supply Type", "Taxable", "CGST", "SGST", "IGST", "Total"],
    rows,
  );
  return csvResponse("gst-summary.csv", csv);
}
