import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getListings,
  getListingById,
  getOwnerListings,
  getPendingListings,
  getAllListingsAdmin,
  createListing,
  updateListing,
  updateListingApproval,
  deleteListing,
} from "../controllers/listing.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", asyncHandler(getListings));
router.get("/owner/:ownerId", requireAuth, asyncHandler(getOwnerListings));
router.get("/admin/pending", requireAuth, asyncHandler(getPendingListings));
router.get("/admin/all", requireAuth, asyncHandler(getAllListingsAdmin));
router.get("/:id", requireAuth, asyncHandler(getListingById));

// router.post("/", asyncHandler(createListing));

// router.patch("/:id/approval", asyncHandler(updateListingApproval));
// router.patch("/:id", asyncHandler(updateListing));

// router.delete("/:id", asyncHandler(deleteListing));
router.post("/", requireAuth, asyncHandler(createListing));
router.patch("/:id/approval", requireAuth, requireRole("admin"), asyncHandler(updateListingApproval));
router.patch("/:id", requireAuth, asyncHandler(updateListing));
router.delete("/:id", requireAuth, asyncHandler(deleteListing));

export default router;