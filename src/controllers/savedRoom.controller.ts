import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../lib/db";
import type { SavedRoom } from "../types/savedRoom";
import type { Listing } from "../types/listing";

const COLLECTION = "savedRooms";
const LISTINGS_COLLECTION = "listings";

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && ObjectId.isValid(id);
}

export async function getSavedRooms(req: Request, res: Response): Promise<void> {
  const { tenantId } = req.params;
  const db = getDb();

  const saved = await db.collection<SavedRoom>(COLLECTION).find({ tenantId }).sort({ createdAt: -1 }).toArray();
  const ids = saved.filter((s) => isValidObjectId(s.listingId)).map((s) => new ObjectId(s.listingId));

  const listings = ids.length
    ? await db.collection<Listing>(LISTINGS_COLLECTION).find({ _id: { $in: ids } }).toArray()
    : [];

  const listingMap = new Map(listings.map((l) => [l._id!.toString(), l]));
  const ordered = saved.map((s) => listingMap.get(s.listingId)).filter((l): l is Listing => Boolean(l));

  res.status(200).json({ listings: ordered });
}

export async function saveRoom(req: Request, res: Response): Promise<void> {
  const { tenantId, listingId } = req.body as { tenantId?: string; listingId?: string };

  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    res.status(400).json({ error: { message: "tenantId is required", code: "BAD_REQUEST" } });
    return;
  }
  if (!isValidObjectId(listingId)) {
    res.status(400).json({ error: { message: "Valid listingId is required", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  const collection = db.collection<SavedRoom>(COLLECTION);

  const existing = await collection.findOne({ tenantId, listingId });
  if (existing) {
    res.status(200).json({ saved: true, message: "Already saved" });
    return;
  }

  await collection.insertOne({ tenantId, listingId: listingId as string, createdAt: new Date() });
  res.status(201).json({ saved: true });
}

export async function unsaveRoom(req: Request, res: Response): Promise<void> {
  const { tenantId, listingId } = req.params;

  if (!tenantId || !isValidObjectId(listingId)) {
    res.status(400).json({ error: { message: "Invalid tenantId or listingId", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  await db.collection<SavedRoom>(COLLECTION).deleteOne({ tenantId, listingId });

  res.status(200).json({ saved: false });
}