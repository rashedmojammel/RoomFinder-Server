import { ObjectId } from "mongodb";

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
  ownerId: string; // sent by the client — no server-side verification
  isAvailable: boolean;
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