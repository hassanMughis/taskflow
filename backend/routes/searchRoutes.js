import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { search } from "../controllers/searchController.js";

const router = express.Router();
router.get("/", authMiddleware, asyncHandler(search));
export default router;
