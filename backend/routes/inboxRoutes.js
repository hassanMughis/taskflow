import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { convertInboxItem, createInboxItem, deleteInboxItem, getInbox, updateInboxItem } from "../controllers/inboxController.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/", asyncHandler(getInbox));
router.post("/", asyncHandler(createInboxItem));
router.patch("/:itemId", asyncHandler(updateInboxItem));
router.delete("/:itemId", asyncHandler(deleteInboxItem));
router.post("/:itemId/convert", asyncHandler(convertInboxItem));

export default router;
