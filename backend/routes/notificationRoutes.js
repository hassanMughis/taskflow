import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/", asyncHandler(getNotifications));
router.patch("/read-all", asyncHandler(markAllNotificationsRead));
router.patch("/:notificationId/read", asyncHandler(markNotificationRead));

export default router;
