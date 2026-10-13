import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Comment = sequelize.define("Comment", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  cardId: { type: DataTypes.BIGINT, allowNull: false, field: "card_id" },
  authorId: { type: DataTypes.BIGINT, allowNull: false, field: "author_id" },
  text: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: "comments",
  timestamps: true,
  underscored: true,
});

export default Comment;
