import { BoardMember, Checklist, ChecklistItem, User } from "../models/index.js";
import { findCardForUser } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { dateValue, positiveId, requireText } from "../utils/validation.js";
import { nextPosition } from "../utils/ordering.js";
import { recordActivity } from "../services/activityService.js";

const checklistWithItems = [{ model: ChecklistItem, as: "items", include: [{ model: User, as: "assignee", attributes: ["id", "name", "email"] }] }];

async function checklistForUser(id, userId) {
  const checklist = await Checklist.findByPk(positiveId(id, "checklist id"));
  if (!checklist) throw new ApiError(404, "Checklist not found");
  await findCardForUser(checklist.cardId, userId);
  return checklist;
}

async function itemForUser(id, userId) {
  const item = await ChecklistItem.findByPk(positiveId(id, "checklist item id"), { include: [{ model: Checklist, as: "checklist" }] });
  if (!item) throw new ApiError(404, "Checklist item not found");
  item.accessibleCard = await findCardForUser(item.checklist.cardId, userId);
  return item;
}

export async function addChecklist(req, res) {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const checklist = await Checklist.create({ cardId: card.id, title: requireText(req.body?.title, "Checklist title", 120), position: await nextPosition(Checklist, { cardId: card.id }) });
  await recordActivity({ boardId: card.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: "checklist_added", message: `added checklist ${checklist.title} to ${card.title}` });
  return res.status(201).json({ message: "Checklist added successfully", checklist: await Checklist.findByPk(checklist.id, { include: checklistWithItems }) });
}

export async function updateChecklist(req, res) {
  const checklist = await checklistForUser(req.params.checklistId, req.user.id);
  if (req.body?.title === undefined) throw new ApiError(400, "No supported checklist fields were provided");
  await checklist.update({ title: requireText(req.body.title, "Checklist title", 120) });
  return res.json({ message: "Checklist updated successfully", checklist });
}

export async function deleteChecklist(req, res) {
  const checklist = await checklistForUser(req.params.checklistId, req.user.id);
  await checklist.destroy();
  return res.status(204).send();
}

export async function addChecklistItem(req, res) {
  const checklist = await checklistForUser(req.params.checklistId, req.user.id);
  const item = await ChecklistItem.create({ checklistId: checklist.id, title: requireText(req.body?.title, "Checklist item", 255), position: await nextPosition(ChecklistItem, { checklistId: checklist.id }) });
  return res.status(201).json({ message: "Checklist item added successfully", item });
}

export async function updateChecklistItem(req, res) {
  const item = await itemForUser(req.params.itemId, req.user.id);
  const update = {};
  if (req.body?.title !== undefined) update.title = requireText(req.body.title, "Checklist item", 255);
  if (req.body?.completed !== undefined) {
    if (typeof req.body.completed !== "boolean") throw new ApiError(400, "completed must be true or false");
    update.completed = req.body.completed;
  }
  if (req.body?.dueDate !== undefined) update.dueDate = dateValue(req.body.dueDate, "Checklist item due date");
  if (req.body?.assigneeId !== undefined) {
    if (req.body.assigneeId === null) update.assigneeId = null;
    else {
      const assigneeId = positiveId(req.body.assigneeId, "assignee id");
      const board = item.accessibleCard.accessibleBoard;
      const isOwner = Number(board.ownerId) === assigneeId;
      const isMember = isOwner || await BoardMember.count({ where: { boardId: board.id, userId: assigneeId } });
      if (!isMember) throw new ApiError(400, "Assignee must be a board member");
      update.assigneeId = assigneeId;
    }
  }
  if (!Object.keys(update).length) throw new ApiError(400, "No supported checklist item fields were provided");
  await item.update(update);
  return res.json({ message: "Checklist item updated successfully", item });
}

export async function deleteChecklistItem(req, res) {
  const item = await itemForUser(req.params.itemId, req.user.id);
  await item.destroy();
  return res.status(204).send();
}
