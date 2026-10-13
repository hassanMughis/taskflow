import express from "express";
import { getHome } from "../controllers/homeController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";

const router = express.Router();
router.get("/", authMiddleware, asyncHandler(getHome));
export default router;
