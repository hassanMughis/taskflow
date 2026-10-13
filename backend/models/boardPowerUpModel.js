import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const BoardPowerUp = sequelize.define("BoardPowerUp", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  boardId: { type: DataTypes.BIGINT, allowNull: false, field: "board_id" },
  key: { type: DataTypes.ENUM("calendar", "table", "card_aging"), allowNull: false },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "board_power_ups", timestamps: true, underscored: true, indexes: [{ unique: true, fields: ["board_id", "key"] }] });

export default BoardPowerUp;
