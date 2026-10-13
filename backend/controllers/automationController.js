import { BoardAutomation, List } from "../models/index.js";
import { findBoardForUser, requireBoardAdmin } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { positiveId, requireText } from "../utils/validation.js";

const triggerTypes = ["card_created", "card_moved"];
const actionTypes = ["mark_complete", "move_to_list"];

async function validateList(boardId, value, field) {
  if (value === null || value === undefined || value === "") return null;
  const id = positiveId(value, field);
  if (!await List.count({ where: { id, boardId, archived: false } })) throw new ApiError(400, `${field} must belong to this board`);
  return id;
}

export async function getAutomations(req, res) {
  const board = await findBoardForUser(req.params.boardId, req.user.id);
  const automations = await BoardAutomation.findAll({ where: { boardId: board.id }, order: [["createdAt", "DESC"]] });
  return res.json({ automations });
}

export async function createAutomation(req, res) {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  const name = requireText(req.body?.name, "Automation name", 160);
  const triggerType = req.body?.triggerType;
  const actionType = req.body?.actionType;
  if (!triggerTypes.includes(triggerType)) throw new ApiError(400, "Unsupported automation trigger");
  if (!actionTypes.includes(actionType)) throw new ApiError(400, "Unsupported automation action");
  const triggerListId = await validateList(board.id, req.body?.triggerListId, "trigger list");
  const actionListId = await validateList(board.id, req.body?.actionListId, "action list");
  if (actionType === "move_to_list" && !actionListId) throw new ApiError(400, "A destination list is required");
  const automation = await BoardAutomation.create({ boardId: board.id, name, triggerType, triggerListId, actionType, actionListId });
  return res.status(201).json({ automation });
}

export async function updateAutomation(req, res) {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  const automation = await BoardAutomation.findOne({ where: { id: positiveId(req.params.automationId, "automation id"), boardId: board.id } });
  if (!automation) throw new ApiError(404, "Automation not found");
  if (typeof req.body?.enabled !== "boolean") throw new ApiError(400, "enabled must be true or false");
  await automation.update({ enabled: req.body.enabled });
  return res.json({ automation });
}

export async function deleteAutomation(req, res) {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  const deleted = await BoardAutomation.destroy({ where: { id: positiveId(req.params.automationId, "automation id"), boardId: board.id } });
  if (!deleted) throw new ApiError(404, "Automation not found");
  return res.status(204).send();
}
