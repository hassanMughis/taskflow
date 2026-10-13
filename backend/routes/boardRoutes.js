import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { addBoardMember, createBoard, deleteBoard, getArchivedBoardItems, getBoard, getBoardActivity, getBoards, removeBoardMember, updateBoard } from "../controllers/boardController.js";
import { createList, reorderLists } from "../controllers/listController.js";
import { createLabel } from "../controllers/labelController.js";
import automationRoutes from "./automationRoutes.js";
import powerUpRoutes from "./powerUpRoutes.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/", asyncHandler(getBoards));
router.post("/", asyncHandler(createBoard));
router.get("/:boardId/activity", asyncHandler(getBoardActivity));
router.get("/:boardId/archived", asyncHandler(getArchivedBoardItems));
router.get("/:boardId", asyncHandler(getBoard));
router.patch("/:boardId", asyncHandler(updateBoard));
router.delete("/:boardId", asyncHandler(deleteBoard));
router.post("/:boardId/members", asyncHandler(addBoardMember));
router.delete("/:boardId/members/:userId", asyncHandler(removeBoardMember));
router.post("/:boardId/lists", asyncHandler(createList));
router.put("/:boardId/lists/order", asyncHandler(reorderLists));
router.post("/:boardId/labels", asyncHandler(createLabel));
router.use("/:boardId/automations", automationRoutes);
router.use("/:boardId/power-ups", powerUpRoutes);

export default router;
