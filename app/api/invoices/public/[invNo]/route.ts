import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePDF } from "@/lib/pdfGenerator";
import dbConnect from "@/lib/mongoose";
import { Invoice, IInvoice } from "@/lib/models/Invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invNo: string }> },
) {
  const { invNo } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!invNo || !date) {
    return NextResponse.json(
      { error: "Invoice number and date are required" },
      { status: 400 },
    );
  }

  await dbConnect();

  // Search for the invoice.
  const query = {
    invNo: invNo,
    date: date,
  };

  // .lean() returns a plain JS object, which we cast to IInvoice
  const invoice = (await Invoice.findOne(query).lean()) as IInvoice | null;

  if (!invoice) {
    return NextResponse.json(
      { error: "Invoice not found. Please check the number and date." },
      { status: 404 },
    );
  }

  try {
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Using new Uint8Array(pdfBuffer) as any for the body ensures windows compatibility
    // and satisfies the NextResponse body type requirement.
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice_${invoice.invNo || invNo}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
