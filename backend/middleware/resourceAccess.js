import { Board, BoardMember, Card, List, Workspace, WorkspaceMember } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { positiveId } from "../utils/validation.js";

export const findWorkspaceForUser = async (workspaceId, userId, options = {}) => {
  const id = positiveId(workspaceId, "workspace id");
  const workspace = await Workspace.findOne({
    where: { id },
    ...options,
  });

  if (!workspace) throw new ApiError(404, "Workspace not found");
  if (Number(workspace.ownerId) === Number(userId)) return workspace;

  const membership = await WorkspaceMember.findOne({ where: { workspaceId: id, userId } });
  if (!membership) throw new ApiError(404, "Workspace not found");
  workspace.currentMembership = membership;
  return workspace;
};

export const requireWorkspaceAdmin = async (workspaceId, userId) => {
  const workspace = await findWorkspaceForUser(workspaceId, userId);
  if (Number(workspace.ownerId) === Number(userId)) return workspace;
  if (!["owner", "admin"].includes(workspace.currentMembership?.role)) {
    throw new ApiError(403, "Workspace admin access is required");
  }
  return workspace;
};

export const findBoardForUser = async (boardIdOrSlug, userId) => {
  const numericId = Number(boardIdOrSlug);
  const where = Number.isSafeInteger(numericId) && numericId > 0
    ? { id: numericId }
    : { slug: String(boardIdOrSlug) };
  const board = await Board.findOne({ where });
  if (!board) throw new ApiError(404, "Board not found");
  if (board.visibility === "public") return board;
  if (Number(board.ownerId) === Number(userId)) return board;

  const boardMembership = await BoardMember.findOne({ where: { boardId: board.id, userId } });
  if (!boardMembership && board.visibility === "workspace") {
    const workspaceMembership = await WorkspaceMember.findOne({ where: { workspaceId: board.workspaceId, userId } });
    if (workspaceMembership) return board;
  }
  if (!boardMembership) throw new ApiError(404, "Board not found");
  board.currentMembership = boardMembership;
  return board;
};

export const requireBoardAdmin = async (boardIdOrSlug, userId) => {
  const board = await findBoardForUser(boardIdOrSlug, userId);
  if (Number(board.ownerId) === Number(userId)) return board;
  const membership = board.currentMembership ?? await BoardMember.findOne({ where: { boardId: board.id, userId } });
  if (["owner", "admin"].includes(membership?.role)) return board;
  const workspaceMembership = await WorkspaceMember.findOne({ where: { workspaceId: board.workspaceId, userId } });
  if (!["owner", "admin"].includes(workspaceMembership?.role)) throw new ApiError(403, "Board admin access is required");
  return board;
};

export const requireBoardWriteAccess = async (boardIdOrSlug, userId) => {
  const board = await findBoardForUser(boardIdOrSlug, userId);
  if (Number(board.ownerId) === Number(userId)) return board;
  const boardMembership = board.currentMembership ?? await BoardMember.findOne({ where: { boardId: board.id, userId } });
  if (boardMembership) {
    board.currentMembership = boardMembership;
    return board;
  }
  if (board.visibility !== "private") {
    const workspaceMembership = await WorkspaceMember.findOne({ where: { workspaceId: board.workspaceId, userId } });
    if (workspaceMembership) return board;
  }
  throw new ApiError(403, "Board membership is required to make changes");
};

export const findListForUser = async (listId, userId) => {
  const list = await List.findByPk(positiveId(listId, "list id"));
  if (!list) throw new ApiError(404, "List not found");
  list.accessibleBoard = await requireBoardWriteAccess(list.boardId, userId);
  return list;
};

export const findCardForUser = async (cardId, userId) => {
  const card = await Card.findByPk(positiveId(cardId, "card id"), {
    include: [{ model: List, as: "list", attributes: ["id", "boardId"] }],
  });
  if (!card) throw new ApiError(404, "Card not found");
  card.accessibleBoard = await requireBoardWriteAccess(card.list.boardId, userId);
  return card;
};
