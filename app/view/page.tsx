import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import RecordsDisplay from "@/components/RecordsDisplay";
import dbConnect from "@/lib/mongoose";
import { Invoice, IInvoice } from "@/lib/models/Invoice";
import { authOptions } from "@/lib/auth";

export default async function ViewRecordsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !(session.user as any)?.id) {
    redirect("/login?callbackUrl=/view");
  }

  const userId = (session.user as any).id;

  await dbConnect();
  
  // Fetch invoices directly as plain JS objects using .lean()
  const invoices = await Invoice.find({ userId }).sort({ date: -1, createdAt: -1 }).lean() as any[];

  // Convert MongoDB _id to string for the client-side component if needed
  // and handle serialization of Date objects
  const serializedInvoices = invoices.map(inv => ({
    ...inv,
    _id: inv._id.toString(),
    id: inv.id || inv._id.toString(),
    date: inv.date instanceof Date ? inv.date.toISOString().split('T')[0] : inv.date,
    deductions: inv.deductions?.map((d: any) => ({
      ...d,
      _id: d._id?.toString()
    })),
    createdAt: inv.createdAt?.toISOString(),
    updatedAt: inv.updatedAt?.toISOString(),
  })) as any as IInvoice[];

  return (
    <>
      <Header />
      <RecordsDisplay initialInvoices={serializedInvoices} />
    </>
  );
}
