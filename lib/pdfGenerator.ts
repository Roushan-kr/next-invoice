// lib/pdfGenerator.ts

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { IInvoice } from "./models/Invoice";
import { fmt, formatDate, numberToWords } from "./utils";

export async function generateInvoicePDF(invoice: IInvoice): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 28;
  const contentWidth = width - 2 * margin;

  // Convert top-down Y to PDF bottom-up Y
  const ty = (y: number) => height - y;

  // ── Safe clipped text draw ──
  const drawText = (
    text: string,
    x: number,
    y: number,
    size: number,
    fontRef = font,
    color = rgb(0, 0, 0),
    maxWidth?: number,
  ) => {
    if (!text) return;
    let str = text;
    if (maxWidth) {
      while (
        str.length > 1 &&
        fontRef.widthOfTextAtSize(str, size) > maxWidth
      ) {
        str = str.slice(0, -1);
      }
      if (str.length < text.length && str.length > 1)
        str = str.slice(0, -1) + "…";
    }
    page.drawText(str, { x, y: ty(y), size, font: fontRef, color });
  };

  const drawTextRight = (
    text: string,
    cellX: number,
    cellW: number,
    y: number,
    size: number,
    fontRef = font,
    color = rgb(0, 0, 0),
  ) => {
    if (!text) return;
    let str = text;
    while (str.length > 1 && fontRef.widthOfTextAtSize(str, size) > cellW - 4) {
      str = str.slice(0, -1);
    }
    const tw = fontRef.widthOfTextAtSize(str, size);
    page.drawText(str, {
      x: cellX + cellW - tw - 2,
      y: ty(y),
      size,
      font: fontRef,
      color,
    });
  };

  const drawTextCenter = (
    text: string,
    cellX: number,
    cellW: number,
    y: number,
    size: number,
    fontRef = font,
  ) => {
    if (!text) return;
    const tw = fontRef.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: cellX + (cellW - tw) / 2,
      y: ty(y),
      size,
      font: fontRef,
    });
  };

  const drawWrappedText = (
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    size: number,
    fontRef = font,
    color = rgb(0, 0, 0),
    lineGap = 3,
  ): number => {
    const words = (text || "").split(" ");
    let line = "";
    let y = startY;
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (fontRef.widthOfTextAtSize(test, size) > maxWidth && line) {
        page.drawText(line, { x, y: ty(y), size, font: fontRef, color });
        line = word;
        y += size + lineGap;
      } else {
        line = test;
      }
    }
    if (line) page.drawText(line, { x, y: ty(y), size, font: fontRef, color });
    return y + size + lineGap;
  };

  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fillColor?: ReturnType<typeof rgb>,
  ) => {
    page.drawRectangle({
      x,
      y: ty(y + h),
      width: w,
      height: h,
      ...(fillColor ? { color: fillColor } : {}),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
  };

  const hLine = (x: number, y: number, w: number) => {
    page.drawLine({
      start: { x, y: ty(y) },
      end: { x: x + w, y: ty(y) },
      thickness: 0.4,
      color: rgb(0.7, 0.7, 0.7),
    });
  };

  const vLine = (x: number, y: number, h: number) => {
    page.drawLine({
      start: { x, y: ty(y) },
      end: { x, y: ty(y + h) },
      thickness: 0.4,
      color: rgb(0.7, 0.7, 0.7),
    });
  };

  // ─────────────────────────────────────────────
  // HEADER TITLE
  // ─────────────────────────────────────────────
  drawTextCenter("INVOICE", margin, contentWidth, 36, 14, fontBold);

  // ─────────────────────────────────────────────
  // TOP INFO BOX
  // ─────────────────────────────────────────────
  const topY = 48;
  const leftW = contentWidth * 0.56;
  const rightW = contentWidth - leftW;
  const boxH = 108; // 3 rows × 36px each

  rect(margin, topY, leftW, boxH);
  rect(margin + leftW, topY, rightW, boxH);

  // LEFT: Company + Supplier
  let ly = topY + 12;
  drawText(
    invoice.companyName || "",
    margin + 5,
    ly,
    10,
    fontBold,
    rgb(0, 0, 0),
    leftW - 10,
  );
  ly += 13;
  drawWrappedText(invoice.companyAddr || "", margin + 5, ly, leftW - 10, 8);
  ly += 22;
  drawText(
    "Supplier (Bill from):",
    margin + 5,
    ly,
    8,
    font,
    rgb(0.3, 0.3, 0.3),
  );
  ly += 12;
  drawText(
    invoice.supplierName || "",
    margin + 5,
    ly,
    9,
    fontBold,
    rgb(0, 0, 0),
    leftW - 10,
  );
  ly += 12;
  drawWrappedText(
    [invoice.supplierAddr, invoice.supplierState].filter(Boolean).join(", "),
    margin + 5,
    ly,
    leftW - 10,
    8,
  );

  // ── RIGHT META GRID ──
  // 3 rows, each row has 2 sub-columns.
  // Each sub-cell: label on top line, bold value on bottom line.
  // This avoids any horizontal overflow between label and value.
  const rx = margin + leftW;
  const rPad = 5;
  const metaRowH = boxH / 3; // 36px per row
  const halfColW = rightW / 2;

  // Internal grid lines
  hLine(rx, topY + metaRowH, rightW);
  hLine(rx, topY + metaRowH * 2, rightW);
  vLine(rx + halfColW, topY, metaRowH);
  vLine(rx + halfColW, topY + metaRowH, metaRowH);
  vLine(rx + halfColW, topY + metaRowH * 2, metaRowH);

  // Auto-build Supplier Inv Ref: "<invNo> Dt. <DD-MMM-YY>"
  const buildSupplierInvRef = (): string => {
    if (invoice.supplierInvRef && invoice.supplierInvRef.trim()) {
      return invoice.supplierInvRef.trim();
    }
    const dateStr = formatDate(invoice.date); // "04-Apr-26"
    return `${invoice.invNo} Dt. ${dateStr}`;
  };

  // Draw label (small, grey) on top line and value (bold) on bottom line within each cell
  const drawMetaCell = (
    label: string,
    value: string,
    cellX: number,
    rowIndex: number,
  ) => {
    const rowStartY = topY + rowIndex * metaRowH;
    const labelY = rowStartY + 10; // top line
    const valueY = rowStartY + 23; // bottom line — plenty of vertical room
    const maxW = halfColW - rPad * 2;

    drawText(label, cellX + rPad, labelY, 7, font, rgb(0.35, 0.35, 0.35), maxW);
    drawText(value, cellX + rPad, valueY, 8.5, fontBold, rgb(0, 0, 0), maxW);
  };

  const metaRows: [string, string, string, string][] = [
    [
      "Invoice No.",
      String(invoice.invNo || ""),
      "Dated",
      formatDate(invoice.date),
    ],
    [
      "Supplier Inv No.",
      buildSupplierInvRef(),
      "Other Ref",
      String(invoice.otherRef || "—"),
    ],
    [
      "Troll No.",
      String(invoice.trollNo || "—"),
      "Kata Slip No.",
      String(invoice.kataSlipNo || "—"),
    ],
  ];

  metaRows.forEach(([l1, v1, l2, v2], i) => {
    drawMetaCell(l1, v1, rx, i); // left sub-cell
    drawMetaCell(l2, v2, rx + halfColW, i); // right sub-cell
  });

  // ─────────────────────────────────────────────
  // MAIN TABLE
  // ─────────────────────────────────────────────
  const tableTop = topY + boxH + 8;

  const cols: {
    label: string;
    width: number;
    align: "left" | "center" | "right";
  }[] = [
    { label: "SI\nNo.", width: 18, align: "center" },
    { label: "Description\nof Goods", width: 110, align: "left" },
    { label: "Bag", width: 32, align: "center" },
    { label: "Quantity", width: 52, align: "right" },
    { label: "Rate", width: 38, align: "right" },
    { label: "Net\nWeight", width: 52, align: "right" },
    { label: "Stand\n%", width: 28, align: "center" },
    { label: "Stand\nDed.", width: 38, align: "right" },
    { label: "Mois.\n%", width: 26, align: "center" },
    { label: "Mois.\nDed.", width: 36, align: "right" },
    { label: "Total", width: 48, align: "right" },
    { label: "Amount", width: 61, align: "right" },
  ];

  const headerH = 26;
  const dataRowH = 22;
  const dedRowH = 16;
  const totalRowH = 22;
  const headerGray = rgb(0.88, 0.88, 0.88);

  // Draw header
  let cx = margin;
  for (const col of cols) {
    rect(cx, tableTop, col.width, headerH, headerGray);
    const lines = col.label.split("\n");
    const lineH = 8;
    const totalTextH = lines.length * lineH + (lines.length - 1) * 2;
    let lineY = tableTop + (headerH - totalTextH) / 2 + 8;
    for (const line of lines) {
      drawTextCenter(line, cx, col.width, lineY, 7, fontBold);
      lineY += lineH + 2;
    }
    cx += col.width;
  }

  // Data row
  const qtyVal = parseFloat(String(invoice.quantity || 0));
  const rateVal = parseFloat(String(invoice.rate || 0));
  const nwVal = parseFloat(String(invoice.netWeight || qtyVal || 0));
  const fnqVal = parseFloat(String((invoice as any).finalNetQty || nwVal || 0));

  const rowValues = [
    "1",
    invoice.commodity || "",
    String(invoice.totalBags || ""),
    qtyVal.toLocaleString("en-IN"),
    rateVal.toFixed(2),
    nwVal.toLocaleString("en-IN"),
    String((invoice as any).standPercent || ""),
    String((invoice as any).standDedQty || ""),
    String((invoice as any).moisPercent || ""),
    String((invoice as any).moisDedQty || ""),
    fnqVal.toLocaleString("en-IN"),
    fmt(invoice.gross),
  ];

  let currentY = tableTop + headerH;
  cx = margin;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    rect(cx, currentY, col.width, dataRowH);
    const textY = currentY + dataRowH - 7;
    const pad = 3;
    if (col.align === "right") {
      drawTextRight(rowValues[i], cx, col.width, textY, 8);
    } else if (col.align === "center") {
      drawTextCenter(rowValues[i], cx, col.width, textY, 8);
    } else {
      drawText(
        rowValues[i],
        cx + pad,
        textY,
        8,
        font,
        rgb(0, 0, 0),
        col.width - pad * 2,
      );
    }
    cx += col.width;
  }
  currentY += dataRowH;

  // Deduction rows
  if (invoice.deductions && invoice.deductions.length > 0) {
    for (const d of invoice.deductions) {
      cx = margin;
      const dedData: (string | null)[] = [
        null,
        "Less: " + (d.desc || ""),
        d.bags != null ? String(d.bags) : null,
        null,
        d.rate != null ? String(d.rate) : null,
        null,
        null,
        null,
        null,
        null,
        null,
        "(-) " + fmt(d.amt),
      ];

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        rect(cx, currentY, col.width, dedRowH);
        const val = dedData[i];
        if (val) {
          const textY = currentY + dedRowH - 5;
          const pad = 3;
          if (i === 1) {
            drawText(
              val,
              cx + pad,
              textY,
              7.5,
              fontItalic,
              rgb(0.65, 0, 0),
              col.width - pad * 2,
            );
          } else if (i === 11) {
            drawTextRight(val, cx, col.width, textY, 7.5, font);
          } else if (col.align === "center") {
            drawTextCenter(val, cx, col.width, textY, 7.5);
          } else {
            drawTextRight(val, cx, col.width, textY, 7.5);
          }
        }
        cx += col.width;
      }
      currentY += dedRowH;
    }
  }

  // Total row
  const totalGreen = rgb(0.92, 0.97, 0.94);
  const totalValues: (string | null)[] = [
    null,
    "TOTAL",
    String(invoice.totalBags || ""),
    qtyVal.toLocaleString("en-IN"),
    null,
    nwVal.toLocaleString("en-IN"),
    null,
    null,
    null,
    null,
    fnqVal.toLocaleString("en-IN"),
    "Rs. " + fmt(invoice.netTotal),
  ];

  cx = margin;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    rect(cx, currentY, col.width, totalRowH, totalGreen);
    const val = totalValues[i];
    if (val) {
      const textY = currentY + totalRowH - 8;
      const pad = 3;
      const maxW = col.width - pad * 2;
      if (i === 1) {
        drawTextCenter(val, cx, col.width, textY, 8, fontBold);
      } else {
        let str = val;
        while (str.length > 1 && fontBold.widthOfTextAtSize(str, 8) > maxW) {
          str = str.slice(0, -1);
        }
        const tw = fontBold.widthOfTextAtSize(str, 8);
        page.drawText(str, {
          x: cx + col.width - tw - pad,
          y: ty(textY),
          size: 8,
          font: fontBold,
        });
      }
    }
    cx += col.width;
  }
  currentY += totalRowH;

  // ─────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────
  const footerY = currentY + 10;
  const footerH = 90;
  const footerCol1W = contentWidth * 0.62;
  const footerCol2W = contentWidth - footerCol1W;

  rect(margin, footerY, footerCol1W, footerH);
  rect(margin + footerCol1W, footerY, footerCol2W, footerH);

  let fY = footerY + 12;
  drawText("Amount Chargeable (in words)", margin + 5, fY, 8, fontBold);
  fY += 13;
  const amountWords =
    "INR " + numberToWords(Math.round(Math.max(0, invoice.netTotal)));
  fY = drawWrappedText(
    amountWords,
    margin + 5,
    fY,
    footerCol1W - 10,
    8,
    fontItalic,
  );

  fY += 8;
  drawText("Party Bank Details", margin + 5, fY, 8, fontBold);
  fY += 12;
  drawText(`Bank: ${invoice.bankName || "—"}`, margin + 5, fY, 7.5);
  fY += 11;
  drawText(`A/C No.: ${invoice.bankAc || "—"}`, margin + 5, fY, 7.5);
  fY += 11;
  drawText(`IFSC: ${invoice.bankIfsc || "—"}`, margin + 5, fY, 7.5);

  const sig2X = margin + footerCol1W;
  drawTextRight(
    `for ${invoice.supplierName || ""}`,
    sig2X,
    footerCol2W - 5,
    footerY + 14,
    7.5,
    font,
  );
  drawTextRight(
    "Authorised Signatory",
    sig2X,
    footerCol2W - 5,
    footerY + footerH - 10,
    8,
    font,
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
