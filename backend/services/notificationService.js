import { Op } from "sequelize";
import { CardMember, Notification } from "../models/index.js";

export const notifyCardMembers = async ({ card, actorId, type, message }) => {
  const assignments = await CardMember.findAll({
    where: { cardId: card.id, userId: { [Op.ne]: actorId } },
    attributes: ["userId"],
  });
  if (!assignments.length) return;
  await Notification.bulkCreate(assignments.map(({ userId }) => ({
    userId, actorId, boardId: card.accessibleBoard.id, cardId: card.id, type, message,
  })));
};
