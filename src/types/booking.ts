import { ObjectId } from "mongodb";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Booking {
  _id?: ObjectId;
  listingId: string;
  tenantId: string;
  ownerId: string;
  tenantName: string;
  tenantPhone: string;
  moveInDate?: string; // ISO date string, e.g. "2026-08-01"
  message?: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingInput {
  listingId: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  moveInDate?: string;
  message?: string;
}