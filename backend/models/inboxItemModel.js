import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const InboxItem = sequelize.define("InboxItem", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.BIGINT, allowNull: false, field: "user_id" },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: "inbox_items",
  timestamps: true,
  underscored: true,
});

export default InboxItem;
