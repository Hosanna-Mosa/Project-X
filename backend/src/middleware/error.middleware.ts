import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.statusCode === 400 && (err as any).errors ? { errors: (err as any).errors } : {}),
      stack: isDev ? err.stack : undefined,
    });
  }

  // Mongoose Duplicate Key Error (e.g. unique field constraint violation)
  if (err.name === "MongoServerError" && err.code === 11000) {
    const key = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${key} already exists.`,
    });
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((el: any) => el.message);
    return res.status(400).json({
      success: false,
      message: "Database Validation Failed",
      errors,
    });
  }

  // Default server error
  console.error("Unhandled Application Error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    stack: isDev ? err.stack : undefined,
  });
};
