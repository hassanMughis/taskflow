import { BoardActivity } from "../models/index.js";

export function recordActivity({ boardId, cardId = null, actorId, type, message, transaction }) {
  return BoardActivity.create({ boardId, cardId, actorId, type, message }, { transaction });
}
