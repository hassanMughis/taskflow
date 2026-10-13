import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { copyCard, deleteCard, moveCard, removeCardLabel, removeCardMember, setCardLabel, setCardMember, updateCard } from "../controllers/cardController.js";
import { addAttachment, addComment, addCustomField } from "../controllers/cardResourceController.js";
import { addChecklist } from "../controllers/checklistController.js";

const router = express.Router();
router.use(authMiddleware);
router.patch("/:cardId", asyncHandler(updateCard));
router.delete("/:cardId", asyncHandler(deleteCard));
router.post("/:cardId/copy", asyncHandler(copyCard));
router.put("/:cardId/move", asyncHandler(moveCard));
router.put("/:cardId/labels/:labelId", asyncHandler(setCardLabel));
router.delete("/:cardId/labels/:labelId", asyncHandler(removeCardLabel));
router.put("/:cardId/members/:userId", asyncHandler(setCardMember));
router.delete("/:cardId/members/:userId", asyncHandler(removeCardMember));
router.post("/:cardId/comments", asyncHandler(addComment));
router.post("/:cardId/attachments", asyncHandler(addAttachment));
router.post("/:cardId/custom-fields", asyncHandler(addCustomField));
router.post("/:cardId/checklists", asyncHandler(addChecklist));

export default router;
