// import { Router } from "express";
// import { asyncHandler } from "../middleware/asyncHandler";
// import {
//   createBooking,
//   getBookingsForTenant,
//   getBookingsForOwner,
//   getAllBookings,
//   updateBookingStatus,
// } from "../controllers/booking.controller";

// const router = Router();

// router.post("/", asyncHandler(createBooking));
// router.get("/tenant/:tenantId", asyncHandler(getBookingsForTenant));
// router.get("/owner/:ownerId", asyncHandler(getBookingsForOwner));
// router.get("/admin/all", asyncHandler(getAllBookings));
// router.patch("/:id/status", asyncHandler(updateBookingStatus));

// export default router;

import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import {
  createBooking,
  getBookingsForTenant,
  getBookingsForOwner,
  getAllBookings,
  updateBookingStatus,
} from "../controllers/booking.controller";

const router = Router();

router.post("/", requireAuth, asyncHandler(createBooking));
router.get("/tenant/:tenantId", requireAuth, asyncHandler(getBookingsForTenant));
router.get("/owner/:ownerId", requireAuth, asyncHandler(getBookingsForOwner));
router.get("/admin/all", requireAuth, asyncHandler(getAllBookings));
router.patch("/:id/status", requireAuth, asyncHandler(updateBookingStatus));

export default router;