import { ObjectId } from "mongodb";

export type ListingApprovalStatus = "pending" | "approved" | "rejected";

export interface Listing {
  _id?: ObjectId;
  title: string;
  description: string;
  city: string;
  address: string;
  rentPerMonth: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  ownerId: string;
  isAvailable: boolean;
  approvalStatus: ListingApprovalStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateListingInput {
  title: string;
  description: string;
  city: string;
  address: string;
  rentPerMonth: number;
  bedrooms: number;
  bathrooms: number;
  ownerId: string;
  amenities?: string[];
  images?: string[];
}

export type UpdateListingInput = Partial<Omit<CreateListingInput, "ownerId">> & {
  isAvailable?: boolean;
};