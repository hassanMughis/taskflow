import { ApiError } from "./apiError.js";

export const requireText = (value, field, maxLength = 255) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${field} is required`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ApiError(400, `${field} must be ${maxLength} characters or fewer`);
  }
  return normalized;
};

export const optionalText = (value, field, maxLength = 5000) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(400, `${field} must be text`);
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ApiError(400, `${field} must be ${maxLength} characters or fewer`);
  }
  return normalized || null;
};

export const positiveId = (value, field = "id") => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, `Invalid ${field}`);
  return id;
};

export const positionValue = (value, fallback = 0) => {
  if (value === undefined) return fallback;
  const position = Number(value);
  if (!Number.isInteger(position) || position < 0) {
    throw new ApiError(400, "Position must be a non-negative integer");
  }
  return position;
};

export const slugify = (value) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);

export const dateValue = (value, field) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `${field} must use YYYY-MM-DD format`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new ApiError(400, `${field} must be a real calendar date`);
  }
  return value;
};

export const emailValue = (value) => {
  const email = requireText(value, "Email", 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Email must be a valid email address");
  }
  return email;
};

export const optionalHexColor = (value, field = "Color") => {
  const color = optionalText(value, field, 20);
  if (color === null) return null;
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new ApiError(400, `${field} must be a six-digit hex color`);
  }
  return color.toLowerCase();
};
