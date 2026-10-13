import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const WorkspaceMember = sequelize.define("WorkspaceMember", {
  workspaceId: { type: DataTypes.BIGINT, primaryKey: true, field: "workspace_id" },
  userId: { type: DataTypes.BIGINT, primaryKey: true, field: "user_id" },
  role: { type: DataTypes.ENUM("owner", "admin", "member"), allowNull: false, defaultValue: "member" },
}, {
  tableName: "workspace_members",
  timestamps: true,
  underscored: true,
});

export default WorkspaceMember;
