import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Card = sequelize.define("Card", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  listId: { type: DataTypes.BIGINT, allowNull: false, field: "list_id" },
  creatorId: { type: DataTypes.BIGINT, allowNull: false, field: "creator_id" },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  coverUrl: { type: DataTypes.TEXT, allowNull: true, field: "cover_url" },
  coverColor: { type: DataTypes.STRING(20), allowNull: true, field: "cover_color" },
  coverSize: { type: DataTypes.ENUM("header", "full"), allowNull: false, defaultValue: "header", field: "cover_size" },
  startDate: { type: DataTypes.DATEONLY, allowNull: true, field: "start_date" },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: "due_date" },
  dueTime: { type: DataTypes.TIME, allowNull: true, field: "due_time" },
  recurring: { type: DataTypes.STRING(40), allowNull: true },
  reminder: { type: DataTypes.STRING(40), allowNull: true },
  archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: "cards",
  timestamps: true,
  underscored: true,
});

export default Card;
