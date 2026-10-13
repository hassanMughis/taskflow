import sequelize from "../config/db.js";
import { Op } from "sequelize";
import { Board, BoardMember, Card, CardMember, InboxItem, List, WorkspaceMember } from "../models/index.js";
import { findListForUser } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { optionalText, positiveId, requireText } from "../utils/validation.js";
import { nextPosition } from "../utils/ordering.js";
import { recordActivity } from "../services/activityService.js";

const findOwnItem = async (itemId, userId) => {
  const item = await InboxItem.findOne({ where: { id: positiveId(itemId, "inbox item id"), userId } });
  if (!item) throw new ApiError(404, "Inbox item not found");
  return item;
};

export const getInbox = async (req, res) => {
  const items = await InboxItem.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
  const memberships = await BoardMember.findAll({ where: { userId: req.user.id }, attributes: ["boardId"] });
  const boardIds = memberships.map((membership) => membership.boardId);
  const workspaceMemberships = await WorkspaceMember.findAll({ where: { userId: req.user.id }, attributes: ["workspaceId"] });
  const workspaceIds = workspaceMemberships.map((membership) => membership.workspaceId);
  const boards = await Board.findAll({
    where: {
      archived: false,
      [Op.or]: [
        { id: { [Op.in]: boardIds.length ? boardIds : [0] } },
        { workspaceId: { [Op.in]: workspaceIds.length ? workspaceIds : [0] }, visibility: "workspace" },
        { visibility: "public" },
      ],
    },
    attributes: ["id", "title", "slug"],
    include: [{ model: List, as: "lists", where: { archived: false }, required: false, attributes: ["id", "title", "position"] }],
    order: [["title", "ASC"], [{ model: List, as: "lists" }, "position", "ASC"]],
  });
  return res.json({ items, boards });
};

export const createInboxItem = async (req, res) => {
  const item = await InboxItem.create({ userId: req.user.id, title: requireText(req.body?.title, "Title", 255), description: optionalText(req.body?.description, "Description") });
  return res.status(201).json({ item });
};

export const updateInboxItem = async (req, res) => {
  const item = await findOwnItem(req.params.itemId, req.user.id);
  const update = {};
  if (req.body?.title !== undefined) update.title = requireText(req.body.title, "Title", 255);
  if (req.body?.description !== undefined) update.description = optionalText(req.body.description, "Description");
  if (!Object.keys(update).length) throw new ApiError(400, "No supported inbox item fields were provided");
  await item.update(update);
  return res.json({ item });
};

export const deleteInboxItem = async (req, res) => {
  const item = await findOwnItem(req.params.itemId, req.user.id);
  await item.destroy();
  return res.status(204).send();
};

export const convertInboxItem = async (req, res) => {
  const item = await findOwnItem(req.params.itemId, req.user.id);
  const list = await findListForUser(req.body?.listId, req.user.id);
  const card = await sequelize.transaction(async (transaction) => {
    const position = await nextPosition(Card, { listId: list.id, archived: false }, transaction);
    const created = await Card.create({ listId: list.id, creatorId: req.user.id, title: item.title, description: item.description, position }, { transaction });
    await BoardMember.findOrCreate({ where: { boardId: list.accessibleBoard.id, userId: req.user.id }, defaults: { role: Number(list.accessibleBoard.ownerId) === Number(req.user.id) ? "owner" : "member" }, transaction });
    await CardMember.create({ cardId: created.id, userId: req.user.id }, { transaction });
    await item.destroy({ transaction });
    return created;
  });
  await recordActivity({ boardId: list.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: "card_created", message: `moved ${card.title} from Inbox to ${list.title}` });
  return res.status(201).json({ card, board: { id: list.accessibleBoard.id, slug: list.accessibleBoard.slug } });
};
