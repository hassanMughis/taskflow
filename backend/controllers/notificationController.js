import { Board, Notification, User } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { positiveId } from "../utils/validation.js";

export const getNotifications = async (req, res) => {
  const where = { userId: req.user.id };
  if (req.query.unread === "true") where.readAt = null;
  if (req.query.type) where.type = String(req.query.type);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const notifications = await Notification.findAll({
    where,
    limit,
    order: [["createdAt", "DESC"]],
    include: [
      { model: User, as: "actor", attributes: ["id", "name"] },
      { model: Board, as: "board", attributes: ["id", "title", "slug"] },
    ],
  });
  return res.json({ notifications });
};

export const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOne({
    where: { id: positiveId(req.params.notificationId, "notification id"), userId: req.user.id },
  });
  if (!notification) throw new ApiError(404, "Notification not found");
  await notification.update({ readAt: notification.readAt ?? new Date() });
  return res.json({ notification });
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.update({ readAt: new Date() }, { where: { userId: req.user.id, readAt: null } });
  return res.json({ message: "All notifications marked as read" });
};
