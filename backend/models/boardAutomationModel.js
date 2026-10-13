import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const BoardAutomation = sequelize.define("BoardAutomation", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  boardId: { type: DataTypes.BIGINT, allowNull: false, field: "board_id" },
  name: { type: DataTypes.STRING(160), allowNull: false },
  triggerType: { type: DataTypes.ENUM("card_created", "card_moved"), allowNull: false, field: "trigger_type" },
  triggerListId: { type: DataTypes.BIGINT, allowNull: true, field: "trigger_list_id" },
  actionType: { type: DataTypes.ENUM("mark_complete", "move_to_list"), allowNull: false, field: "action_type" },
  actionListId: { type: DataTypes.BIGINT, allowNull: true, field: "action_list_id" },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "board_automations", timestamps: true, underscored: true });

export default BoardAutomation;
