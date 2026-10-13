import { Op } from "sequelize";
import { Board, BoardActivity, BoardMember, Card, CardMember, Checklist, ChecklistItem, List, User, Workspace, WorkspaceMember } from "../models/index.js";

export async function getHome(req, res) {
  const workspaceMemberships = await WorkspaceMember.findAll({ where: { userId: req.user.id }, attributes: ["workspaceId"] });
  const workspaceIds = workspaceMemberships.map((membership) => membership.workspaceId);
  const workspaces = await Workspace.findAll({ where: { id: { [Op.in]: workspaceIds.length ? workspaceIds : [0] } }, attributes: ["id", "name"], order: [["name", "ASC"]] });
  const boardMemberships = await BoardMember.findAll({ where: { userId: req.user.id }, attributes: ["boardId"] });
  const memberBoardIds = boardMemberships.map((membership) => membership.boardId);
  const requestedWorkspaceId = req.query.workspaceId ? Number(req.query.workspaceId) : null;
  const boardWhere = {
    archived: false,
    ...(requestedWorkspaceId ? { workspaceId: requestedWorkspaceId } : {}),
    [Op.or]: [
      { id: { [Op.in]: memberBoardIds.length ? memberBoardIds : [0] } },
      { workspaceId: { [Op.in]: workspaceIds.length ? workspaceIds : [0] }, visibility: "workspace" },
      { visibility: "public" },
    ],
  };
  const accessibleBoards = await Board.findAll({ where: boardWhere, attributes: ["id", "workspaceId", "title", "slug", "coverUrl", "starred", "updatedAt"], include: [{ model: Workspace, as: "workspace", attributes: ["id", "name"] }] });
  const boardIds = accessibleBoards.map((board) => board.id);
  const assignments = await CardMember.findAll({ where: { userId: req.user.id }, attributes: ["cardId"] });
  const assignedCardIds = assignments.map((assignment) => assignment.cardId);
  const assignedCards = boardIds.length && assignedCardIds.length ? await Card.findAll({
    where: { id: { [Op.in]: assignedCardIds }, archived: false },
    attributes: ["id", "title", "completed", "dueDate", "dueTime", "updatedAt"],
    include: [{ model: List, as: "list", required: true, attributes: ["id", "title"], where: { archived: false, boardId: { [Op.in]: boardIds } }, include: [{ model: Board, as: "board", attributes: ["id", "title", "slug", "workspaceId"] }] }],
    order: [["dueDate", "ASC"], ["updatedAt", "DESC"]],
    limit: 50,
  }) : [];
  const checklistItems = boardIds.length ? await ChecklistItem.findAll({
    where: { assigneeId: req.user.id, completed: false },
    include: [{ model: Checklist, as: "checklist", attributes: ["id", "title"], required: true, include: [{ model: Card, as: "card", attributes: ["id", "title"], required: true, include: [{ model: List, as: "list", attributes: ["id"], where: { boardId: { [Op.in]: boardIds } }, include: [{ model: Board, as: "board", attributes: ["id", "title", "slug"] }] }] }] }],
    order: [["dueDate", "ASC"], ["createdAt", "DESC"]], limit: 30,
  }) : [];
  const activities = boardIds.length ? await BoardActivity.findAll({ where: { boardId: { [Op.in]: boardIds } }, include: [{ model: User, as: "actor", attributes: ["id", "name"] }, { model: Board, as: "board", attributes: ["id", "title", "slug"] }], order: [["createdAt", "DESC"]], limit: 20 }) : [];
  const starredBoards = accessibleBoards.filter((board) => board.starred);
  const recentBoards = [...accessibleBoards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  return res.json({ generatedAt: new Date().toISOString(), workspaces, assignedCards, checklistItems, activities, starredBoards, recentBoards });
}
