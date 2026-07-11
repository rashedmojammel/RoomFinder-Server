import { Router } from "express";
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} from "../controllers/listing.controller";

const router = Router();

router.get("/", getListings);
router.get("/:id", getListingById);
router.post("/", createListing);
router.patch("/:id", updateListing);
router.delete("/:id", deleteListing);

export default router;