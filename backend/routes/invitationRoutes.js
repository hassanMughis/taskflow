import express from "express";
import { acceptInvitation, getInvitation } from "../controllers/invitationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";

const router = express.Router();
router.get("/:token", asyncHandler(getInvitation));
router.post("/:token/accept", authMiddleware, asyncHandler(acceptInvitation));
export default router;
