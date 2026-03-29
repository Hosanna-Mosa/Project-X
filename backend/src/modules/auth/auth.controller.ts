import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { UserRole } from "../../database/entities/User";

const authService = new AuthService();

export class AuthController {
  async requestOTP(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
      }
      const result = await authService.requestOTP(phone);
      return res.json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async verifyOTP(req: Request, res: Response) {
    try {
      const { phone, code, role, name } = req.body;

      if (!phone || !code || !role) {
        return res.status(400).json({ message: "Phone, code and role are required" });
      }

      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const result = await authService.verifyOTP(phone, code, role as UserRole, name);

      return res.json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(401).json({ message: error.message || "Invalid or expired OTP" });
    }
  }

  async logout(req: Request, res: Response) {
    // For JWT, logout is usually handled on the client by removing the token.
    // However, if we want server-side invalidation (blacklist), we'd do it here.
    return res.json({ message: "Logged out successfully" });
  }
}
