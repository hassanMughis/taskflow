import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChecklistItem = sequelize.define("ChecklistItem", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  checklistId: { type: DataTypes.BIGINT, allowNull: false, field: "checklist_id" },
  title: { type: DataTypes.STRING(255), allowNull: false },
  completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: "due_date" },
  assigneeId: { type: DataTypes.BIGINT, allowNull: true, field: "assignee_id" },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: "checklist_items",
  timestamps: true,
  underscored: true,
});

export default ChecklistItem;
