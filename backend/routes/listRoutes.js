import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { createCard } from "../controllers/cardController.js";
import { copyList, deleteList, updateList } from "../controllers/listController.js";

const router = express.Router();
router.use(authMiddleware);
router.patch("/:listId", asyncHandler(updateList));
router.delete("/:listId", asyncHandler(deleteList));
router.post("/:listId/copy", asyncHandler(copyList));
router.post("/:listId/cards", asyncHandler(createCard));

export default router;
