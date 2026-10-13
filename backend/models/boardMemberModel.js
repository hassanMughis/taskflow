import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const BoardMember = sequelize.define("BoardMember", {
  boardId: { type: DataTypes.BIGINT, primaryKey: true, field: "board_id" },
  userId: { type: DataTypes.BIGINT, primaryKey: true, field: "user_id" },
  role: { type: DataTypes.ENUM("owner", "admin", "member"), allowNull: false, defaultValue: "member" },
}, {
  tableName: "board_members",
  timestamps: true,
  underscored: true,
});

export default BoardMember;
