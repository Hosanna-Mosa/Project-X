import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { UserRole } from "../../database/entities/User";

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { phone, role } = req.body;

      if (!phone || !role) {
        return res.status(400).json({ message: "Phone and role are required" });
      }

      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const { user, token } = await authService.loginWithOTP(phone, role as UserRole);

      return res.json({
        user,
        token,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
