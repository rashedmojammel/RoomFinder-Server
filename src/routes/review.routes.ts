import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getListingReviews, createOrUpdateReview, deleteReview } from "../controllers/review.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/listing/:listingId", asyncHandler(getListingReviews));
// router.post("/", asyncHandler(createOrUpdateReview));
// router.delete("/:id", asyncHandler(deleteReview));
router.post("/", requireAuth, asyncHandler(createOrUpdateReview));
router.delete("/:id", requireAuth, asyncHandler(deleteReview)); 

export default router;