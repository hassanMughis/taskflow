import { BoardPowerUp } from "../models/index.js";
import { findBoardForUser, requireBoardAdmin } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";

const supported = ["calendar", "table", "card_aging"];
const defaults = { calendar: true, table: true, card_aging: false };

export async function getPowerUps(req, res) {
  const board = await findBoardForUser(req.params.boardId, req.user.id);
  const records = await BoardPowerUp.findAll({ where: { boardId: board.id } });
  const powerUps = { ...defaults };
  for (const record of records) powerUps[record.key] = record.enabled;
  return res.json({ powerUps });
}

export async function setPowerUp(req, res) {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  const key = String(req.params.key);
  if (!supported.includes(key)) throw new ApiError(404, "Power-Up not found");
  if (typeof req.body?.enabled !== "boolean") throw new ApiError(400, "enabled must be true or false");
  const [powerUp] = await BoardPowerUp.upsert({ boardId: board.id, key, enabled: req.body.enabled }, { returning: true });
  return res.json({ powerUp });
}
