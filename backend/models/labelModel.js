import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Label = sequelize.define("Label", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  boardId: { type: DataTypes.BIGINT, allowNull: false, field: "board_id" },
  name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "" },
  color: { type: DataTypes.STRING(20), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: "labels",
  timestamps: true,
  underscored: true,
});

export default Label;
