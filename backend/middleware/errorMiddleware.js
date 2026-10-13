import { ApiError } from "../utils/apiError.js";

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} was not found` });
};

export const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Request body contains invalid JSON" });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      details: error.errors.map((item) => item.message),
    });
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ message: "That value already exists" });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
};
