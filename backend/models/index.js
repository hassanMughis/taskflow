import User from "./userModel.js";
import Workspace from "./workspaceModel.js";
import WorkspaceMember from "./workspaceMemberModel.js";
import Board from "./boardModel.js";
import BoardMember from "./boardMemberModel.js";
import List from "./listModel.js";
import Card from "./cardModel.js";
import Label from "./labelModel.js";
import CardLabel from "./cardLabelModel.js";
import CardMember from "./cardMemberModel.js";
import Comment from "./commentModel.js";
import Attachment from "./attachmentModel.js";
import CustomField from "./customFieldModel.js";
import Notification from "./notificationModel.js";
import Checklist from "./checklistModel.js";
import ChecklistItem from "./checklistItemModel.js";
import BoardActivity from "./boardActivityModel.js";
import WorkspaceInvite from "./workspaceInviteModel.js";
import BoardAutomation from "./boardAutomationModel.js";
import BoardPowerUp from "./boardPowerUpModel.js";
import InboxItem from "./inboxItemModel.js";

User.hasMany(Workspace, { as: "ownedWorkspaces", foreignKey: "ownerId" });
Workspace.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
Workspace.belongsToMany(User, { as: "members", through: WorkspaceMember, foreignKey: "workspaceId", otherKey: "userId" });
User.belongsToMany(Workspace, { as: "workspaces", through: WorkspaceMember, foreignKey: "userId", otherKey: "workspaceId" });
Workspace.hasMany(WorkspaceInvite, { as: "invites", foreignKey: "workspaceId", onDelete: "CASCADE" });
WorkspaceInvite.belongsTo(Workspace, { as: "workspace", foreignKey: "workspaceId" });
WorkspaceInvite.belongsTo(User, { as: "creator", foreignKey: "createdBy" });

Workspace.hasMany(Board, { as: "boards", foreignKey: "workspaceId", onDelete: "CASCADE" });
Board.belongsTo(Workspace, { as: "workspace", foreignKey: "workspaceId" });
Board.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
Board.belongsToMany(User, { as: "members", through: BoardMember, foreignKey: "boardId", otherKey: "userId" });
User.belongsToMany(Board, { as: "boards", through: BoardMember, foreignKey: "userId", otherKey: "boardId" });

Board.hasMany(List, { as: "lists", foreignKey: "boardId", onDelete: "CASCADE" });
List.belongsTo(Board, { as: "board", foreignKey: "boardId" });
List.hasMany(Card, { as: "cards", foreignKey: "listId", onDelete: "CASCADE" });
Card.belongsTo(List, { as: "list", foreignKey: "listId" });
Card.belongsTo(User, { as: "creator", foreignKey: "creatorId" });

Board.hasMany(Label, { as: "labels", foreignKey: "boardId", onDelete: "CASCADE" });
Label.belongsTo(Board, { as: "board", foreignKey: "boardId" });
Card.belongsToMany(Label, { as: "labels", through: CardLabel, foreignKey: "cardId", otherKey: "labelId" });
Label.belongsToMany(Card, { as: "cards", through: CardLabel, foreignKey: "labelId", otherKey: "cardId" });
Card.belongsToMany(User, { as: "members", through: CardMember, foreignKey: "cardId", otherKey: "userId" });
User.belongsToMany(Card, { as: "assignedCards", through: CardMember, foreignKey: "userId", otherKey: "cardId" });

Card.hasMany(Comment, { as: "comments", foreignKey: "cardId", onDelete: "CASCADE" });
Comment.belongsTo(Card, { as: "card", foreignKey: "cardId" });
Comment.belongsTo(User, { as: "author", foreignKey: "authorId" });
Card.hasMany(Attachment, { as: "attachments", foreignKey: "cardId", onDelete: "CASCADE" });
Attachment.belongsTo(Card, { as: "card", foreignKey: "cardId" });
Attachment.belongsTo(User, { as: "uploader", foreignKey: "uploaderId" });
Card.hasMany(CustomField, { as: "customFields", foreignKey: "cardId", onDelete: "CASCADE" });
CustomField.belongsTo(Card, { as: "card", foreignKey: "cardId" });
Card.hasMany(Checklist, { as: "checklists", foreignKey: "cardId", onDelete: "CASCADE" });
Checklist.belongsTo(Card, { as: "card", foreignKey: "cardId" });
Checklist.hasMany(ChecklistItem, { as: "items", foreignKey: "checklistId", onDelete: "CASCADE" });
ChecklistItem.belongsTo(Checklist, { as: "checklist", foreignKey: "checklistId" });
ChecklistItem.belongsTo(User, { as: "assignee", foreignKey: "assigneeId" });
Board.hasMany(BoardActivity, { as: "activities", foreignKey: "boardId", onDelete: "CASCADE" });
BoardActivity.belongsTo(Board, { as: "board", foreignKey: "boardId" });
BoardActivity.belongsTo(Card, { as: "card", foreignKey: "cardId" });
BoardActivity.belongsTo(User, { as: "actor", foreignKey: "actorId" });
Board.hasMany(BoardAutomation, { as: "automations", foreignKey: "boardId", onDelete: "CASCADE" });
BoardAutomation.belongsTo(Board, { as: "board", foreignKey: "boardId" });
BoardAutomation.belongsTo(List, { as: "triggerList", foreignKey: "triggerListId" });
BoardAutomation.belongsTo(List, { as: "actionList", foreignKey: "actionListId" });
Board.hasMany(BoardPowerUp, { as: "powerUps", foreignKey: "boardId", onDelete: "CASCADE" });
BoardPowerUp.belongsTo(Board, { as: "board", foreignKey: "boardId" });
User.hasMany(Notification, { as: "notifications", foreignKey: "userId", onDelete: "CASCADE" });
User.hasMany(InboxItem, { as: "inboxItems", foreignKey: "userId", onDelete: "CASCADE" });
InboxItem.belongsTo(User, { as: "user", foreignKey: "userId" });
Notification.belongsTo(User, { as: "recipient", foreignKey: "userId" });
Notification.belongsTo(User, { as: "actor", foreignKey: "actorId" });
Notification.belongsTo(Board, { as: "board", foreignKey: "boardId" });
Notification.belongsTo(Card, { as: "card", foreignKey: "cardId" });

export {
  User, Workspace, WorkspaceMember, Board, BoardMember, List, Card, Label,
  CardLabel, CardMember, Comment, Attachment, CustomField, Checklist, ChecklistItem, BoardActivity, BoardAutomation, BoardPowerUp, WorkspaceInvite, Notification, InboxItem,
};
