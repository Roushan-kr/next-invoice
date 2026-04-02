import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongoose";
import { Invoice, IInvoice } from "@/lib/models/Invoice";
import { authOptions } from "@/lib/auth";
import { generateInvoicePDF } from "@/lib/pdfGenerator";

// CRITICAL: Force Node.js runtime (not Edge) for PDFKit compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invNo: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
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

    // Find invoice matching number, date, and user
    const invoice = (await Invoice.findOne({
      invNo,
      date,
      userId,
    }).lean()) as IInvoice | null;

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found or unauthorized access" },
        { status: 404 },
      );
    }

    // Capture the PDF buffer from our core generator
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Return a direct Response with binary headers for stability
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice_${invoice.invNo.replace(/\s+/g, "_")}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("DEBUG [Protected PDF API Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF. Check server logs." },
      { status: 500 },
    );
  }
}
