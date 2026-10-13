import { CardLabel, Label } from "../models/index.js";
import { requireBoardWriteAccess } from "../middleware/resourceAccess.js";
import { ApiError } from "../utils/apiError.js";
import { optionalText, positiveId, requireText } from "../utils/validation.js";
import { nextPosition } from "../utils/ordering.js";

const colorValue = (value) => {
  const color = requireText(value, "Label color", 20);
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new ApiError(400, "Label color must be a six-digit hex color");
  return color.toLowerCase();
};

export const createLabel = async (req, res) => {
  const board = await requireBoardWriteAccess(req.params.boardId, req.user.id);
  const position = await nextPosition(Label, { boardId: board.id });
  const label = await Label.create({
    boardId: board.id,
    name: optionalText(req.body?.name, "Label name", 80) ?? "",
    color: colorValue(req.body?.color),
    position,
  });
  return res.status(201).json({ message: "Label created successfully", label });
};

export const updateLabel = async (req, res) => {
  const labelId = positiveId(req.params.labelId, "label id");
  const label = await Label.findByPk(labelId);
  if (!label) throw new ApiError(404, "Label not found");
  await requireBoardWriteAccess(label.boardId, req.user.id);
  const update = {};
  if (req.body?.name !== undefined) update.name = optionalText(req.body.name, "Label name", 80) ?? "";
  if (req.body?.color !== undefined) update.color = colorValue(req.body.color);
  if (!Object.keys(update).length) throw new ApiError(400, "No supported label fields were provided");
  await label.update(update);
  return res.json({ message: "Label updated successfully", label });
};

export const deleteLabel = async (req, res) => {
  const labelId = positiveId(req.params.labelId, "label id");
  const label = await Label.findByPk(labelId);
  if (!label) throw new ApiError(404, "Label not found");
  await requireBoardWriteAccess(label.boardId, req.user.id);
  await CardLabel.destroy({ where: { labelId } });
  await label.destroy();
  return res.status(204).send();
};
