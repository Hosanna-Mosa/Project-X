import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { ValidationError } from "../utils/errors";

export const validateRequest = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as any;
      
      // Assign parsed values back to requests to ensure clean, type-safe data
      req.body = parsed.body || req.body;
      if (parsed.query) {
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params) {
        Object.assign(req.params, parsed.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err: any) => ({
          field: err.path.slice(1).join("."), // e.g., body.phone -> phone
          message: err.message,
        }));
        next(new ValidationError("Request Validation Failed", formattedErrors));
      } else {
        next(error);
      }
    }
  };
};
