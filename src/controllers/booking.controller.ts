import { Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import { getDb } from "../lib/db";
import type { Booking, CreateBookingInput, BookingStatus } from "../types/booking";
import type { Listing } from "../types/listing";

const COLLECTION = "bookings";
const LISTINGS_COLLECTION = "listings";
const VALID_STATUSES: BookingStatus[] = ["pending", "approved", "rejected", "cancelled"];

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && ObjectId.isValid(id);
}

// Attaches the related listing to each booking without a fragile $lookup
// across string/ObjectId types — just two queries + an in-memory join.
async function attachListings(db: Db, bookings: Booking[]) {
  const ids = [...new Set(bookings.map((b) => b.listingId))]
    .filter(isValidObjectId)
    .map((id) => new ObjectId(id));

  if (ids.length === 0) return bookings.map((b) => ({ ...b, listing: null }));

  const listings = await db.collection<Listing>(LISTINGS_COLLECTION).find({ _id: { $in: ids } }).toArray();
  const listingMap = new Map(listings.map((l) => [l._id!.toString(), l]));

  return bookings.map((b) => ({ ...b, listing: listingMap.get(b.listingId) ?? null }));
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<CreateBookingInput>;

  if (typeof body.listingId !== "string" || !isValidObjectId(body.listingId)) {
    res.status(400).json({ error: { message: "Valid listingId is required", code: "BAD_REQUEST" } });
    return;
  }
  if (typeof body.tenantId !== "string" || body.tenantId.trim() === "") {
    res.status(400).json({ error: { message: "tenantId is required", code: "BAD_REQUEST" } });
    return;
  }
  if (typeof body.tenantName !== "string" || body.tenantName.trim() === "") {
    res.status(400).json({ error: { message: "tenantName is required", code: "BAD_REQUEST" } });
    return;
  }
  if (typeof body.tenantPhone !== "string" || body.tenantPhone.trim() === "") {
    res.status(400).json({ error: { message: "tenantPhone is required", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  const listing = await db.collection<Listing>(LISTINGS_COLLECTION).findOne({ _id: new ObjectId(body.listingId) });

  if (!listing) {
    res.status(404).json({ error: { message: "Listing not found", code: "NOT_FOUND" } });
    return;
  }
  if (!listing.isAvailable) {
    res.status(400).json({ error: { message: "This room is not available", code: "NOT_AVAILABLE" } });
    return;
  }
  if (listing.ownerId === body.tenantId) {
    res.status(400).json({ error: { message: "You cannot book your own listing", code: "OWNER_CANNOT_BOOK" } });
    return;
  }

  const bookingsCollection = db.collection<Booking>(COLLECTION);

  const existing = await bookingsCollection.findOne({
    listingId: body.listingId,
    tenantId: body.tenantId,
    status: "pending",
  });
  if (existing) {
    res.status(409).json({
      error: { message: "You already have a pending request for this room", code: "DUPLICATE_REQUEST" },
    });
    return;
  }

  const now = new Date();
  const booking: Booking = {
    listingId: body.listingId,
    tenantId: body.tenantId,
    ownerId: listing.ownerId,
    tenantName: body.tenantName.trim(),
    tenantPhone: body.tenantPhone.trim(),
    moveInDate: typeof body.moveInDate === "string" && body.moveInDate.trim() !== "" ? body.moveInDate : undefined,
    message: typeof body.message === "string" && body.message.trim() !== "" ? body.message.trim() : undefined,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const result = await bookingsCollection.insertOne(booking);
  res.status(201).json({ booking: { ...booking, _id: result.insertedId } });
}

export async function getBookingsForTenant(req: Request, res: Response): Promise<void> {
  const { tenantId } = req.params;
  const db = getDb();

  const bookings = await db.collection<Booking>(COLLECTION).find({ tenantId }).sort({ createdAt: -1 }).toArray();
  const withListings = await attachListings(db, bookings);

  res.status(200).json({ bookings: withListings });
}

export async function getBookingsForOwner(req: Request, res: Response): Promise<void> {
  const { ownerId } = req.params;
  const db = getDb();

  const bookings = await db.collection<Booking>(COLLECTION).find({ ownerId }).sort({ createdAt: -1 }).toArray();
  const withListings = await attachListings(db, bookings);

  res.status(200).json({ bookings: withListings });
}

export async function updateBookingStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, actorId } = req.body as { status?: string; actorId?: string };

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: { message: "Invalid booking id", code: "BAD_REQUEST" } });
    return;
  }
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as BookingStatus)) {
    res.status(400).json({ error: { message: "Invalid status", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  const collection = db.collection<Booking>(COLLECTION);
  const booking = await collection.findOne({ _id: new ObjectId(id) });

  if (!booking) {
    res.status(404).json({ error: { message: "Booking not found", code: "NOT_FOUND" } });
    return;
  }

  // Only the owner can approve/reject; only the tenant can cancel their own request
  const isOwnerAction = (status === "approved" || status === "rejected") && actorId === booking.ownerId;
  const isTenantCancel = status === "cancelled" && actorId === booking.tenantId;

  if (!isOwnerAction && !isTenantCancel) {
    res.status(403).json({ error: { message: "Not authorized to update this booking", code: "FORBIDDEN" } });
    return;
  }

  await collection.updateOne({ _id: new ObjectId(id) }, { $set: { status: status as BookingStatus, updatedAt: new Date() } });
  const updated = await collection.findOne({ _id: new ObjectId(id) });

  res.status(200).json({ booking: updated });
}