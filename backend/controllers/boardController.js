import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {
  Attachment, Board, BoardActivity, BoardMember, Card, CardMember, Checklist, ChecklistItem, Comment, CustomField, Label, List, Notification, User, Workspace, WorkspaceMember,
} from "../models/index.js";
import { findBoardForUser, findWorkspaceForUser, requireBoardAdmin } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { emailValue, optionalText, positiveId, positionValue, requireText, slugify } from "../utils/validation.js";
import { nextPosition } from "../utils/ordering.js";
import { getBoardTemplate } from "../data/boardTemplates.js";

const defaultLabelColors = ["#2f9c73", "#d9a400", "#df7b00", "#d14336", "#8f48b6", "#2667c9"];

const ensureCardCreatorAssignments = async (boardId) => {
  await sequelize.query(`
    INSERT INTO card_members (card_id, user_id)
    SELECT cards.id, cards.creator_id
    FROM cards
    JOIN lists ON lists.id = cards.list_id
    WHERE lists.board_id = :boardId
    ON CONFLICT (card_id, user_id) DO NOTHING
  `, { replacements: { boardId } });
};

const uniqueSlug = async (title, transaction) => {
  const base = slugify(title) || "board";
  let slug = base;
  let suffix = 2;
  while (await Board.count({ where: { slug }, transaction })) slug = `${base}-${suffix++}`;
  return slug;
};

const boardIncludes = [
  { model: Workspace, as: "workspace", attributes: ["id", "name"] },
  { model: User, as: "owner", attributes: ["id", "name", "email"] },
  { model: User, as: "members", attributes: ["id", "name", "email"], through: { attributes: ["role"] } },
  { model: Label, as: "labels" },
  {
    model: List,
    as: "lists",
    where: { archived: false },
    required: false,
    include: [{
      model: Card,
      as: "cards",
      where: { archived: false },
      required: false,
      include: [
        { model: Label, as: "labels", through: { attributes: [] } },
        { model: User, as: "members", attributes: ["id", "name", "email"], through: { attributes: [] } },
        { model: Comment, as: "comments", include: [{ model: User, as: "author", attributes: ["id", "name"] }] },
        { model: Attachment, as: "attachments" },
        { model: CustomField, as: "customFields" },
        { model: Checklist, as: "checklists", include: [{ model: ChecklistItem, as: "items", include: [{ model: User, as: "assignee", attributes: ["id", "name", "email"] }] }] },
      ],
    }],
  },
];

export const createBoard = async (req, res) => {
  const workspace = await findWorkspaceForUser(req.body?.workspaceId, req.user.id);
  const title = requireText(req.body?.title, "Board title", 120);
  const description = optionalText(req.body?.description, "Description");
  const coverUrl = optionalText(req.body?.coverUrl, "Cover URL", 7000000);
  const visibility = req.body?.visibility ?? "workspace";
  if (!["private", "workspace", "public"].includes(visibility)) throw new ApiError(400, "visibility must be private, workspace, or public");
  const templateKey = req.body?.templateKey;
  if (templateKey !== undefined && typeof templateKey !== "string") throw new ApiError(400, "templateKey must be a string");
  const template = templateKey ? getBoardTemplate(templateKey) : null;
  if (templateKey && !template) throw new ApiError(400, "Unknown board template");

  const board = await sequelize.transaction(async (transaction) => {
    const position = await nextPosition(Board, { workspaceId: workspace.id, archived: false }, transaction);
    const created = await Board.create({
      workspaceId: workspace.id,
      ownerId: req.user.id,
      title,
      slug: await uniqueSlug(title, transaction),
      description,
      coverUrl,
      visibility,
      position,
    }, { transaction });
    await BoardMember.create({ boardId: created.id, userId: req.user.id, role: "owner" }, { transaction });
    if (Number(workspace.ownerId) !== Number(req.user.id)) {
      await BoardMember.create({ boardId: created.id, userId: workspace.ownerId, role: "admin" }, { transaction });
    }
    await Label.bulkCreate(defaultLabelColors.map((color, index) => ({
      boardId: created.id, name: "", color, position: index,
    })), { transaction });
    if (template) {
      for (const [listPosition, templateList] of template.entries()) {
        const list = await List.create({
          boardId: created.id,
          title: templateList.title,
          position: listPosition,
        }, { transaction });
        if (templateList.cards.length) {
          for (const [cardPosition, cardTitle] of templateList.cards.entries()) {
            const card = await Card.create({
              listId: list.id,
              creatorId: req.user.id,
              title: cardTitle,
              position: cardPosition,
            }, { transaction });
            await CardMember.create({ cardId: card.id, userId: req.user.id }, { transaction });
          }
        }
      }
    }
    return created;
  });

  return res.status(201).json({ message: "Board created successfully", board });
};

export const getBoards = async (req, res) => {
  const workspace = await findWorkspaceForUser(req.query.workspaceId, req.user.id);
  const showArchived = req.query.archived === "true";
  const memberships = await BoardMember.findAll({ where: { userId: req.user.id }, attributes: ["boardId"] });
  const boardIds = memberships.map((membership) => membership.boardId);
  const where = { workspaceId: workspace.id, archived: showArchived, [Op.or]: [{ id: { [Op.in]: boardIds.length ? boardIds : [0] } }, { visibility: { [Op.in]: ["workspace", "public"] } }] };
  const boards = await Board.findAll({
    where,
    order: [["position", "ASC"], ["createdAt", "ASC"]],
    include: [{ model: User, as: "members", attributes: ["id", "name", "email"], through: { attributes: ["role"] } }],
  });
  return res.json({ boards });
};

export const getBoard = async (req, res) => {
  const accessible = await findBoardForUser(req.params.boardId, req.user.id);
  await ensureCardCreatorAssignments(accessible.id);
  const boardMembership = await BoardMember.findOne({ where: { boardId: accessible.id, userId: req.user.id } });
  const workspaceMembership = await WorkspaceMember.findOne({ where: { workspaceId: accessible.workspaceId, userId: req.user.id } });
  const isOwner = Number(accessible.ownerId) === Number(req.user.id);
  const canEdit = isOwner || Boolean(boardMembership) || Boolean(workspaceMembership && accessible.visibility !== "private");
  const canAdmin = isOwner || ["owner", "admin"].includes(boardMembership?.role) || ["owner", "admin"].includes(workspaceMembership?.role);
  const board = await Board.findByPk(accessible.id, {
    include: boardIncludes,
    order: [
      [{ model: Label, as: "labels" }, "position", "ASC"],
      [{ model: List, as: "lists" }, "position", "ASC"],
      [{ model: List, as: "lists" }, { model: Card, as: "cards" }, "position", "ASC"],
      [{ model: List, as: "lists" }, { model: Card, as: "cards" }, { model: Comment, as: "comments" }, "createdAt", "ASC"],
      [{ model: List, as: "lists" }, { model: Card, as: "cards" }, { model: CustomField, as: "customFields" }, "position", "ASC"],
      [{ model: List, as: "lists" }, { model: Card, as: "cards" }, { model: Checklist, as: "checklists" }, "position", "ASC"],
      [{ model: List, as: "lists" }, { model: Card, as: "cards" }, { model: Checklist, as: "checklists" }, { model: ChecklistItem, as: "items" }, "position", "ASC"],
    ],
  });
  const payload = board.toJSON();
  if (!canEdit) {
    if (payload.owner) delete payload.owner.email;
    payload.members = payload.members.map((member) => { const { email, ...safeMember } = member; return safeMember; });
    for (const list of payload.lists) {
      for (const card of list.cards) {
        card.members = card.members.map((member) => { const { email, ...safeMember } = member; return safeMember; });
        for (const checklist of card.checklists) {
          for (const item of checklist.items) if (item.assignee) delete item.assignee.email;
        }
      }
    }
  }
  return res.json({ board: payload, permissions: { canEdit, canAdmin } });
};

export const getBoardActivity = async (req, res) => {
  const board = await findBoardForUser(req.params.boardId, req.user.id);
  const activities = await BoardActivity.findAll({ where: { boardId: board.id }, include: [{ model: User, as: "actor", attributes: ["id", "name"] }], order: [["createdAt", "DESC"]], limit: 100 });
  return res.json({ activities });
};

export const getArchivedBoardItems = async (req, res) => {
  const board = await findBoardForUser(req.params.boardId, req.user.id);
  const allLists = await List.findAll({ where: { boardId: board.id }, attributes: ["id"] });
  const lists = await List.findAll({ where: { boardId: board.id, archived: true }, order: [["updatedAt", "DESC"]] });
  const cards = await Card.findAll({ where: { listId: { [Op.in]: allLists.map((list) => list.id) }, archived: true }, order: [["updatedAt", "DESC"]] });
  return res.json({ lists, cards });
};

export const updateBoard = async (req, res) => {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  const update = {};
  if (req.body?.title !== undefined) update.title = requireText(req.body.title, "Board title", 120);
  if (req.body?.description !== undefined) update.description = optionalText(req.body.description, "Description");
  if (req.body?.coverUrl !== undefined) update.coverUrl = optionalText(req.body.coverUrl, "Cover URL", 7000000);
  if (req.body?.starred !== undefined) {
    if (typeof req.body.starred !== "boolean") throw new ApiError(400, "starred must be true or false");
    update.starred = req.body.starred;
  }
  if (req.body?.archived !== undefined) {
    if (typeof req.body.archived !== "boolean") throw new ApiError(400, "archived must be true or false");
    update.archived = req.body.archived;
  }
  if (req.body?.visibility !== undefined) {
    if (!["private", "workspace", "public"].includes(req.body.visibility)) throw new ApiError(400, "visibility must be private, workspace, or public");
    update.visibility = req.body.visibility;
  }
  if (req.body?.position !== undefined) update.position = positionValue(req.body.position);
  if (!Object.keys(update).length) throw new ApiError(400, "No supported board fields were provided");
  await board.update(update);
  return res.json({ message: "Board updated successfully", board });
};

export const deleteBoard = async (req, res) => {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  await board.destroy();
  return res.status(204).send();
};

export const addBoardMember = async (req, res) => {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  const email = emailValue(req.body?.email);
  const user = await User.findOne({ where: { email } });
  if (!user) throw new ApiError(404, "No registered user has that email");
  const workspaceMembership = await WorkspaceMember.findOne({
    where: { workspaceId: board.workspaceId, userId: user.id },
  });
  if (!workspaceMembership) {
    throw new ApiError(409, "Add this user to the workspace before adding them to the board");
  }
  const { membership, created } = await sequelize.transaction(async (transaction) => {
    const [result, wasCreated] = await BoardMember.findOrCreate({
      where: { boardId: board.id, userId: user.id }, defaults: { role: "member" }, transaction,
    });
    if (wasCreated && Number(user.id) !== Number(req.user.id)) {
      await Notification.create({
        userId: user.id, actorId: req.user.id, boardId: board.id,
        type: "board_invite", message: `You were added to ${board.title}`,
      }, { transaction });
    }
    return { membership: result, created: wasCreated };
  });
  return res.status(created ? 201 : 200).json({ membership, user: { id: user.id, name: user.name, email: user.email } });
};

export const removeBoardMember = async (req, res) => {
  const board = await requireBoardAdmin(req.params.boardId, req.user.id);
  const userId = positiveId(req.params.userId, "user id");
  if (Number(board.ownerId) === userId) throw new ApiError(409, "The board owner cannot be removed");
  const workspaceOwner = await WorkspaceMember.findOne({
    where: { workspaceId: board.workspaceId, userId, role: "owner" },
  });
  if (workspaceOwner) throw new ApiError(409, "The workspace owner cannot be removed from a board");
  await sequelize.transaction(async (transaction) => {
    const removed = await BoardMember.destroy({ where: { boardId: board.id, userId }, transaction });
    if (!removed) throw new ApiError(404, "Board member not found");
    const lists = await List.findAll({ where: { boardId: board.id }, attributes: ["id"], transaction });
    const listIds = lists.map((list) => list.id);
    if (!listIds.length) return;
    const cards = await Card.findAll({ where: { listId: { [Op.in]: listIds } }, attributes: ["id"], transaction });
    const cardIds = cards.map((card) => card.id);
    if (cardIds.length) await CardMember.destroy({ where: { cardId: { [Op.in]: cardIds }, userId }, transaction });
  });
  return res.status(204).send();
};
