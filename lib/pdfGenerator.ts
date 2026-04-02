// lib/pdfGenerator.ts

import PDFDocument from "pdfkit";
import { IInvoice } from "./models/Invoice";
import { fmt, formatDate, numberToWords } from "./utils";

export async function generateInvoicePDF(invoice: IInvoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Layout Constants
      const pageWidth = doc.page.width;
      const margin = 30;
      const contentWidth = pageWidth - 2 * margin;

      // ─── Header ───
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("INVOICE", margin, 30, { align: "center", width: contentWidth });
      doc.moveDown(0.5);

      // ─── Top Info Box ───
      const topRowY = doc.y;
      const leftColWidth = contentWidth * 0.55;
      const rightColWidth = contentWidth * 0.45;
      const rowHeight = 90; // Increased to prevent overflow

      // Draw borders
      doc.rect(margin, topRowY, leftColWidth, rowHeight).stroke();
      doc
        .rect(margin + leftColWidth, topRowY, rightColWidth, rowHeight)
        .stroke();

      // Left Column: Bill From
      let ly = topRowY + 5;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(invoice.companyName || "", margin + 5, ly, {
          width: leftColWidth - 10,
        });
      ly += 14;
      doc
        .font("Helvetica")
        .fontSize(8)
        .text(invoice.companyAddr || "", margin + 5, ly, {
          width: leftColWidth - 10,
        });
      ly += 20;
      doc
        .font("Helvetica")
        .fontSize(8)
        .text("Supplier (Bill from):", margin + 5, ly);
      ly += 10;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(invoice.supplierName || "", margin + 5, ly);
      ly += 12;
      doc
        .font("Helvetica")
        .fontSize(8)
        .text(
          (invoice.supplierAddr || "") + ", " + (invoice.supplierState || ""),
          margin + 5,
          ly,
          { width: leftColWidth - 10 },
        );

      // Right Column: Meta Details
      let ry = topRowY + 5;
      const labelX = margin + leftColWidth + 5;
      const rightInnerWidth = rightColWidth - 10;
      const halfRight = rightInnerWidth / 2;

      doc.font("Helvetica").fontSize(8);

      // Row 1: Invoice No & Date
      doc.text("Invoice No.", labelX, ry);
      doc.font("Helvetica-Bold").text(invoice.invNo || "", labelX + 55, ry);
      doc.font("Helvetica").text("Dated", labelX + halfRight, ry);
      doc
        .font("Helvetica-Bold")
        .text(formatDate(invoice.date), labelX + halfRight + 30, ry);

      // Row 2: Supplier Inv & Other Ref
      ry += 18;
      doc.font("Helvetica").text("Supplier Inv No.", labelX, ry);
      doc.text(String(invoice.supplierInvRef || "—"), labelX, ry + 10);
      doc.text("Other Ref", labelX + halfRight, ry);
      doc.text(String(invoice.otherRef || "—"), labelX + halfRight, ry + 10);

      // Row 3: Troll No & Kata Slip
      ry += 28;
      doc.text("Troll No.", labelX, ry);
      doc
        .font("Helvetica-Bold")
        .text(String(invoice.trollNo || "—"), labelX + 55, ry);
      doc.font("Helvetica").text("Kata Slip", labelX + halfRight, ry);
      doc
        .font("Helvetica-Bold")
        .text(String(invoice.kataSlipNo || "—"), labelX + halfRight + 45, ry);

      // ─── Main Table ───
      const tableTop = topRowY + rowHeight + 10;
      const colWidths = [15, 85, 30, 45, 40, 45, 30, 40, 30, 40, 50, 70];
      const headers = [
        "SI",
        "Description",
        "Bag",
        "Qty",
        "Rate",
        "NetWt",
        "S%",
        "S-Ded",
        "M%",
        "M-Ded",
        "F-Net",
        "Amt",
      ];

      // Header row
      doc.font("Helvetica-Bold").fontSize(7);
      let currentX = margin;
      headers.forEach((h, i) => {
        doc
          .save()
          .rect(currentX, tableTop, colWidths[i], 15)
          .fill("#eeeeee")
          .restore();
        doc.rect(currentX, tableTop, colWidths[i], 15).stroke();
        doc.fillColor("#000000").text(h, currentX + 1, tableTop + 4, {
          width: colWidths[i] - 2,
          align: "center",
        });
        currentX += colWidths[i];
      });

      // Data row
      let currentY = tableTop + 15;
      doc.font("Helvetica").fontSize(8);

      const qtyVal = parseFloat(String(invoice.quantity || 0));
      const rateVal = parseFloat(String(invoice.rate || 0));
      const nwVal = parseFloat(String(invoice.netWeight || qtyVal || 0));
      const fnqVal = parseFloat(String(invoice.finalNetQty || nwVal || 0));

      const rowData = [
        "1",
        invoice.commodity || "",
        String(invoice.totalBags || ""),
        qtyVal.toLocaleString("en-IN"),
        rateVal.toFixed(2),
        nwVal.toLocaleString("en-IN"),
        String(invoice.standPercent || 0),
        String(invoice.standDedQty || 0),
        String(invoice.moisPercent || 0),
        String(invoice.moisDedQty || 0),
        fnqVal.toLocaleString("en-IN"),
        fmt(invoice.gross),
      ];

      currentX = margin;
      rowData.forEach((data, i) => {
        doc.rect(currentX, currentY, colWidths[i], 20).stroke();
        doc.fillColor("#000000").text(data, currentX + 2, currentY + 6, {
          width: colWidths[i] - 4,
          align: i > 1 ? "right" : "left",
        });
        currentX += colWidths[i];
      });
      currentY += 20;

      // Deduction Rows
      if (invoice.deductions && invoice.deductions.length > 0) {
        invoice.deductions.forEach((d) => {
          currentX = margin;
          const dData = [
            "",
            "  Less: " + d.desc,
            String(d.bags || ""),
            "",
            String(d.rate || ""),
            "",
            "",
            "",
            "",
            "",
            "",
            "(-) " + fmt(d.amt),
          ];
          dData.forEach((data, i) => {
            doc.rect(currentX, currentY, colWidths[i], 15).stroke();
            if (i === 1) {
              doc.font("Helvetica-Oblique").fillColor("#aa0000");
            }
            doc.text(data, currentX + 2, currentY + 4, {
              width: colWidths[i] - 4,
              align: i === 1 ? "left" : "right",
            });
            doc.fillColor("#000000").font("Helvetica");
            currentX += colWidths[i];
          });
          currentY += 15;
        });
      }

      // Total Row
      currentX = margin;
      const totalData = [
        "",
        "TOTAL",
        String(invoice.totalBags || ""),
        qtyVal.toLocaleString("en-IN"),
        "",
        "",
        "",
        "",
        "",
        "",
        fnqVal.toLocaleString("en-IN"),
        "Rs. " + fmt(invoice.netTotal),
      ];
      totalData.forEach((data, i) => {
        doc
          .save()
          .rect(currentX, currentY, colWidths[i], 20)
          .fill("#f0f8f4")
          .restore();
        doc.rect(currentX, currentY, colWidths[i], 20).stroke();
        doc
          .fillColor("#000000")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(data, currentX + 2, currentY + 6, {
            width: colWidths[i] - 4,
            align: i > 1 ? "right" : i === 1 ? "center" : "left",
          });
        currentX += colWidths[i];
      });
      currentY += 20;

      // ─── Footer ───
      const footerY = currentY + 15;
      const footerCol1Width = contentWidth * 0.6;
      const footerCol2Width = contentWidth * 0.4;

      doc.rect(margin, footerY, footerCol1Width, 80).stroke();
      doc.rect(margin + footerCol1Width, footerY, footerCol2Width, 80).stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("Amount Chargeable (in words)", margin + 5, footerY + 5);
      doc
        .font("Helvetica-Oblique")
        .text(
          "INR " + numberToWords(Math.round(Math.max(0, invoice.netTotal))),
          margin + 5,
          footerY + 18,
          { width: footerCol1Width - 10 },
        );

      doc
        .font("Helvetica-Bold")
        .text("Party Bank Details", margin + 5, footerY + 38);
      doc
        .font("Helvetica")
        .fontSize(7)
        .text(`Bank: ${invoice.bankName || "—"}`, margin + 5, footerY + 50);
      doc.text(`A/C No.: ${invoice.bankAc || "—"}`, margin + 5, footerY + 60);
      doc.text(`IFSC: ${invoice.bankIfsc || "—"}`, margin + 5, footerY + 70);

      // Signature
      const sigX = margin + footerCol1Width + 5;
      doc
        .font("Helvetica")
        .fontSize(7)
        .text(`for ${invoice.supplierName || ""}`, sigX, footerY + 5, {
          align: "right",
          width: footerCol2Width - 10,
        });
      doc.fontSize(8).text("Authorised Signatory", sigX, footerY + 65, {
        align: "right",
        width: footerCol2Width - 10,
      });

      // Finalize
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
