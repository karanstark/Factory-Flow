// GST invoice PDF — downloadable from the invoices list.
// Uses pdfkit (pure JS, no native deps) so it works in the Node runtime.
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { SELLER } from "@/lib/constants";
import { moneyStr, inr } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function buildPdf(invoice: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const right = 552;

    // --- Seller block ---
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827").text(SELLER.name, 48, 48);
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text(SELLER.address);
    doc.text(`GSTIN: ${SELLER.gstin}   State: ${SELLER.state} (${SELLER.stateCode})`);

    // --- Invoice title ---
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#065f46").text("TAX INVOICE", 0, 48, { align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, { align: "right" });
    doc.text(`Date: ${dateFmt.format(invoice.invoiceDate)}`, { align: "right" });
    doc.text(`Financial Year: ${invoice.financialYear}`, { align: "right" });
    doc.text(`Place of Supply: ${invoice.placeOfSupply}${invoice.isInterState ? " (Inter-state)" : " (Intra-state)"}`, { align: "right" });
    if (invoice.status === "CANCELLED") {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#b91c1c").text("CANCELLED", { align: "right" });
    }

    // --- Bill to ---
    let y = 150;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("Bill To:", 48, y);
    doc.font("Helvetica").fontSize(10).fillColor("#111827");
    doc.text(invoice.customer.name, 48, y + 14);
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    if (invoice.customer.address) doc.text(invoice.customer.address, 48, doc.y);
    doc.text(
      [invoice.customer.gstin ? `GSTIN: ${invoice.customer.gstin}` : null, `State: ${invoice.customer.state} (${invoice.customer.stateCode})`]
        .filter(Boolean)
        .join("   "),
      48,
      doc.y,
    );
    if (invoice.salesOrder) {
      doc.text(`Against Order: ${invoice.salesOrder.orderNumber}`, 48, doc.y);
    }

    // --- Items table ---
    y = Math.max(doc.y + 12, 240);
    const cols = { hsn: 48, desc: 110, qty: 340, rate: 390, taxable: 445, gst: 490, total: right };
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    doc.rect(48, y, right - 48, 18).fill("#111827");
    doc.fillColor("#ffffff");
    doc.text("HSN", cols.hsn + 4, y + 5);
    doc.text("Description", cols.desc + 4, y + 5);
    doc.text("Qty", cols.qty + 4, y + 5);
    doc.text("Rate", cols.rate + 4, y + 5);
    doc.text("Taxable", cols.taxable + 4, y + 5);
    doc.text("GST%", cols.gst + 4, y + 5);
    doc.text("Amount", cols.total - 60, y + 5, { width: 60, align: "right" });

    y += 18;
    doc.font("Helvetica").fontSize(9).fillColor("#111827");
    for (const item of invoice.items) {
      const rowH = 18;
      if (y > 760) {
        doc.addPage();
        y = 60;
      }
      doc.text(item.hsnCode, cols.hsn + 4, y + 4, { width: 55 });
      doc.text(item.description, cols.desc + 4, y + 4, { width: 225 });
      doc.text(moneyStr(item.quantity), cols.qty + 4, y + 4, { width: 45, align: "right" });
      doc.text(moneyStr(item.unitPrice), cols.rate + 4, y + 4, { width: 50, align: "right" });
      doc.text(moneyStr(item.taxableValue), cols.taxable + 4, y + 4, { width: 42, align: "right" });
      doc.text(moneyStr(item.gstRate), cols.gst + 4, y + 4, { width: 28, align: "right" });
      doc.text(moneyStr(item.lineTotal), cols.total - 60, y + 4, { width: 60, align: "right" });
      y += rowH;
      doc.moveTo(48, y).lineTo(right, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    }

    // --- Totals ---
    y += 10;
    const totalsX = 380;
    const row = (label: string, value: string, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 9).fillColor("#111827");
      doc.text(label, totalsX, y, { width: 90, align: "right" });
      doc.text(value, totalsX + 95, y, { width: 70, align: "right" });
      y += bold ? 18 : 15;
    };
    row("Taxable Value", moneyStr(invoice.totalTaxable));
    if (Number(invoice.cgst) > 0) row("CGST", moneyStr(invoice.cgst));
    if (Number(invoice.sgst) > 0) row("SGST", moneyStr(invoice.sgst));
    if (Number(invoice.igst) > 0) row("IGST", moneyStr(invoice.igst));
    row("Grand Total", inr(invoice.totalAmount), true);

    // --- Payments summary ---
    y += 8;
    const paid = invoice.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const balance = Number(invoice.totalAmount) - paid;
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text(
      `Paid: ${inr(paid)}    Balance Due: ${inr(Math.max(0, balance))}    Status: ${invoice.status}`,
      48,
      y,
    );

    // --- Footer on every page ---
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font("Helvetica").fontSize(8).fillColor("#9ca3af");
      doc.text(
        "Computer generated GST invoice - FactoryFlow demo. Verify totals before use.",
        48,
        800,
        { align: "center", width: right - 48 },
      );
    }

    doc.end();
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      customer: true,
      salesOrder: true,
      payments: true,
    },
  });
  if (!invoice) return new Response("Not found", { status: 404 });

  const pdf = await buildPdf(invoice);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
