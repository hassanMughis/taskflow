import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Workspace = sequelize.define(
  "Workspace",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "owner_id",
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_private",
    },
  },
    {
    tableName: "workspaces",
    timestamps: true,
    underscored: true,
    }
);

export default Workspace;
