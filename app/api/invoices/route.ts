import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/mongoose";
import { Invoice } from "@/lib/models/Invoice";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  await dbConnect();
  
  const invoices = await Invoice.find({ userId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const data = await req.json();

  await dbConnect();

  const newInvoice = new Invoice({
    ...data,
    id: uuidv4(),
    userId,
  });

  await newInvoice.save();

  return NextResponse.json(newInvoice, { status: 201 });
}
