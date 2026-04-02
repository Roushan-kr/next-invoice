"use server";

import dbConnect from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { Profile, IUserProfile } from "@/lib/models/Profile";
import { Invoice, IInvoice } from "@/lib/models/Invoice";
import { authOptions } from "./auth";

/**
 * Get current user profile from MongoDB
 */
export async function getUserProfile() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await dbConnect();
  
  const userId = (session.user as any).id;
  const profile = await Profile.findOne({ userId }).lean();

  return profile ? (JSON.parse(JSON.stringify(profile)) as IUserProfile) : null;
}

/**
 * Update or create user profile
 */
export async function updateUserProfile(data: Partial<IUserProfile>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Not authenticated");

  await dbConnect();
  
  const userId = (session.user as any).id;
  
  await Profile.findOneAndUpdate(
    { userId },
    { ...data, userId },
    { upsert: true, new: true }
  );

  return { success: true };
}

/**
 * Get the next suggested invoice number for the user
 * Increments the last numeric invoice found or starts at 101
 */
export async function getNextInvoiceNo() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return "101";

  await dbConnect();
  
  const userId = (session.user as any).id;
  
  // Find the latest invoice created by this user
  const lastInvoice = await Invoice.findOne({ userId })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastInvoice) {
    return "101"; // Default starting number
  }

  const lastNo = lastInvoice.invNo;
  const match = lastNo.match(/\d+/);
  
  if (match) {
    const nextVal = parseInt(match[0]) + 1;
    // Replace the numeric part in the original string format if any
    return lastNo.replace(match[0], nextVal.toString());
  }

  return (parseInt(lastNo) + 1).toString() || "101";
}
