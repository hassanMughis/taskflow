import { Op } from "sequelize";
import { Board, BoardMember, Card, List, WorkspaceMember } from "../models/index.js";

export async function search(req, res) {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) return res.json({ boards: [], cards: [] });
  const memberships = await BoardMember.findAll({ where: { userId: req.user.id }, attributes: ["boardId"] });
  const workspaceMemberships = await WorkspaceMember.findAll({ where: { userId: req.user.id }, attributes: ["workspaceId"] });
  const memberBoardIds = memberships.map((membership) => membership.boardId);
  const workspaceIds = workspaceMemberships.map((membership) => membership.workspaceId);
  const accessWhere = { [Op.or]: [{ id: { [Op.in]: memberBoardIds.length ? memberBoardIds : [0] } }, { workspaceId: { [Op.in]: workspaceIds.length ? workspaceIds : [0] }, visibility: "workspace" }, { visibility: "public" }] };
  const accessibleBoards = await Board.findAll({ where: { archived: false, ...accessWhere }, attributes: ["id"] });
  const boardIds = accessibleBoards.map((board) => board.id);
  if (!boardIds.length) return res.json({ boards: [], cards: [] });
  const boards = await Board.findAll({ where: { id: { [Op.in]: boardIds }, archived: false, title: { [Op.iLike]: `%${query}%` } }, attributes: ["id", "title", "slug", "coverUrl"], limit: 8 });
  const cards = await Card.findAll({
    where: { archived: false, [Op.or]: [{ title: { [Op.iLike]: `%${query}%` } }, { description: { [Op.iLike]: `%${query}%` } }] },
    attributes: ["id", "title"],
    include: [{ model: List, as: "list", required: true, attributes: ["id", "title"], where: { archived: false, boardId: { [Op.in]: boardIds } }, include: [{ model: Board, as: "board", attributes: ["id", "title", "slug"], where: { archived: false } }] }],
    limit: 12,
    order: [["updatedAt", "DESC"]],
  });
  return res.json({ boards, cards });
}
