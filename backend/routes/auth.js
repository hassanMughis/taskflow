import express from 'express';
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  login,
  register,
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
} from "../controllers/authController.js";
import { asyncHandler } from "../utils/apiError.js";
const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", authMiddleware, getCurrentUser);
router.patch("/me", authMiddleware, asyncHandler(updateCurrentUser));
router.patch("/password", authMiddleware, asyncHandler(updatePassword));

export default router;
