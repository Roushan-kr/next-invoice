import mongoose, { Schema, Document, Model } from "mongoose";

export interface Deduction {
  desc: string;
  bags: string | number;
  rate: string | number;
  amt: number;
}

export interface IInvoice {
  id: string; // UUID for internal lookups
  userId: string;
  companyName: string;
  companyAddr: string;
  invNo: string;
  date: string;
  supplierInvRef?: string;
  otherRef?: string;
  supplierName: string;
  supplierAddr: string;
  supplierState: string;
  trollNo?: string;
  kataSlipNo?: string;
  bankName: string;
  bankAc: string;
  bankIfsc: string;
  commodity: string;
  totalBags: number;
  quantity: number;
  rate: number;
  netWeight: number;
  standPercent: number;
  standDedQty: number;
  standDed: number;
  moisPercent: number;
  moisDedQty: number;
  moisDed: number;
  finalNetQty: number;
  deductions: Deduction[];
  gross: number;
  otherDeduct: number;
  netTotal: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeductionSchema = new Schema<Deduction>({
  desc: { type: String, required: true },
  bags: { type: Schema.Types.Mixed },
  rate: { type: Schema.Types.Mixed },
  amt: { type: Number, required: true },
});

const InvoiceSchema = new Schema<IInvoice>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  companyName: { type: String, required: true },
  companyAddr: { type: String, required: true },
  invNo: { type: String, required: true },
  date: { type: String, required: true },
  supplierInvRef: { type: String },
  otherRef: { type: String },
  supplierName: { type: String, required: true },
  supplierAddr: { type: String, required: true },
  supplierState: { type: String, required: true },
  trollNo: { type: String },
  kataSlipNo: { type: String },
  bankName: { type: String, required: true },
  bankAc: { type: String, required: true },
  bankIfsc: { type: String, required: true },
  commodity: { type: String, required: true },
  totalBags: { type: Number, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  netWeight: { type: Number, required: true },
  standPercent: { type: Number, default: 0 },
  standDedQty: { type: Number, default: 0 },
  standDed: { type: Number, default: 0 },
  moisPercent: { type: Number, default: 0 },
  moisDedQty: { type: Number, default: 0 },
  moisDed: { type: Number, default: 0 },
  finalNetQty: { type: Number, default: 0 },
  deductions: [DeductionSchema],
  gross: { type: Number, required: true },
  otherDeduct: { type: Number, default: 0 },
  netTotal: { type: Number, required: true },
}, { timestamps: true });

// Check if model exists to handle HMR
export const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
