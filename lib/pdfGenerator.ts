// lib/pdfGenerator.ts

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { IInvoice } from "./models/Invoice";
import { fmt, formatDate, numberToWords } from "./utils";

export async function generateInvoicePDF(invoice: IInvoice): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size in points
  const { width, height } = page.getSize();
  const margin = 30;
  const contentWidth = width - 2 * margin;

  // Helper to convert top-down Y to bottom-up PDF Y
  const ty = (y: number) => height - y;

  // Helper for text alignment
  const drawCenteredText = (text: string, y: number, fontSize: number, fontRef = fontBold) => {
    const textWidth = fontRef.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: margin + (contentWidth - textWidth) / 2,
      y: ty(y),
      size: fontSize,
      font: fontRef,
    });
  };

  // Helper for wrapped text
  const drawWrappedText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    fontRef = font,
    color = rgb(0, 0, 0)
  ) => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const testWidth = fontRef.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && line) {
        page.drawText(line, { x, y: ty(currentY), size: fontSize, font: fontRef, color });
        line = word;
        currentY += fontSize + 2;
      } else {
        line = testLine;
      }
    }
    page.drawText(line, { x, y: ty(currentY), size: fontSize, font: fontRef, color });
    return currentY + fontSize + 2;
  };

  // ─── Header ───
  drawCenteredText("INVOICE", 45, 16, fontBold);

  // ─── Top Info Box ───
  const topRowY = 70;
  const leftColWidth = contentWidth * 0.55;
  const rightColWidth = contentWidth * 0.45;
  const rowHeight = 90;

  // Draw borders for top info box
  page.drawRectangle({
    x: margin,
    y: ty(topRowY + rowHeight),
    width: leftColWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + leftColWidth,
    y: ty(topRowY + rowHeight),
    width: rightColWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Left Column: Bill From
  let ly = topRowY + 15;
  page.drawText(invoice.companyName || "", {
    x: margin + 5,
    y: ty(ly),
    size: 10,
    font: fontBold,
  });
  ly += 14;
  
  // Custom wrap for company address
  drawWrappedText(invoice.companyAddr || "", margin + 5, ly, leftColWidth - 10, 8, font);
  
  ly += 25;
  page.drawText("Supplier (Bill from):", {
    x: margin + 5,
    y: ty(ly),
    size: 8,
    font: font,
  });
  ly += 12;
  page.drawText(invoice.supplierName || "", {
    x: margin + 5,
    y: ty(ly),
    size: 9,
    font: fontBold,
  });
  ly += 12;
  drawWrappedText(
    (invoice.supplierAddr || "") + ", " + (invoice.supplierState || ""),
    margin + 5,
    ly,
    leftColWidth - 10,
    8,
    font
  );

  // Right Column: Meta Details
  let ry = topRowY + 15;
  const labelX = margin + leftColWidth + 5;
  const rightInnerWidth = rightColWidth - 10;
  const halfRight = rightInnerWidth / 2;

  // Row 1: Invoice No & Date
  page.drawText("Invoice No.", { x: labelX, y: ty(ry), size: 8, font });
  page.drawText(invoice.invNo || "", { x: labelX + 55, y: ty(ry), size: 8, font: fontBold });
  page.drawText("Dated", { x: labelX + halfRight, y: ty(ry), size: 8, font });
  page.drawText(formatDate(invoice.date), { x: labelX + halfRight + 30, y: ty(ry), size: 8, font: fontBold });

  // Row 2: Supplier Inv & Other Ref
  ry += 20;
  page.drawText("Supplier Inv No.", { x: labelX, y: ty(ry), size: 8, font });
  page.drawText(String(invoice.supplierInvRef || "—"), { x: labelX, y: ty(ry + 10), size: 8, font });
  page.drawText("Other Ref", { x: labelX + halfRight, y: ty(ry), size: 8, font });
  page.drawText(String(invoice.otherRef || "—"), { x: labelX + halfRight, y: ty(ry + 10), size: 8, font });

  // Row 3: Troll No & Kata Slip
  ry += 30;
  page.drawText("Troll No.", { x: labelX, y: ty(ry), size: 8, font });
  page.drawText(String(invoice.trollNo || "—"), { x: labelX + 55, y: ty(ry), size: 8, font: fontBold });
  page.drawText("Kata Slip", { x: labelX + halfRight, y: ty(ry), size: 8, font });
  page.drawText(String(invoice.kataSlipNo || "—"), { x: labelX + halfRight + 45, y: ty(ry), size: 8, font: fontBold });

  // ─── Main Table ───
  const tableTop = topRowY + rowHeight + 10;
  const colWidths = [15, 85, 30, 45, 40, 45, 30, 40, 30, 40, 50, 70];
  const headers = [
    "SI", "Description", "Bag", "Qty", "Rate", "NetWt", "S%", "S-Ded", "M%", "M-Ded", "F-Net", "Amt",
  ];

  // Header row
  let currentX = margin;
  headers.forEach((h, i) => {
    page.drawRectangle({
      x: currentX,
      y: ty(tableTop + 15),
      width: colWidths[i],
      height: 15,
      color: rgb(0.93, 0.93, 0.93), // #eeeeee
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    const textWidth = fontBold.widthOfTextAtSize(h, 7);
    page.drawText(h, {
      x: currentX + (colWidths[i] - textWidth) / 2,
      y: ty(tableTop + 10),
      size: 7,
      font: fontBold,
    });
    currentX += colWidths[i];
  });

  // Data row
  let currentY = tableTop + 15;
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
    page.drawRectangle({
      x: currentX,
      y: ty(currentY + 20),
      width: colWidths[i],
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    const alignRight = i > 1;
    const textWidth = font.widthOfTextAtSize(data, 8);
    page.drawText(data, {
      x: alignRight ? currentX + colWidths[i] - textWidth - 2 : currentX + 2,
      y: ty(currentY + 13),
      size: 8,
      font,
    });
    currentX += colWidths[i];
  });
  currentY += 20;

  // Deduction Rows
  if (invoice.deductions && invoice.deductions.length > 0) {
    invoice.deductions.forEach((d) => {
      currentX = margin;
      const dData = [
        "", "  Less: " + d.desc, String(d.bags || ""), "", String(d.rate || ""), "", "", "", "", "", "", "(-) " + fmt(d.amt),
      ];
      dData.forEach((data, i) => {
        page.drawRectangle({
          x: currentX,
          y: ty(currentY + 15),
          width: colWidths[i],
          height: 15,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        const useItalic = i === 1;
        const currentFont = useItalic ? fontItalic : font;
        const color = useItalic ? rgb(0.66, 0, 0) : rgb(0, 0, 0); // #aa0000
        const textWidth = currentFont.widthOfTextAtSize(data, 8);
        page.drawText(data, {
          x: i === 1 ? currentX + 2 : currentX + colWidths[i] - textWidth - 2,
          y: ty(currentY + 10),
          size: 8,
          font: currentFont,
          color,
        });
        currentX += colWidths[i];
      });
      currentY += 15;
    });
  }

  // Total Row
  currentX = margin;
  const totalData = [
    "", "TOTAL", String(invoice.totalBags || ""), qtyVal.toLocaleString("en-IN"), "", "", "", "", "", "", fnqVal.toLocaleString("en-IN"), "Rs. " + fmt(invoice.netTotal),
  ];
  totalData.forEach((data, i) => {
    page.drawRectangle({
      x: currentX,
      y: ty(currentY + 20),
      width: colWidths[i],
      height: 20,
      color: rgb(0.94, 0.97, 0.96), // #f0f8f4
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    const textWidth = fontBold.widthOfTextAtSize(data, 8);
    let drawX = currentX + 2;
    if (i > 1) drawX = currentX + colWidths[i] - textWidth - 2;
    else if (i === 1) drawX = currentX + (colWidths[i] - textWidth) / 2;

    page.drawText(data, {
      x: drawX,
      y: ty(currentY + 13),
      size: 8,
      font: fontBold,
    });
    currentX += colWidths[i];
  });
  currentY += 20;

  // ─── Footer ───
  let footerY = currentY + 15;
  const footerCol1Width = contentWidth * 0.6;
  const footerCol2Width = contentWidth * 0.4;

  page.drawRectangle({
    x: margin,
    y: ty(footerY + 80),
    width: footerCol1Width,
    height: 80,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + footerCol1Width,
    y: ty(footerY + 80),
    width: footerCol2Width,
    height: 80,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawText("Amount Chargeable (in words)", { x: margin + 5, y: ty(footerY + 15), size: 8, font: fontBold });
  
  const amountWords = "INR " + numberToWords(Math.round(Math.max(0, invoice.netTotal)));
  drawWrappedText(amountWords, margin + 5, footerY + 28, footerCol1Width - 10, 8, fontItalic);

  page.drawText("Party Bank Details", { x: margin + 5, y: ty(footerY + 48), size: 8, font: fontBold });
  page.drawText(`Bank: ${invoice.bankName || "—"}`, { x: margin + 5, y: ty(footerY + 58), size: 7, font });
  page.drawText(`A/C No.: ${invoice.bankAc || "—"}`, { x: margin + 5, y: ty(footerY + 68), size: 7, font });
  page.drawText(`IFSC: ${invoice.bankIfsc || "—"}`, { x: margin + 5, y: ty(footerY + 78), size: 7, font });

  // Signature
  const sigX = margin + footerCol1Width + 5;
  const forText = `for ${invoice.supplierName || ""}`;
  const forWidth = font.widthOfTextAtSize(forText, 7);
  page.drawText(forText, { x: margin + contentWidth - forWidth - 5, y: ty(footerY + 15), size: 7, font });
  
  const authText = "Authorised Signatory";
  const authWidth = font.widthOfTextAtSize(authText, 8);
  page.drawText(authText, { x: margin + contentWidth - authWidth - 5, y: ty(footerY + 75), size: 8, font });

  // Finalize
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
