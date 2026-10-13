import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  getWorkspaceCollaborators,
  createWorkspaceInvite,
  revokeWorkspaceInvite,
} from "../controllers/workspaceController.js";
import { asyncHandler } from "../utils/apiError.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/", asyncHandler(getWorkspaces));
router.get("/:id/collaborators", asyncHandler(getWorkspaceCollaborators));
router.post("/:id/invites", asyncHandler(createWorkspaceInvite));
router.delete("/:id/invites/:inviteId", asyncHandler(revokeWorkspaceInvite));
router.get("/:id", asyncHandler(getWorkspaceById));
router.patch("/:id", asyncHandler(updateWorkspace));
router.put("/:id", asyncHandler(updateWorkspace));
router.delete("/:id", asyncHandler(deleteWorkspace));
router.post("/:id/members", asyncHandler(addWorkspaceMember));
router.patch("/:id/members/:userId", asyncHandler(updateWorkspaceMemberRole));
router.delete("/:id/members/:userId", asyncHandler(removeWorkspaceMember));
export default router;
