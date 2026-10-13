import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const List = sequelize.define("List", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  boardId: { type: DataTypes.BIGINT, allowNull: false, field: "board_id" },
  title: { type: DataTypes.STRING(120), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: "lists",
  timestamps: true,
  underscored: true,
});

export default List;
