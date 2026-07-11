import { ObjectId } from "mongodb";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Booking {
  _id?: ObjectId;
  listingId: string;
  tenantId: string;
  ownerId: string;
  status: BookingStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingInput {
  listingId: string;
  tenantId: string;
  message?: string;
}