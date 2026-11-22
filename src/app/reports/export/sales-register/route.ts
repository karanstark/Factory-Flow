// Sales register CSV export — one row per invoice (posted + cancelled shown
// with status so the register is complete for audit).
import { prisma } from "@/lib/prisma";
import { requireReportAccess } from "@/lib/report-access";
import { toCsv, csvResponse } from "@/lib/csv";
import { moneyStr } from "@/lib/currency";
import { D } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireReportAccess();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const invoices = await prisma.invoice.findMany({
    include: { customer: true, payments: true },
    orderBy: [{ invoiceDate: "asc" }, { invoiceNumber: "asc" }],
  });

  const rows = invoices.map((inv) => {
    const paid = inv.payments.reduce((s, p) => s.plus(p.amount), D(0));
    const balance = D(inv.totalAmount).minus(paid);
    return [
      inv.invoiceNumber,
      inv.invoiceDate.toISOString().slice(0, 10),
      inv.financialYear,
      inv.customer.code,
      inv.customer.name,
      inv.customer.gstin ?? "",
      inv.customer.state,
      inv.placeOfSupply,
      inv.isInterState ? "Yes" : "No",
      moneyStr(inv.totalTaxable),
      moneyStr(inv.cgst),
      moneyStr(inv.sgst),
      moneyStr(inv.igst),
      moneyStr(inv.totalAmount),
      moneyStr(paid),
      inv.status === "CANCELLED" ? "0.00" : moneyStr(balance),
      inv.status,
    ];
  });

  const csv = toCsv(
    [
      "Invoice No", "Date", "FY", "Customer Code", "Customer", "GSTIN", "State",
      "Place of Supply", "Inter-state", "Taxable", "CGST", "SGST", "IGST",
      "Total", "Paid", "Balance", "Status",
    ],
    rows,
  );
  return csvResponse("sales-register.csv", csv);
}
