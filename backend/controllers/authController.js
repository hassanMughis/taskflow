import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import Workspace from "../models/workspaceModel.js";
import WorkspaceMember from "../models/workspaceMemberModel.js";
import User from "../models/userModel.js";
import { emailValue, requireText } from "../utils/validation.js";
import { ApiError } from "../utils/apiError.js";

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const login = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Authentication is not configured",
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
    );

    return res.json({
      message: "Login successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    return res.status(500).json({ message: "Error during login" });
  }
};

export const register = async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long" });
  }

  if (password.length > 128) {
    return res.status(400).json({ message: "Password must be 128 characters or fewer" });
  }

  let normalizedName;
  let normalizedEmail;
  try {
    normalizedName = requireText(name, "Name", 100);
    normalizedEmail = emailValue(email);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  try {
    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await sequelize.transaction(async (transaction) => {
      const createdUser = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
      }, { transaction });
      const suffix = "'s Workspace";
      const workspace = await Workspace.create({
        name: `${normalizedName.slice(0, 100 - suffix.length)}${suffix}`,
        ownerId: createdUser.id,
        isPrivate: true,
      }, { transaction });
      await WorkspaceMember.create({
        workspaceId: workspace.id,
        userId: createdUser.id,
        role: "owner",
      }, { transaction });
      return createdUser;
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("Error registering user:", error.message);
    return res.status(500).json({ message: "Error registering user" });
  }
};
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Error fetching current user:", error.message);
    return res.status(500).json({ message: "Error fetching current user" });
  }
};

export const updateCurrentUser = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  const name = requireText(req.body?.name, "Name", 100);
  const email = emailValue(req.body?.email);
  const duplicate = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
  if (duplicate) throw new ApiError(409, "Email already exists");
  await user.update({ name, email });
  return res.json({ message: "Profile updated", user: publicUser(user) });
};

export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") throw new ApiError(400, "Current and new passwords are required");
  if (newPassword.length < 8) throw new ApiError(400, "New password must be at least 8 characters long");
  if (newPassword.length > 128) throw new ApiError(400, "New password must be 128 characters or fewer");
  if (currentPassword === newPassword) throw new ApiError(400, "New password must be different from the current password");
  const user = await User.findByPk(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  if (!await bcrypt.compare(currentPassword, user.passwordHash)) throw new ApiError(400, "Current password is incorrect");
  await user.update({ passwordHash: await bcrypt.hash(newPassword, 12) });
  return res.json({ message: "Password updated" });
};
