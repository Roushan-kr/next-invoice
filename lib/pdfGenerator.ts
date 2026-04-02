import PDFDocument from 'pdfkit';
import { IInvoice } from './models/Invoice';
import { fmt, formatDate, numberToWords } from './utils';

export async function generateInvoicePDF(invoice: IInvoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Layout Constants
    const pageWidth = doc.page.width;
    const margin = 30;
    const contentWidth = pageWidth - 2 * margin;

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    // Company & Meta Info Box (Bordered)
    const topRowY = doc.y;
    const leftColWidth = contentWidth * 0.55;
    const rightColWidth = contentWidth * 0.45;
    const rowHeight = 70;

    doc.rect(margin, topRowY, leftColWidth, rowHeight).stroke();
    doc.rect(margin + leftColWidth, topRowY, rightColWidth, rowHeight).stroke();

    // Left Column: Bill From
    doc.font('Helvetica-Bold').fontSize(10).text(invoice.companyName || '', margin + 5, topRowY + 5);
    doc.font('Helvetica').fontSize(8).text(invoice.companyAddr || '', margin + 5, topRowY + 18, { width: leftColWidth - 10 });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8).text('Supplier (Bill from):', margin + 5, doc.y);
    doc.font('Helvetica-Bold').fontSize(9).text(invoice.supplierName || '', margin + 5, doc.y);
    doc.font('Helvetica').fontSize(8).text((invoice.supplierAddr || '') + ', ' + (invoice.supplierState || ''), margin + 5, doc.y);

    // Right Column: Meta Details
    let ry = topRowY + 5;
    const labelX = margin + leftColWidth + 5;
    const valueX = labelX + 60;
    const valueX2 = valueX + 50;

    doc.font('Helvetica').fontSize(8);
    doc.text('Invoice No.', labelX, ry);
    doc.font('Helvetica-Bold').text(invoice.invNo || '', valueX, ry);
    doc.font('Helvetica').text('Dated', valueX2, ry);
    doc.font('Helvetica-Bold').text(formatDate(invoice.date), valueX2 + 30, ry);
    
    ry += 12;
    doc.font('Helvetica').text('Supplier Inv No.', labelX, ry);
    doc.text(String(invoice.supplierInvRef || '—'), labelX, ry + 10);
    doc.text('Other Reference', valueX2, ry);
    doc.text(String(invoice.otherRef || '—'), valueX2, ry + 10);

    ry += 24;
    doc.text('Troll No.', labelX, ry);
    doc.font('Helvetica-Bold').text(String(invoice.trollNo || '—'), valueX, ry);
    doc.font('Helvetica').text('Kata Slip', valueX2, ry);
    doc.font('Helvetica-Bold').text(String(invoice.kataSlipNo || '—'), valueX2 + 30, ry);

    doc.y = topRowY + rowHeight;
    doc.moveDown(0.5);

    // Main Table
    const tableTop = doc.y;
    const colWidths = [15, 85, 30, 45, 40, 45, 30, 40, 30, 40, 50, 70];
    const headers = ['SI', 'Description', 'Bag', 'Qty', 'Rate', 'NetWt', 'S%', 'S-Ded', 'M%', 'M-Ded', 'F-Net', 'Amt'];
    
    // Header row
    doc.font('Helvetica-Bold').fontSize(8);
    let currentX = margin;
    headers.forEach((h, i) => {
      doc.rect(currentX, tableTop, colWidths[i], 15).fillAndStroke('#eeeeee', '#000000');
      doc.fillColor('#000000').text(h, currentX, tableTop + 4, { width: colWidths[i], align: 'center' });
      currentX += colWidths[i];
    });

    // Content row
    let currentY = tableTop + 15;
    doc.font('Helvetica').fontSize(8);
    
    const qtyVal = parseFloat(String(invoice.quantity || 0));
    const rateVal = parseFloat(String(invoice.rate || 0));
    const nwVal = parseFloat(String(invoice.netWeight || qtyVal || 0));
    const fnqVal = parseFloat(String(invoice.finalNetQty || nwVal || 0));
    
    const qtyStr = qtyVal.toLocaleString('en-IN');
    const rateStr = rateVal.toFixed(2);
    const nwStr = nwVal.toLocaleString('en-IN');
    const fnqStr = fnqVal.toLocaleString('en-IN');
    const grossStr = fmt(invoice.gross);

    const rowData = [
      '1', 
      invoice.commodity, 
      String(invoice.totalBags), 
      qtyStr, 
      rateStr, 
      nwStr, 
      String(invoice.standPercent || 0),
      String(invoice.standDedQty || 0), 
      String(invoice.moisPercent || 0),
      String(invoice.moisDedQty || 0),
      fnqStr,
      grossStr
    ];

    currentX = margin;
    rowData.forEach((data, i) => {
      doc.rect(currentX, currentY, colWidths[i], 20).stroke();
      doc.text(data, currentX + 2, currentY + 6, { width: colWidths[i] - 4, align: i > 1 ? 'right' : 'left' });
      currentX += colWidths[i];
    });
    currentY += 20;

    // Deduction Rows
    invoice.deductions.forEach(d => {
      currentX = margin;
      const dData = ['', '  Less: ' + d.desc, String(d.bags), '', String(d.rate), '', '', '', '', '', '', '(-) ' + fmt(d.amt)];
      dData.forEach((data, i) => {
        doc.rect(currentX, currentY, colWidths[i], 15).stroke();
        if (i === 1) doc.font('Helvetica-Oblique').fillColor('#aa0000');
        doc.text(data, currentX + 2, currentY + 4, { width: colWidths[i] - 4, align: i === 1 ? 'left' : 'right' });
        doc.fillColor('#000000').font('Helvetica');
        currentX += colWidths[i];
      });
      currentY += 15;
    });

    // Total Row
    currentX = margin;
    const totalData = ['', 'TOTAL', String(invoice.totalBags), qtyStr, '', '', '', '', '', '', fnqStr, '₹ ' + fmt(invoice.netTotal)];
    totalData.forEach((data, i) => {
      doc.rect(currentX, currentY, colWidths[i], 20).fillAndStroke('#f0f8f4', '#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').text(data, currentX + 2, currentY + 6, { width: colWidths[i] - 4, align: i > 1 ? 'right' : (i === 1 ? 'center' : 'left') });
      currentX += colWidths[i];
    });
    currentY += 20;

    // Footer Info
    doc.moveDown(1);
    const footerY = doc.y;
    const footerCol1Width = contentWidth * 0.6;
    const footerCol2Width = contentWidth * 0.4;

    doc.rect(margin, footerY, footerCol1Width, 80).stroke();
    doc.rect(margin + footerCol1Width, footerY, footerCol2Width, 80).stroke();

    doc.font('Helvetica-Bold').fontSize(8).text('Amount Chargeable (in words)', margin + 5, footerY + 5);
    doc.font('Helvetica-Oblique').text('INR ' + numberToWords(Math.round(Math.max(0, invoice.netTotal))), margin + 5, footerY + 15);

    doc.font('Helvetica-Bold').text('Party Bank Details', margin + 5, footerY + 40);
    doc.font('Helvetica').text(`Bank Name: ${invoice.bankName || '—'}`, margin + 5, footerY + 50);
    doc.font('Helvetica').text(`A/C No.: ${invoice.bankAc || '—'}`, margin + 5, footerY + 60);
    doc.font('Helvetica').text(`IFSC Code: ${invoice.bankIfsc || '—'}`, margin + 5, footerY + 70);

    // Signature Area
    const sigX = margin + footerCol1Width + 5;
    doc.font('Helvetica').fontSize(7).text(`for ${invoice.supplierName || ''}`, sigX, footerY + 5, { align: 'right', width: footerCol2Width - 10 });
    doc.fontSize(8).text('Authorised Signatory', sigX, footerY + 65, { align: 'right', width: footerCol2Width - 10 });

    doc.end();
  });
}
