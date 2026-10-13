import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const BoardActivity = sequelize.define("BoardActivity", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  boardId: { type: DataTypes.BIGINT, allowNull: false, field: "board_id" },
  cardId: { type: DataTypes.BIGINT, allowNull: true, field: "card_id" },
  actorId: { type: DataTypes.BIGINT, allowNull: false, field: "actor_id" },
  type: { type: DataTypes.STRING(60), allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
}, { tableName: "board_activities", timestamps: true, updatedAt: false, underscored: true });

export default BoardActivity;
