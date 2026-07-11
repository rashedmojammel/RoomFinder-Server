import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  createBooking,
  getBookingsForTenant,
  getBookingsForOwner,
  updateBookingStatus,
} from "../controllers/booking.controller";

const router = Router();

router.post("/", asyncHandler(createBooking));
router.get("/tenant/:tenantId", asyncHandler(getBookingsForTenant));
router.get("/owner/:ownerId", asyncHandler(getBookingsForOwner));
router.patch("/:id/status", asyncHandler(updateBookingStatus));

export default router;