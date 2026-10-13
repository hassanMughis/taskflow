import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const CardMember = sequelize.define("CardMember", {
  cardId: { type: DataTypes.BIGINT, primaryKey: true, field: "card_id" },
  userId: { type: DataTypes.BIGINT, primaryKey: true, field: "user_id" },
}, { tableName: "card_members", timestamps: false });

export default CardMember;
