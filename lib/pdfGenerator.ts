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

  // ── Clip-safe text draw: truncates text to fit within maxWidth ──
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
    }
    page.drawText(str, { x, y: ty(y), size, font: fontRef, color });
  };

  // Right-aligned text within a cell
  const drawTextRight = (
    text: string,
    cellX: number,
    cellWidth: number,
    y: number,
    size: number,
    fontRef = font,
    color = rgb(0, 0, 0),
  ) => {
    const tw = fontRef.widthOfTextAtSize(text, size);
    const x = cellX + cellWidth - tw - 2;
    page.drawText(text, { x, y: ty(y), size, font: fontRef, color });
  };

  // Center-aligned text within a cell
  const drawTextCenter = (
    text: string,
    cellX: number,
    cellWidth: number,
    y: number,
    size: number,
    fontRef = font,
  ) => {
    const tw = fontRef.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: cellX + (cellWidth - tw) / 2,
      y: ty(y),
      size,
      font: fontRef,
    });
  };

  // Wrapped text – returns new Y after last line
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

  // Draw a filled+bordered rectangle
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

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────
  drawTextCenter("INVOICE", margin, contentWidth, 36, 14, fontBold);

  // ─────────────────────────────────────────────
  // TOP INFO BOX
  // ─────────────────────────────────────────────
  const topY = 48;
  const leftW = contentWidth * 0.56;
  const rightW = contentWidth - leftW;
  const boxH = 100;

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

  // RIGHT: Meta grid — 2 columns, 4 rows
  const rx = margin + leftW;
  const rPad = 5;
  const labelW = 68;
  const valX1 = rx + rPad + labelW;
  const col2X = rx + rightW / 2;
  const col2ValX = col2X + labelW - 20;

  const metaRows: [string, string, string, string][] = [
    [
      "Invoice No.",
      String(invoice.invNo || ""),
      "Dated",
      formatDate(invoice.date),
    ],
    [
      "Supplier Inv No.",
      String(invoice.supplierInvRef || "—"),
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

  let ry = topY + 14;
  for (const [l1, v1, l2, v2] of metaRows) {
    drawText(l1 + ":", rx + rPad, ry, 7.5, font, rgb(0.3, 0.3, 0.3));
    drawText(
      v1,
      valX1,
      ry,
      8,
      fontBold,
      rgb(0, 0, 0),
      rightW / 2 - rPad - labelW - 2,
    );
    drawText(l2 + ":", col2X + rPad, ry, 7.5, font, rgb(0.3, 0.3, 0.3));
    drawText(
      v2,
      col2ValX + rPad + 2,
      ry,
      8,
      fontBold,
      rgb(0, 0, 0),
      rightW / 2 - rPad - labelW + 10,
    );
    ry += 26;
  }

  // ─────────────────────────────────────────────
  // MAIN TABLE
  // ─────────────────────────────────────────────
  const tableTop = topY + boxH + 8;

  // Column definitions: [label, width, align]
  // Total must equal contentWidth (539 for margin=28)
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

  // Data values
  const qtyVal = parseFloat(String(invoice.quantity || 0));
  const rateVal = parseFloat(String(invoice.rate || 0));
  const nwVal = parseFloat(String(invoice.netWeight || qtyVal || 0));
  const fnqVal = parseFloat(String(invoice.finalNetQty || nwVal || 0));

  const rowValues = [
    "1",
    invoice.commodity || "",
    String(invoice.totalBags || ""),
    qtyVal.toLocaleString("en-IN"),
    rateVal.toFixed(2),
    nwVal.toLocaleString("en-IN"),
    String(invoice.standPercent || ""),
    String(invoice.standDedQty || ""),
    String(invoice.moisPercent || ""),
    String(invoice.moisDedQty || ""),
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
      drawTextRight(rowValues[i], cx, col.width - pad, textY, 8);
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
            // Description: italic red, left-aligned, clipped
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
            // Amount: right-aligned
            drawTextRight(val, cx, col.width - pad, textY, 7.5, font);
          } else if (col.align === "center") {
            drawTextCenter(val, cx, col.width, textY, 7.5);
          } else {
            drawTextRight(val, cx, col.width - pad, textY, 7.5);
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
      const innerPad = 3;
      if (i === 1) {
        // "TOTAL" label — centred
        drawTextCenter(val, cx, col.width, textY, 8, fontBold);
      } else if (col.align === "right" || col.align === "center") {
        // Right-align numeric values, clipped to cell interior
        const maxW = col.width - innerPad * 2;
        const tw = fontBold.widthOfTextAtSize(val, 8);
        const x = cx + col.width - Math.min(tw, maxW) - innerPad;
        let str = val;
        while (str.length > 1 && fontBold.widthOfTextAtSize(str, 8) > maxW) {
          str = str.slice(0, -1);
        }
        page.drawText(str, { x, y: ty(textY), size: 8, font: fontBold });
      } else {
        drawTextCenter(val, cx, col.width, textY, 8, fontBold);
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

  // Left footer
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

  // Right footer: for + signatory
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
