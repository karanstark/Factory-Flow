// GST invoice generation.
//  - Sequential invoice number per financial year (INV-<fyStart>-000001).
//  - Intra-state: CGST + SGST (each gstRate/2). Inter-state: IGST (gstRate).
//  - Place of supply = customer state. Inter-state when customer.stateCode != seller.
//  - Posted invoices are never deleted; cancellations use credit notes (later).
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "@/lib/currency";
import { ORDER_STATUS, INVOICE_STATUS, SELLER } from "@/lib/constants";
import { computeGst, financialYear } from "@/lib/gst";
import { logAudit } from "./audit";

export async function generateInvoiceFromOrder(orderId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (order.status !== ORDER_STATUS.APPROVED) {
      throw new Error(`Order ${order.orderNumber} must be APPROVED before invoicing (current: ${order.status}).`);
    }

    const isInterState = order.customer.stateCode !== SELLER.stateCode;
    const invoiceDate = new Date();
    const fy = financialYear(invoiceDate);
    const fyStart = fy.split("-")[0];

    // Sequential number within the FY.
    const fyCount = await tx.invoice.count({ where: { financialYear: fy } });
    const invoiceNumber = `INV-${fyStart}-${String(fyCount + 1).padStart(6, "0")}`;

    let totalTaxable = new Decimal(0);
    let totalCgst = new Decimal(0);
    let totalSgst = new Decimal(0);
    let totalIgst = new Decimal(0);
    let grandTotal = new Decimal(0);

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        financialYear: fy,
        invoiceDate,
        customerId: order.customerId,
        salesOrderId: order.id,
        placeOfSupply: order.customer.state,
        isInterState,
        totalTaxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 0,
        status: INVOICE_STATUS.POSTED,
        createdBy: adminId,
      },
    });

    for (const it of order.items) {
      const taxable = round2(D(it.quantity).times(it.unitPrice));
      const gst = computeGst(taxable, it.product.gstRate, isInterState);
      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: it.productId,
          hsnCode: it.product.hsnCode,
          description: `${it.product.name} (${it.product.packSize})`,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxableValue: gst.taxableValue,
          gstRate: it.product.gstRate,
          cgst: gst.cgst,
          sgst: gst.sgst,
          igst: gst.igst,
          lineTotal: gst.total,
        },
      });
      totalTaxable = totalTaxable.plus(gst.taxableValue);
      totalCgst = totalCgst.plus(gst.cgst);
      totalSgst = totalSgst.plus(gst.sgst);
      totalIgst = totalIgst.plus(gst.igst);
      grandTotal = grandTotal.plus(gst.total);
    }

    totalTaxable = round2(totalTaxable);
    totalCgst = round2(totalCgst);
    totalSgst = round2(totalSgst);
    totalIgst = round2(totalIgst);
    grandTotal = round2(grandTotal);

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        totalTaxable,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalAmount: grandTotal,
      },
    });

    // Mark the order invoiced.
    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: ORDER_STATUS.INVOICED },
    });

    await logAudit(tx, {
      userId: adminId,
      action: "CREATE",
      entityType: "Invoice",
      entityId: invoice.id,
      newValue: { invoiceNumber, totalAmount: grandTotal.toFixed(2), interState: isInterState },
      remarks: `Invoice ${invoiceNumber} generated for order ${order.orderNumber}`,
    });

    return tx.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { items: { include: { product: true } }, customer: true, salesOrder: true },
    });
  });
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { product: true } },
      customer: true,
      salesOrder: { include: { items: true } },
      dispatches: { include: { items: true } },
      payments: true,
    },
  });
}

export async function listInvoices() {
  return prisma.invoice.findMany({
    include: { customer: true, items: true, payments: true, dispatches: true },
    orderBy: { invoiceDate: "desc" },
  });
}
