import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../lib/db";
import type { Listing, CreateListingInput, UpdateListingInput } from "../types/listing";

const COLLECTION = "listings";

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && ObjectId.isValid(id);
}

export async function getListings(req: Request, res: Response): Promise<void> {
  const db = getDb();
  const { city, minRent, maxRent, bedrooms } = req.query;

  const filter: Record<string, unknown> = { isAvailable: true };

  if (typeof city === "string" && city.trim() !== "") {
    filter.city = { $regex: city.trim(), $options: "i" };
  }
  if (typeof bedrooms === "string" && bedrooms.trim() !== "") {
    filter.bedrooms = Number(bedrooms);
  }
  if (typeof minRent === "string" || typeof maxRent === "string") {
    const rentFilter: Record<string, number> = {};
    if (typeof minRent === "string" && minRent.trim() !== "") rentFilter.$gte = Number(minRent);
    if (typeof maxRent === "string" && maxRent.trim() !== "") rentFilter.$lte = Number(maxRent);
    filter.rentPerMonth = rentFilter;
  }

  const listings = await db
    .collection<Listing>(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.status(200).json({ listings });
}

export async function getListingById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: { message: "Invalid listing id", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  const listing = await db.collection<Listing>(COLLECTION).findOne({ _id: new ObjectId(id) });

  if (!listing) {
    res.status(404).json({ error: { message: "Listing not found", code: "NOT_FOUND" } });
    return;
  }

  res.status(200).json({ listing });
}

function validateCreateInput(
  body: unknown
): { valid: true; data: Required<CreateListingInput> } | { valid: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { valid: false, message: "Request body must be an object" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string" || b.title.trim() === "") return { valid: false, message: "title is required" };
  if (typeof b.description !== "string" || b.description.trim() === "")
    return { valid: false, message: "description is required" };
  if (typeof b.city !== "string" || b.city.trim() === "") return { valid: false, message: "city is required" };
  if (typeof b.address !== "string" || b.address.trim() === "")
    return { valid: false, message: "address is required" };
  if (typeof b.rentPerMonth !== "number" || b.rentPerMonth <= 0)
    return { valid: false, message: "rentPerMonth must be a positive number" };
  if (typeof b.bedrooms !== "number" || b.bedrooms < 0)
    return { valid: false, message: "bedrooms must be a non-negative number" };
  if (typeof b.bathrooms !== "number" || b.bathrooms < 0)
    return { valid: false, message: "bathrooms must be a non-negative number" };
  if (typeof b.ownerId !== "string" || b.ownerId.trim() === "")
    return { valid: false, message: "ownerId is required" };

  return {
    valid: true,
    data: {
      title: b.title,
      description: b.description,
      city: b.city,
      address: b.address,
      rentPerMonth: b.rentPerMonth,
      bedrooms: b.bedrooms,
      bathrooms: b.bathrooms,
      ownerId: b.ownerId,
      amenities: Array.isArray(b.amenities) ? (b.amenities as string[]) : [],
      images: Array.isArray(b.images) ? (b.images as string[]) : [],
    },
  };
}

export async function createListing(req: Request, res: Response): Promise<void> {
  const result = validateCreateInput(req.body);

  if (!result.valid) {
    res.status(400).json({ error: { message: result.message, code: "BAD_REQUEST" } });
    return;
  }

  const now = new Date();
  const listing: Listing = {
    ...result.data,
    isAvailable: true,
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  const insertResult = await db.collection<Listing>(COLLECTION).insertOne(listing);

  res.status(201).json({ listing: { ...listing, _id: insertResult.insertedId } });
}

export async function updateListing(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: { message: "Invalid listing id", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  const collection = db.collection<Listing>(COLLECTION);
  const existing = await collection.findOne({ _id: new ObjectId(id) });

  if (!existing) {
    res.status(404).json({ error: { message: "Listing not found", code: "NOT_FOUND" } });
    return;
  }

  const body = req.body as UpdateListingInput;
  const update: Partial<Listing> = { updatedAt: new Date() };

  if (typeof body.title === "string") update.title = body.title;
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.city === "string") update.city = body.city;
  if (typeof body.address === "string") update.address = body.address;
  if (typeof body.rentPerMonth === "number") update.rentPerMonth = body.rentPerMonth;
  if (typeof body.bedrooms === "number") update.bedrooms = body.bedrooms;
  if (typeof body.bathrooms === "number") update.bathrooms = body.bathrooms;
  if (Array.isArray(body.amenities)) update.amenities = body.amenities;
  if (Array.isArray(body.images)) update.images = body.images;
  if (typeof body.isAvailable === "boolean") update.isAvailable = body.isAvailable;

  await collection.updateOne({ _id: new ObjectId(id) }, { $set: update });
  const updated = await collection.findOne({ _id: new ObjectId(id) });

  res.status(200).json({ listing: updated });
}

export async function deleteListing(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: { message: "Invalid listing id", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  const collection = db.collection<Listing>(COLLECTION);
  const existing = await collection.findOne({ _id: new ObjectId(id) });

  if (!existing) {
    res.status(404).json({ error: { message: "Listing not found", code: "NOT_FOUND" } });
    return;
  }

  await collection.deleteOne({ _id: new ObjectId(id) });

  res.status(200).json({ message: "Listing deleted" });
}