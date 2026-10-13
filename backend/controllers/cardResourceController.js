import { Attachment, Comment, CustomField, User } from "../models/index.js";
import { findCardForUser } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { optionalText, positiveId, requireText } from "../utils/validation.js";
import { notifyCardMembers } from "../services/notificationService.js";
import { nextPosition } from "../utils/ordering.js";
import { recordActivity } from "../services/activityService.js";

export const addComment = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const comment = await Comment.create({ cardId: card.id, authorId: req.user.id, text: requireText(req.body?.text, "Comment", 5000) });
  const result = await Comment.findByPk(comment.id, { include: [{ model: User, as: "author", attributes: ["id", "name"] }] });
  await notifyCardMembers({ card, actorId: req.user.id, type: "card_comment", message: `A new comment was added to ${card.title}` });
  await recordActivity({ boardId: card.accessibleBoard.id, cardId: card.id, actorId: req.user.id, type: "comment_added", message: `commented on ${card.title}` });
  return res.status(201).json({ message: "Comment added successfully", comment: result });
};

export const updateComment = async (req, res) => {
  const comment = await Comment.findByPk(positiveId(req.params.commentId, "comment id"));
  if (!comment) throw new ApiError(404, "Comment not found");
  await findCardForUser(comment.cardId, req.user.id);
  if (Number(comment.authorId) !== Number(req.user.id)) throw new ApiError(403, "Only the comment author can edit it");
  await comment.update({ text: requireText(req.body?.text, "Comment", 5000) });
  return res.json({ message: "Comment updated successfully", comment });
};

export const deleteComment = async (req, res) => {
  const comment = await Comment.findByPk(positiveId(req.params.commentId, "comment id"));
  if (!comment) throw new ApiError(404, "Comment not found");
  const card = await findCardForUser(comment.cardId, req.user.id);
  const isAdmin = Number(card.accessibleBoard.ownerId) === Number(req.user.id) || ["owner", "admin"].includes(card.accessibleBoard.currentMembership?.role);
  if (Number(comment.authorId) !== Number(req.user.id) && !isAdmin) throw new ApiError(403, "Only the author or a board admin can delete this comment");
  await comment.destroy();
  return res.status(204).send();
};

export const addAttachment = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const size = req.body?.size === undefined || req.body?.size === null ? null : Number(req.body.size);
  if (size !== null && (!Number.isSafeInteger(size) || size < 0)) throw new ApiError(400, "Attachment size must be a non-negative integer");
  const attachment = await Attachment.create({
    cardId: card.id, uploaderId: req.user.id,
    name: requireText(req.body?.name, "Attachment name", 255),
    url: requireText(req.body?.url, "Attachment URL", 7000000),
    mimeType: optionalText(req.body?.mimeType, "MIME type", 120), size,
  });
  return res.status(201).json({ message: "Attachment added successfully", attachment });
};

export const deleteAttachment = async (req, res) => {
  const attachment = await Attachment.findByPk(positiveId(req.params.attachmentId, "attachment id"));
  if (!attachment) throw new ApiError(404, "Attachment not found");
  const card = await findCardForUser(attachment.cardId, req.user.id);
  const isAdmin = Number(card.accessibleBoard.ownerId) === Number(req.user.id) || ["owner", "admin"].includes(card.accessibleBoard.currentMembership?.role);
  if (Number(attachment.uploaderId) !== Number(req.user.id) && !isAdmin) throw new ApiError(403, "Only the uploader or a board admin can delete this attachment");
  await attachment.destroy();
  return res.status(204).send();
};

export const addCustomField = async (req, res) => {
  const card = await findCardForUser(req.params.cardId, req.user.id);
  const position = await nextPosition(CustomField, { cardId: card.id });
  const customField = await CustomField.create({
    cardId: card.id, name: requireText(req.body?.name, "Custom field name", 100),
    value: optionalText(req.body?.value, "Custom field value", 5000) ?? "", position,
  });
  return res.status(201).json({ message: "Custom field added successfully", customField });
};

export const updateCustomField = async (req, res) => {
  const customField = await CustomField.findByPk(positiveId(req.params.fieldId, "custom field id"));
  if (!customField) throw new ApiError(404, "Custom field not found");
  await findCardForUser(customField.cardId, req.user.id);
  const update = {};
  if (req.body?.name !== undefined) update.name = requireText(req.body.name, "Custom field name", 100);
  if (req.body?.value !== undefined) update.value = optionalText(req.body.value, "Custom field value", 5000) ?? "";
  if (!Object.keys(update).length) throw new ApiError(400, "No supported custom field fields were provided");
  await customField.update(update);
  return res.json({ message: "Custom field updated successfully", customField });
};

export const deleteCustomField = async (req, res) => {
  const customField = await CustomField.findByPk(positiveId(req.params.fieldId, "custom field id"));
  if (!customField) throw new ApiError(404, "Custom field not found");
  await findCardForUser(customField.cardId, req.user.id);
  await customField.destroy();
  return res.status(204).send();
};
