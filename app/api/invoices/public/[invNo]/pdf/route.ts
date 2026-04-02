import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import PDFDocument from "pdfkit";
import dbConnect from "@/lib/mongoose";
import { Invoice } from "@/lib/models/Invoice";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invNo: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { invNo } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  await dbConnect();
  
  // Find invoice matching number, date, and user
  const invoice = await Invoice.findOne({ 
    invNo, 
    date, 
    userId 
  }).lean();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Generate PDF on the fly
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  const chunks: any[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // --- PDF Content Generation (Simplified representation of the original logic) ---
  doc.fontSize(20).text(invoice.companyName, { align: 'center' });
  doc.fontSize(10).text(invoice.companyAddr, { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`INVOICE: ${invoice.invNo}`, { align: 'left' });
  doc.text(`Date: ${invoice.date}`, { align: 'right' });
  doc.moveDown();
  doc.fontSize(12).text(`Supplier: ${invoice.supplierName}`);
  doc.text(invoice.supplierAddr);
  doc.text(invoice.supplierState);
  doc.moveDown();
  
  // Table-like structure for items
  doc.text('-----------------------------------------------------------');
  doc.text(`Commodity: ${invoice.commodity}`);
  doc.text(`Total Bags: ${invoice.totalBags}`);
  doc.text(`Weight: ${invoice.netWeight} kg`);
  if (invoice.standPercent > 0) doc.text(`Stand Ded: ${invoice.standPercent}% (-${invoice.standDedQty} kg)`);
  if (invoice.moisPercent > 0) doc.text(`Mois Ded: ${invoice.moisPercent}% (-${invoice.moisDedQty} kg)`);
  doc.text(`Final Net Qty: ${invoice.finalNetQty} kg`);
  doc.text(`Rate: ${invoice.rate} / kg`);
  doc.text('-----------------------------------------------------------');
  doc.moveDown();
  doc.fontSize(14).text(`Net Total: Rs. ${invoice.netTotal.toLocaleString()}`, { align: 'right' });
  
  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice_${invoice.invNo}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
