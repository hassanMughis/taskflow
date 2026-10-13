import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Board = sequelize.define("Board", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  workspaceId: { type: DataTypes.BIGINT, allowNull: false, field: "workspace_id" },
  ownerId: { type: DataTypes.BIGINT, allowNull: false, field: "owner_id" },
  title: { type: DataTypes.STRING(120), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  coverUrl: { type: DataTypes.TEXT, allowNull: true, field: "cover_url" },
  starred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  visibility: { type: DataTypes.ENUM("private", "workspace", "public"), allowNull: false, defaultValue: "workspace" },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: "boards",
  timestamps: true,
  underscored: true,
});

export default Board;
