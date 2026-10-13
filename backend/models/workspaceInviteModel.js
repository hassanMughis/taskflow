import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const WorkspaceInvite = sequelize.define("WorkspaceInvite", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  workspaceId: { type: DataTypes.BIGINT, allowNull: false, field: "workspace_id" },
  createdBy: { type: DataTypes.BIGINT, allowNull: false, field: "created_by" },
  token: { type: DataTypes.STRING(96), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: "expires_at" },
  revokedAt: { type: DataTypes.DATE, allowNull: true, field: "revoked_at" },
}, { tableName: "workspace_invites", timestamps: true, underscored: true });

export default WorkspaceInvite;
