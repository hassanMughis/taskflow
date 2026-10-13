import sequelize from "../config/db.js";
import { BoardAutomation, Card, List } from "../models/index.js";
import { nextPosition } from "../utils/ordering.js";
import { recordActivity } from "./activityService.js";

export async function runCardAutomations({ boardId, cardId, eventType, listId, actorId }) {
  const rules = await BoardAutomation.findAll({ where: { boardId, triggerType: eventType, enabled: true }, order: [["id", "ASC"]] });
  const matching = rules.filter((rule) => !rule.triggerListId || Number(rule.triggerListId) === Number(listId));
  if (!matching.length) return [];
  const card = await Card.findByPk(cardId);
  if (!card) return [];
  const applied = [];

  for (const rule of matching) {
    if (rule.actionType === "mark_complete" && !card.completed) {
      await card.update({ completed: true });
      applied.push(rule);
    }
    if (rule.actionType === "move_to_list" && rule.actionListId && Number(card.listId) !== Number(rule.actionListId)) {
      const target = await List.findOne({ where: { id: rule.actionListId, boardId, archived: false } });
      if (!target) continue;
      await sequelize.transaction(async (transaction) => {
        const position = await nextPosition(Card, { listId: target.id, archived: false }, transaction);
        await card.update({ listId: target.id, position }, { transaction });
      });
      applied.push(rule);
    }
    if (applied.at(-1) === rule) await recordActivity({ boardId, cardId, actorId, type: "automation_ran", message: `ran automation ${rule.name}` });
  }
  return applied;
}
