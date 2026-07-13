import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getListingReviews, createOrUpdateReview, deleteReview } from "../controllers/review.controller";

const router = Router();

router.get("/listing/:listingId", asyncHandler(getListingReviews));
router.post("/", asyncHandler(createOrUpdateReview));
router.delete("/:id", asyncHandler(deleteReview));

export default router;