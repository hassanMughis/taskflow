import { Op } from "sequelize";
import { Workspace, WorkspaceInvite, WorkspaceMember } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";

async function activeInvite(token) {
  const invite = await WorkspaceInvite.findOne({ where: { token, revokedAt: null, expiresAt: { [Op.gt]: new Date() } }, include: [{ model: Workspace, as: "workspace", attributes: ["id", "name"] }] });
  if (!invite) throw new ApiError(404, "This invitation is invalid or has expired");
  return invite;
}

export async function getInvitation(req, res) {
  const invite = await activeInvite(req.params.token);
  return res.json({ invitation: { workspace: invite.workspace, expiresAt: invite.expiresAt } });
}

export async function acceptInvitation(req, res) {
  const invite = await activeInvite(req.params.token);
  await WorkspaceMember.findOrCreate({ where: { workspaceId: invite.workspaceId, userId: req.user.id }, defaults: { role: "member" } });
  return res.json({ message: "Invitation accepted", workspace: invite.workspace });
}
