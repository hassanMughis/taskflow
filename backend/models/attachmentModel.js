import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Attachment = sequelize.define("Attachment", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  cardId: { type: DataTypes.BIGINT, allowNull: false, field: "card_id" },
  uploaderId: { type: DataTypes.BIGINT, allowNull: false, field: "uploader_id" },
  name: { type: DataTypes.STRING(255), allowNull: false },
  url: { type: DataTypes.TEXT, allowNull: false },
  mimeType: { type: DataTypes.STRING(120), allowNull: true, field: "mime_type" },
  size: { type: DataTypes.BIGINT, allowNull: true },
}, {
  tableName: "attachments",
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

export default Attachment;
