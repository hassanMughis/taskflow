import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Checklist = sequelize.define("Checklist", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  cardId: { type: DataTypes.BIGINT, allowNull: false, field: "card_id" },
  title: { type: DataTypes.STRING(120), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: "checklists",
  timestamps: true,
  underscored: true,
});

export default Checklist;
