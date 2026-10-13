import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/apiError.js";
import { deleteAttachment, deleteComment, deleteCustomField, updateComment, updateCustomField } from "../controllers/cardResourceController.js";
import { addChecklistItem, deleteChecklist, deleteChecklistItem, updateChecklist, updateChecklistItem } from "../controllers/checklistController.js";

const router = express.Router();
router.patch("/comments/:commentId", authMiddleware, asyncHandler(updateComment));
router.delete("/comments/:commentId", authMiddleware, asyncHandler(deleteComment));
router.delete("/attachments/:attachmentId", authMiddleware, asyncHandler(deleteAttachment));
router.patch("/custom-fields/:fieldId", authMiddleware, asyncHandler(updateCustomField));
router.delete("/custom-fields/:fieldId", authMiddleware, asyncHandler(deleteCustomField));
router.patch("/checklists/:checklistId", authMiddleware, asyncHandler(updateChecklist));
router.delete("/checklists/:checklistId", authMiddleware, asyncHandler(deleteChecklist));
router.post("/checklists/:checklistId/items", authMiddleware, asyncHandler(addChecklistItem));
router.patch("/checklist-items/:itemId", authMiddleware, asyncHandler(updateChecklistItem));
router.delete("/checklist-items/:itemId", authMiddleware, asyncHandler(deleteChecklistItem));

export default router;
