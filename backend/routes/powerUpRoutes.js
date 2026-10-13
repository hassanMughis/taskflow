import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { getPowerUps, setPowerUp } from "../controllers/powerUpController.js";

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);
router.get("/", asyncHandler(getPowerUps));
router.put("/:key", asyncHandler(setPowerUp));
export default router;
