import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Notification = sequelize.define("Notification", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.BIGINT, allowNull: false, field: "user_id" },
  actorId: { type: DataTypes.BIGINT, allowNull: true, field: "actor_id" },
  boardId: { type: DataTypes.BIGINT, allowNull: true, field: "board_id" },
  cardId: { type: DataTypes.BIGINT, allowNull: true, field: "card_id" },
  type: { type: DataTypes.STRING(40), allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
  readAt: { type: DataTypes.DATE, allowNull: true, field: "read_at" },
}, {
  tableName: "notifications",
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

export default Notification;
