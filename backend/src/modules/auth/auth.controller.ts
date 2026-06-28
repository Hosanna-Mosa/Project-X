import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { UserRole } from "../../database/models/User";

const authService = new AuthService();

export class AuthController {
  async requestOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await authService.requestOTP(phone);
      return res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code, role, name, password, email } = req.body;
      const result = await authService.verifyOTP(phone, code, role as UserRole, name, password, email);
      return res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async loginWithPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password, role } = req.body;
      const result = await authService.loginWithPassword(phone, password, role as UserRole);
      return res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }
}

