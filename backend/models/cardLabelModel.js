import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const CardLabel = sequelize.define("CardLabel", {
  cardId: { type: DataTypes.BIGINT, primaryKey: true, field: "card_id" },
  labelId: { type: DataTypes.BIGINT, primaryKey: true, field: "label_id" },
}, { tableName: "card_labels", timestamps: false });

export default CardLabel;
