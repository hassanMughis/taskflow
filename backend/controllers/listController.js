import sequelize from "../config/db.js";
import { Card, List } from "../models/index.js";
import { findListForUser, requireBoardWriteAccess } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { positiveId, requireText } from "../utils/validation.js";
import { nextPosition } from "../utils/ordering.js";
import { copyCardToList } from "../services/copyService.js";
import { recordActivity } from "../services/activityService.js";

export const createList = async (req, res) => {
  const board = await requireBoardWriteAccess(req.params.boardId, req.user.id);
  const title = requireText(req.body?.title, "List title", 120);
  const position = await nextPosition(List, { boardId: board.id, archived: false });
  const list = await List.create({ boardId: board.id, title, position });
  await recordActivity({ boardId: board.id, actorId: req.user.id, type: "list_created", message: `created list ${title}` });
  return res.status(201).json({ message: "List created successfully", list });
};

export const updateList = async (req, res) => {
  const list = await findListForUser(req.params.listId, req.user.id);
  const update = {};
  if (req.body?.title !== undefined) update.title = requireText(req.body.title, "List title", 120);
  if (req.body?.archived !== undefined) {
    if (typeof req.body.archived !== "boolean") throw new ApiError(400, "archived must be true or false");
    update.archived = req.body.archived;
  }
  if (!Object.keys(update).length) throw new ApiError(400, "No supported list fields were provided");
  await list.update(update);
  await recordActivity({ boardId: list.accessibleBoard.id, actorId: req.user.id, type: update.archived ? "list_archived" : "list_updated", message: update.archived ? `archived list ${list.title}` : `updated list ${list.title}` });
  return res.json({ message: "List updated successfully", list });
};

export const reorderLists = async (req, res) => {
  const board = await requireBoardWriteAccess(req.params.boardId, req.user.id);
  const listIds = req.body?.listIds;
  if (!Array.isArray(listIds) || !listIds.length) throw new ApiError(400, "listIds must be a non-empty array");
  const normalized = listIds.map((id) => positiveId(id, "list id"));
  if (new Set(normalized).size !== normalized.length) throw new ApiError(400, "listIds cannot contain duplicates");

  const lists = await List.findAll({ where: { boardId: board.id, archived: false }, attributes: ["id"] });
  const existing = lists.map((item) => Number(item.id)).sort((a, b) => a - b);
  const requested = [...normalized].sort((a, b) => a - b);
  if (existing.length !== requested.length || existing.some((id, index) => id !== requested[index])) {
    throw new ApiError(400, "listIds must contain every active list on the board exactly once");
  }

  await sequelize.transaction(async (transaction) => {
    await Promise.all(normalized.map((id, position) => List.update({ position }, { where: { id }, transaction })));
  });
  await recordActivity({ boardId: board.id, actorId: req.user.id, type: "lists_reordered", message: "reordered the lists" });
  return res.json({ message: "Lists reordered successfully" });
};

export const deleteList = async (req, res) => {
  const list = await findListForUser(req.params.listId, req.user.id);
  await recordActivity({ boardId: list.accessibleBoard.id, actorId: req.user.id, type: "list_deleted", message: `deleted list ${list.title}` });
  await list.destroy();
  return res.status(204).send();
};

export const copyList = async (req, res) => {
  const source = await findListForUser(req.params.listId, req.user.id);
  const result = await sequelize.transaction(async (transaction) => {
    const created = await List.create({ boardId: source.boardId, title: `${source.title} (copy)`, position: await nextPosition(List, { boardId: source.boardId, archived: false }, transaction) }, { transaction });
    const cards = await Card.findAll({ where: { listId: source.id, archived: false }, order: [["position", "ASC"]], transaction });
    const copiedCards = [];
    for (const card of cards) copiedCards.push(await copyCardToList({ sourceCardId: card.id, targetListId: created.id, creatorId: req.user.id, transaction }));
    return { list: created, cards: copiedCards };
  });
  await recordActivity({ boardId: source.accessibleBoard.id, actorId: req.user.id, type: "list_copied", message: `copied list ${source.title}` });
  return res.status(201).json({ message: "List copied successfully", ...result });
};
