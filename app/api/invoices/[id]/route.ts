import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongoose";
import { Invoice, IInvoice } from "@/lib/models/Invoice";
import { authOptions } from "@/lib/auth";

// GET a specific invoice
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;

  await dbConnect();
  
  try {
    const invoice = (await Invoice.findOne({ id, userId }).lean()) as IInvoice | null;
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (err: any) {
    console.error("DEBUG: Error fetching invoice:", err);
    return NextResponse.json({ error: "Failed to fetch invoice", details: err.message }, { status: 500 });
  }
}

// UPDATE a specific invoice
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;
  const data = await req.json();

  await dbConnect();

  try {
    const updatedInvoice = await Invoice.findOneAndUpdate(
      { id, userId },
      { ...data, userId, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(updatedInvoice);
  } catch (err: any) {
    console.error("DEBUG: Error updating invoice:", err);
    return NextResponse.json({ error: "Failed to update invoice", details: err.message }, { status: 500 });
  }
}

// DELETE a specific invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;

  await dbConnect();
  
  const result = await Invoice.deleteOne({ id, userId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
}
