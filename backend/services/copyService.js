import { Attachment, Card, CardLabel, CardMember, Checklist, ChecklistItem, CustomField, Label, User } from "../models/index.js";
import { nextPosition } from "../utils/ordering.js";

export async function copyCardToList({ sourceCardId, targetListId, creatorId, transaction }) {
  const source = await Card.findByPk(sourceCardId, {
    include: [
      { model: Label, as: "labels", through: { attributes: [] } },
      { model: User, as: "members", attributes: ["id"], through: { attributes: [] } },
      { model: Attachment, as: "attachments" },
      { model: CustomField, as: "customFields" },
      { model: Checklist, as: "checklists", include: [{ model: ChecklistItem, as: "items" }] },
    ],
    transaction,
  });
  const position = await nextPosition(Card, { listId: targetListId, archived: false }, transaction);
  const copy = await Card.create({
    listId: targetListId, creatorId, title: `${source.title} (copy)`, description: source.description,
    position, completed: source.completed, coverUrl: source.coverUrl, coverColor: source.coverColor,
    coverSize: source.coverSize, startDate: source.startDate, dueDate: source.dueDate,
    dueTime: source.dueTime, recurring: source.recurring, reminder: source.reminder,
  }, { transaction });

  if (source.labels.length) await CardLabel.bulkCreate(source.labels.map((label) => ({ cardId: copy.id, labelId: label.id })), { transaction });
  const memberIds = new Set(source.members.map((member) => Number(member.id)));
  memberIds.add(Number(creatorId));
  await CardMember.bulkCreate([...memberIds].map((userId) => ({ cardId: copy.id, userId })), { transaction, ignoreDuplicates: true });
  if (source.attachments.length) await Attachment.bulkCreate(source.attachments.map((attachment) => ({ cardId: copy.id, uploaderId: attachment.uploaderId, name: attachment.name, url: attachment.url, mimeType: attachment.mimeType, size: attachment.size })), { transaction });
  if (source.customFields.length) await CustomField.bulkCreate(source.customFields.map((field) => ({ cardId: copy.id, name: field.name, value: field.value, position: field.position })), { transaction });
  for (const checklist of source.checklists) {
    const checklistCopy = await Checklist.create({ cardId: copy.id, title: checklist.title, position: checklist.position }, { transaction });
    if (checklist.items.length) await ChecklistItem.bulkCreate(checklist.items.map((item) => ({ checklistId: checklistCopy.id, title: item.title, completed: item.completed, dueDate: item.dueDate, assigneeId: item.assigneeId, position: item.position })), { transaction });
  }
  return copy;
}
