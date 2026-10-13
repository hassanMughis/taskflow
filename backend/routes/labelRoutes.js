import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { deleteLabel, updateLabel } from "../controllers/labelController.js";

const router = express.Router();
router.patch("/labels/:labelId", authMiddleware, asyncHandler(updateLabel));
router.delete("/labels/:labelId", authMiddleware, asyncHandler(deleteLabel));

export default router;
