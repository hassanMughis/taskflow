import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { createAutomation, deleteAutomation, getAutomations, updateAutomation } from "../controllers/automationController.js";

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);
router.get("/", asyncHandler(getAutomations));
router.post("/", asyncHandler(createAutomation));
router.patch("/:automationId", asyncHandler(updateAutomation));
router.delete("/:automationId", asyncHandler(deleteAutomation));
export default router;
