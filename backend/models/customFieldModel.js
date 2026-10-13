import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const CustomField = sequelize.define("CustomField", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  cardId: { type: DataTypes.BIGINT, allowNull: false, field: "card_id" },
  name: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: "custom_fields",
  timestamps: true,
  underscored: true,
});

export default CustomField;
