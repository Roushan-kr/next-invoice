import mongoose, { Schema, Model } from "mongoose";

export interface IUserProfile {
  userId: string; // From NextAuth session
  companyName: string;
  companyAddr: string;
  bankName: string;
  bankAc: string;
  bankIfsc: string;
  supplierState: string;
  lastInvoiceNo?: number;
  updatedAt?: Date;
}

const ProfileSchema = new Schema<IUserProfile>({
  userId: { type: String, required: true, unique: true, index: true },
  companyName: { type: String, required: true },
  companyAddr: { type: String, required: true },
  bankName: { type: String, required: true },
  bankAc: { type: String, required: true },
  bankIfsc: { type: String, required: true },
  supplierState: { type: String, required: true },
  lastInvoiceNo: { type: Number },
}, { timestamps: true });

export const Profile: Model<IUserProfile> = mongoose.models.Profile || mongoose.model<IUserProfile>("Profile", ProfileSchema);
