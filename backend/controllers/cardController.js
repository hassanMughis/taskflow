import sequelize from "../config/db.js";
import { BoardMember, Card, CardLabel, CardMember, Label, List, Notification } from "../models/index.js";
import { findCardForUser, findListForUser } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { dateValue, optionalHexColor, optionalText, positiveId, positionValue, requireText } from "../utils/validation.js";
import { nextPosition } from "../utils/ordering.js";
import { copyCardToList } from "../services/copyService.js";
import { recordActivity } from "../services/activityService.js";
import { runCardAutomations } from "../services/automationService.js";

const editableFields = {
  description: (value) => optionalText(value, "Description"),
  coverUrl: (value) => optionalText(value, "Cover URL", 7000000),
  coverColor: (value) => optionalHexColor(value, "Cover color"),
  recurring: (value) => optionalText(value, "Recurring rule", 40),
  reminder: (value) => optionalText(value, "Reminder", 40),
};

const validateTime = (value) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    throw new ApiError(400, "dueTime must use HH:MM format");
  }
  return value;
};

export const createCard = async (req, res) => {
  const list = await findListForUser(req.params.listId, req.user.id);
  const title = requireText(req.body?.title, "Card title", 255);
  const card = await sequelize.transaction(async (transaction) => {
    const position = await nextPosition(Card, { listId: list.id, archived: false }, transaction);
    const created = await Card.create({ listId: list.id, creatorId: req.user.id, title, position }, { transaction });
    await BoardMember.findOrCreate({
      where: { boardId: list.accessibleBoard.id, userId: req.user.id },
      defaults: { role: Number(list.accessibleBoard.ownerId) === Number(req.user.id) ? "owner" : "member" },
      transaction,
    });
    await CardMember.create({ cardId: created.id, userId: req.user.id }, { transaction });
    return created;
  });
  await recordActivity({ boardId: list.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: "card_created", message: `added card ${card.title} to ${list.title}` });
  await runCardAutomations({ boardId: list.accessibleBoard.id, cardId: card.id, eventType: "card_created", listId: list.id, actorId: req.user.id });
  await card.reload();
  return res.status(201).json({ message: "Card created successfully", card });
};

export const updateCard = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const update = {};
  if (req.body?.title !== undefined) update.title = requireText(req.body.title, "Card title", 255);
  for (const [field, validator] of Object.entries(editableFields)) {
    if (req.body?.[field] !== undefined) update[field] = validator(req.body[field]);
  }
  for (const field of ["completed", "archived"]) {
    if (req.body?.[field] !== undefined) {
      if (typeof req.body[field] !== "boolean") throw new ApiError(400, `${field} must be true or false`);
      update[field] = req.body[field];
    }
  }
  if (req.body?.coverSize !== undefined) {
    if (!["header", "full"].includes(req.body.coverSize)) throw new ApiError(400, "coverSize must be header or full");
    update.coverSize = req.body.coverSize;
  }
  if (req.body?.startDate !== undefined) update.startDate = dateValue(req.body.startDate, "startDate");
  if (req.body?.dueDate !== undefined) update.dueDate = dateValue(req.body.dueDate, "dueDate");
  if (req.body?.dueTime !== undefined) update.dueTime = validateTime(req.body.dueTime);
  if (!Object.keys(update).length) throw new ApiError(400, "No supported card fields were provided");
  await card.update(update);
  await recordActivity({ boardId: card.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: update.archived ? "card_archived" : "card_updated", message: update.archived ? `archived card ${card.title}` : `updated card ${card.title}` });
  return res.json({ message: "Card updated successfully", card });
};

export const moveCard = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const destinationList = await findListForUser(req.body?.listId, req.user.id);
  if (Number(destinationList.boardId) !== Number(card.accessibleBoard.id)) {
    throw new ApiError(400, "Cards can only move between lists on the same board");
  }
  const requestedPosition = positionValue(req.body?.position);

  await sequelize.transaction(async (transaction) => {
    const sourceListId = card.listId;
    const sourceCards = await Card.findAll({
      where: { listId: sourceListId, archived: false }, order: [["position", "ASC"], ["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE,
    });
    const destinationCards = Number(sourceListId) === Number(destinationList.id)
      ? sourceCards
      : await Card.findAll({ where: { listId: destinationList.id, archived: false }, order: [["position", "ASC"], ["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });

    const sourceWithoutCard = sourceCards.filter((item) => Number(item.id) !== Number(card.id));
    const targetWithoutCard = Number(sourceListId) === Number(destinationList.id)
      ? sourceWithoutCard
      : destinationCards.filter((item) => Number(item.id) !== Number(card.id));
    const insertion = Math.min(requestedPosition, targetWithoutCard.length);
    targetWithoutCard.splice(insertion, 0, card);

    await card.update({ listId: destinationList.id, position: insertion }, { transaction });
    await Promise.all(sourceWithoutCard.map((item, position) => item.update({ position }, { transaction })));
    await Promise.all(targetWithoutCard.map((item, position) => item.update({ listId: destinationList.id, position }, { transaction })));
  });
  await recordActivity({ boardId: card.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: "card_moved", message: `moved card ${card.title} to ${destinationList.title}` });
  await runCardAutomations({ boardId: card.accessibleBoard.id, cardId: card.id, eventType: "card_moved", listId: destinationList.id, actorId: req.user.id });

  return res.json({ message: "Card moved successfully" });
};

export const setCardLabel = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const labelId = positiveId(req.params.labelId, "label id");
  const label = await Label.findOne({ where: { id: labelId, boardId: card.accessibleBoard.id } });
  if (!label) throw new ApiError(404, "Label not found on this board");
  await CardLabel.findOrCreate({ where: { cardId: card.id, labelId } });
  return res.status(204).send();
};

export const removeCardLabel = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  await CardLabel.destroy({ where: { cardId: card.id, labelId: positiveId(req.params.labelId, "label id") } });
  return res.status(204).send();
};

export const setCardMember = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const userId = positiveId(req.params.userId, "user id");
  const boardMember = await BoardMember.findOne({ where: { boardId: card.accessibleBoard.id, userId } });
  if (!boardMember && Number(card.accessibleBoard.ownerId) !== userId) throw new ApiError(400, "User must be a board member first");
  const [, created] = await CardMember.findOrCreate({ where: { cardId: card.id, userId } });
  if (created && userId !== Number(req.user.id)) {
    await Notification.create({
      userId, actorId: req.user.id, boardId: card.accessibleBoard.id, cardId: card.id,
      type: "card_assignment", message: `You were assigned to ${card.title}`,
    });
  }
  return res.status(204).send();
};

export const removeCardMember = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const userId = positiveId(req.params.userId, "user id");
  if (Number(card.creatorId) === userId || Number(card.accessibleBoard.ownerId) === userId) {
    throw new ApiError(409, "The card creator and board owner cannot be unassigned");
  }
  await CardMember.destroy({ where: { cardId: card.id, userId } });
  return res.status(204).send();
};

export const deleteCard = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  await recordActivity({ boardId: card.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: "card_deleted", message: `deleted card ${card.title}` });
  await card.destroy();
  return res.status(204).send();
};

export const copyCard = async (req, res) => {
  const source = await findCardForUser(req.params.cardId, req.user.id);
  const targetList = req.body?.listId ? await findListForUser(req.body.listId, req.user.id) : await findListForUser(source.listId, req.user.id);
  if (Number(targetList.boardId) !== Number(source.accessibleBoard.id)) throw new ApiError(400, "Cards can only be copied within the same board");
  const card = await sequelize.transaction((transaction) => copyCardToList({ sourceCardId: source.id, targetListId: targetList.id, creatorId: req.user.id, transaction }));
  await recordActivity({ boardId: source.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: "card_copied", message: `copied card ${source.title}` });
  return res.status(201).json({ message: "Card copied successfully", card });
};
