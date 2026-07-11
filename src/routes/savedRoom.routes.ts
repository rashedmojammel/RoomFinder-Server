import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getSavedRooms, saveRoom, unsaveRoom } from "../controllers/savedRoom.controller";

const router = Router();

router.get("/:tenantId", asyncHandler(getSavedRooms));
router.post("/", asyncHandler(saveRoom));
router.delete("/:tenantId/:listingId", asyncHandler(unsaveRoom));

export default router;