import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import { Invoice, IInvoice, Deduction } from "@/lib/models/Invoice";
import { authOptions } from "@/lib/auth";
import { getUserProfile, getNextInvoiceNo } from "@/lib/actions";
import CreateInvoiceForm from "@/components/CreateInvoiceForm";

const DEFAULT_DEDUCTIONS: Deduction[] = [
  { desc: 'LABOUR', bags: '', rate: '', amt: 0 },
  { desc: 'DAMAGE BAG', bags: '', rate: '', amt: 0 },
  { desc: 'GADDI CHARGE', bags: '', rate: '', amt: 0 },
  { desc: 'BADSHAH BROKER', bags: '', rate: '', amt: 0 },
  { desc: 'BANK EXP', bags: '', rate: '', amt: 0 },
  { desc: 'CD 1%', bags: '', rate: '', amt: 0 },
];

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    redirect("/login?callbackUrl=/create");
  }

  const userId = (session.user as any).id;
  const resolvedParams = await searchParams;
  const editId = resolvedParams.edit as string | undefined;

  await dbConnect();

  let initialData: Partial<IInvoice> = {
    companyName: "",
    companyAddr: "",
    invNo: "",
    date: new Date().toISOString().split('T')[0],
    supplierInvRef: "",
    otherRef: "",
    supplierName: "",
    supplierAddr: "",
    supplierState: "",
    trollNo: "",
    kataSlipNo: "",
    bankName: "",
    bankAc: "",
    bankIfsc: "",
    commodity: "MAIZE",
    totalBags: 0,
    quantity: 0,
    rate: 0,
    netWeight: 0,
    standDed: 0,
    moisDed: 0,
    deductions: [...DEFAULT_DEDUCTIONS],
    gross: 0,
    otherDeduct: 0,
    netTotal: 0,
  };

  if (editId) {
    const existing = await Invoice.findOne({ id: editId, userId }).lean() as any;
    if (existing) {
      initialData = {
        ...existing,
        _id: existing._id.toString(),
        date: existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : existing.date,
        deductions: existing.deductions?.map((d: any) => ({
          ...d,
          _id: d._id?.toString()
        })),
      };
    }
  } else {
    // New Invoice: Fetch defaults
    const [profile, nextNo] = await Promise.all([
      getUserProfile(),
      getNextInvoiceNo()
    ]);

    initialData = {
      ...initialData,
      companyName: profile?.companyName || "company Name",
      companyAddr: profile?.companyAddr || "company Address",
      supplierState: profile?.supplierState || "supplier State",
      bankName: profile?.bankName || "",
      bankAc: profile?.bankAc || "",
      bankIfsc: profile?.bankIfsc || "",
      invNo: nextNo
    };
  }

  return (
    <Suspense fallback={<div className="container">Loading Form...</div>}>
      <CreateInvoiceForm initialData={initialData} editId={editId} />
    </Suspense>
  );
}
