import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../lib/db";
import type { Review, CreateReviewInput } from "../types/review";
import type { Booking } from "../types/booking";
import type { Listing } from "../types/listing";

const COLLECTION = "reviews";
const BOOKINGS_COLLECTION = "bookings";
const LISTINGS_COLLECTION = "listings";

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && ObjectId.isValid(id);
}

async function recomputeListingRating(listingId: string) {
  const db = getDb();

  if (!isValidObjectId(listingId)) return;

  const reviews = await db.collection<Review>(COLLECTION).find({ listingId }).toArray();

  const reviewCount = reviews.length;
  const ratingAverage =
    reviewCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
      : 0;

  await db
    .collection<Listing>(LISTINGS_COLLECTION)
    .updateOne({ _id: new ObjectId(listingId) }, { $set: { ratingAverage, reviewCount } });
}

// GET /api/reviews/listing/:listingId
export async function getListingReviews(req: Request, res: Response): Promise<void> {
  const { listingId } = req.params;
  const db = getDb();

  const reviews = await db
    .collection<Review>(COLLECTION)
    .find({ listingId })
    .sort({ createdAt: -1 })
    .toArray();

  const count = reviews.length;
  const average =
    count > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;

  res.status(200).json({ reviews, average, count });
}

// POST /api/reviews — upsert: one review per tenant per listing
export async function createOrUpdateReview(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<CreateReviewInput>;

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
  if (typeof body.rating !== "number" || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    res.status(400).json({ error: { message: "rating must be an integer from 1 to 5", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();

  // Only tenants with an approved booking on this listing may review it
  const approvedBooking = await db.collection<Booking>(BOOKINGS_COLLECTION).findOne({
    listingId: body.listingId,
    tenantId: body.tenantId,
    status: "approved",
  });

  if (!approvedBooking) {
    res.status(403).json({
      error: {
        message: "You can only review rooms you have an approved booking for",
        code: "NOT_ELIGIBLE",
      },
    });
    return;
  }

  const collection = db.collection<Review>(COLLECTION);
  const now = new Date();

  const existing = await collection.findOne({
    listingId: body.listingId,
    tenantId: body.tenantId,
  });

  if (existing) {
    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          rating: body.rating,
          comment: typeof body.comment === "string" && body.comment.trim() !== "" ? body.comment.trim() : undefined,
          updatedAt: now,
        },
      }
    );
  } else {
    await collection.insertOne({
      listingId: body.listingId,
      tenantId: body.tenantId,
      tenantName: body.tenantName.trim(),
      rating: body.rating,
      comment: typeof body.comment === "string" && body.comment.trim() !== "" ? body.comment.trim() : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  await recomputeListingRating(body.listingId);

  const saved = await collection.findOne({ listingId: body.listingId, tenantId: body.tenantId });
  res.status(existing ? 200 : 201).json({ review: saved });
}

// DELETE /api/reviews/:id — only the review's own tenant, or an admin (checked by caller)
export async function deleteReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { actorId, isAdmin } = req.body as { actorId?: string; isAdmin?: boolean };

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: { message: "Invalid review id", code: "BAD_REQUEST" } });
    return;
  }

  const db = getDb();
  const collection = db.collection<Review>(COLLECTION);
  const review = await collection.findOne({ _id: new ObjectId(id) });

  if (!review) {
    res.status(404).json({ error: { message: "Review not found", code: "NOT_FOUND" } });
    return;
  }

  if (review.tenantId !== actorId && !isAdmin) {
    res.status(403).json({ error: { message: "Not authorized to delete this review", code: "FORBIDDEN" } });
    return;
  }

  await collection.deleteOne({ _id: new ObjectId(id) });
  await recomputeListingRating(review.listingId);

  res.status(200).json({ message: "Review deleted" });
}