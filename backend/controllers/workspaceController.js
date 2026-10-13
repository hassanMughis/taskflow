import { Op } from "sequelize";
import crypto from "node:crypto";
import sequelize from "../config/db.js";
import { Board, BoardMember, Card, CardMember, List, User, Workspace, WorkspaceInvite, WorkspaceMember } from "../models/index.js";
import { findWorkspaceForUser, requireWorkspaceAdmin } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { emailValue, positiveId, requireText } from "../utils/validation.js";

const memberInclude = {
  model: User,
  as: "members",
  attributes: ["id", "name", "email"],
  through: { attributes: ["role", "createdAt"] },
};

export const getWorkspaces = async (req, res) => {
  const memberships = await WorkspaceMember.findAll({ where: { userId: req.user.id }, attributes: ["workspaceId"] });
  const workspaceIds = memberships.map((item) => item.workspaceId);
  const workspaces = await Workspace.findAll({
    where: { [Op.or]: [{ ownerId: req.user.id }, { id: { [Op.in]: workspaceIds.length ? workspaceIds : [0] } }] },
    include: [memberInclude],
    order: [["createdAt", "DESC"]],
  });
  return res.json({ workspaces });
};

export const getWorkspaceById = async (req, res) => {
  const accessible = await findWorkspaceForUser(req.params.id, req.user.id);
  const memberships = await BoardMember.findAll({ where: { userId: req.user.id }, attributes: ["boardId"] });
  const boardIds = memberships.map((membership) => membership.boardId);
  const boardWhere = { archived: false, [Op.or]: [{ id: { [Op.in]: boardIds.length ? boardIds : [0] } }, { visibility: { [Op.in]: ["workspace", "public"] } }] };
  const workspace = await Workspace.findByPk(accessible.id, {
    include: [memberInclude, { association: "boards", where: boardWhere, required: false }],
    order: [[{ model: Board, as: "boards" }, "position", "ASC"]],
  });
  return res.json({ workspace });
};

export const updateWorkspace = async (req, res) => {
  const workspace = await requireWorkspaceAdmin(req.params.id, req.user.id);
  const update = {};
  if (req.body?.name !== undefined) update.name = requireText(req.body.name, "Workspace name", 100);
  if (req.body?.isPrivate !== undefined) {
    if (typeof req.body.isPrivate !== "boolean") throw new ApiError(400, "isPrivate must be true or false");
    update.isPrivate = req.body.isPrivate;
  }
  if (!Object.keys(update).length) throw new ApiError(400, "No supported workspace fields were provided");
  await workspace.update(update);
  return res.json({ message: "Workspace updated successfully", workspace });
};

export const deleteWorkspace = async (req, res) => {
  const workspace = await requireWorkspaceAdmin(req.params.id, req.user.id);
  if (Number(workspace.ownerId) !== Number(req.user.id)) throw new ApiError(403, "Only the workspace owner can delete it");
  await workspace.destroy();
  return res.status(204).send();
};

export const addWorkspaceMember = async (req, res) => {
  const workspace = await requireWorkspaceAdmin(req.params.id, req.user.id);
  const email = emailValue(req.body?.email);
  const user = await User.findOne({ where: { email } });
  if (!user) throw new ApiError(404, "No registered user has that email");
  const [membership, created] = await WorkspaceMember.findOrCreate({
    where: { workspaceId: workspace.id, userId: user.id }, defaults: { role: "member" },
  });
  return res.status(created ? 201 : 200).json({ membership, user: { id: user.id, name: user.name, email: user.email } });
};

export const removeWorkspaceMember = async (req, res) => {
  const workspace = await requireWorkspaceAdmin(req.params.id, req.user.id);
  const userId = positiveId(req.params.userId, "user id");
  if (Number(workspace.ownerId) === userId) throw new ApiError(409, "The workspace owner cannot be removed");
  await sequelize.transaction(async (transaction) => {
    const removed = await WorkspaceMember.destroy({ where: { workspaceId: workspace.id, userId }, transaction });
    if (!removed) throw new ApiError(404, "Workspace member not found");
    const boards = await Board.findAll({ where: { workspaceId: workspace.id }, attributes: ["id"], transaction });
    const boardIds = boards.map((board) => board.id);
    if (!boardIds.length) return;
    await BoardMember.destroy({ where: { boardId: { [Op.in]: boardIds }, userId }, transaction });
    const lists = await List.findAll({ where: { boardId: { [Op.in]: boardIds } }, attributes: ["id"], transaction });
    const listIds = lists.map((list) => list.id);
    if (!listIds.length) return;
    const cards = await Card.findAll({ where: { listId: { [Op.in]: listIds } }, attributes: ["id"], transaction });
    const cardIds = cards.map((card) => card.id);
    if (cardIds.length) await CardMember.destroy({ where: { cardId: { [Op.in]: cardIds }, userId }, transaction });
  });
  return res.status(204).send();
};

export const updateWorkspaceMemberRole = async (req, res) => {
  const workspace = await requireWorkspaceAdmin(req.params.id, req.user.id);
  const userId = positiveId(req.params.userId, "user id");
  if (Number(workspace.ownerId) === userId) throw new ApiError(409, "The workspace owner role cannot be changed");
  if (!["admin", "member"].includes(req.body?.role)) throw new ApiError(400, "role must be admin or member");
  const membership = await WorkspaceMember.findOne({ where: { workspaceId: workspace.id, userId } });
  if (!membership) throw new ApiError(404, "Workspace member not found");
  await membership.update({ role: req.body.role });
  return res.json({ message: "Workspace role updated", membership });
};

export const getWorkspaceCollaborators = async (req, res) => {
  const workspace = await findWorkspaceForUser(req.params.id, req.user.id);
  const fullWorkspace = await Workspace.findByPk(workspace.id, { include: [memberInclude] });
  const boards = await Board.findAll({ where: { workspaceId: workspace.id, archived: false }, include: [{ model: User, as: "members", attributes: ["id", "name", "email"], through: { attributes: ["role"] } }] });
  const memberIds = new Set(fullWorkspace.members.map((member) => String(member.id)));
  const guestMap = new Map();
  for (const board of boards) for (const user of board.members) {
    if (memberIds.has(String(user.id))) continue;
    const existing = guestMap.get(String(user.id)) ?? { id: user.id, name: user.name, email: user.email, boards: [] };
    existing.boards.push({ id: board.id, title: board.title, slug: board.slug });
    guestMap.set(String(user.id), existing);
  }
  const invites = await WorkspaceInvite.findAll({ where: { workspaceId: workspace.id, revokedAt: null, expiresAt: { [Op.gt]: new Date() } }, attributes: ["id", "token", "expiresAt", "createdAt"], order: [["createdAt", "DESC"]] });
  return res.json({ members: fullWorkspace.members, guests: [...guestMap.values()], invites });
};

export const createWorkspaceInvite = async (req, res) => {
  const workspace = await requireWorkspaceAdmin(req.params.id, req.user.id);
  const invite = await WorkspaceInvite.create({ workspaceId: workspace.id, createdBy: req.user.id, token: crypto.randomBytes(36).toString("base64url"), expiresAt: new Date(Date.now() + 7 * 86400000) });
  return res.status(201).json({ invite: { id: invite.id, token: invite.token, expiresAt: invite.expiresAt } });
};

export const revokeWorkspaceInvite = async (req, res) => {
  const workspace = await requireWorkspaceAdmin(req.params.id, req.user.id);
  const invite = await WorkspaceInvite.findOne({ where: { id: positiveId(req.params.inviteId, "invite id"), workspaceId: workspace.id } });
  if (!invite) throw new ApiError(404, "Invitation not found");
  await invite.update({ revokedAt: new Date() });
  return res.status(204).send();
};
