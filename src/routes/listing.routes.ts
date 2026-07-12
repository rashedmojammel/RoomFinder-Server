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

const router = Router();

router.get("/", asyncHandler(getListings));
router.get("/owner/:ownerId", asyncHandler(getOwnerListings));
router.get("/admin/pending", asyncHandler(getPendingListings));
router.get("/admin/all", asyncHandler(getAllListingsAdmin));
router.get("/:id", asyncHandler(getListingById));

router.post("/", asyncHandler(createListing));

router.patch("/:id/approval", asyncHandler(updateListingApproval));
router.patch("/:id", asyncHandler(updateListing));

router.delete("/:id", asyncHandler(deleteListing));

export default router;