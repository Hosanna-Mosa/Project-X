import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { UserRole } from "../../database/models/User";
import AppVersion from "../../database/models/AppVersion";

const authService = new AuthService();

export class AuthController {
  async versionCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const platform = req.query.platform as string;
      const version = req.query.version as string;

      if (!platform || !version) {
        return res.status(400).json({ success: false, message: "platform and version are required" });
      }

      if (platform !== "ios" && platform !== "android") {
        return res.status(400).json({ success: false, message: "platform must be 'ios' or 'android'" });
      }

      let config = await AppVersion.findOne({ platform });
      if (!config) {
        config = new AppVersion({
          platform,
          latest: "1.0.0",
          minRequired: "1.0.0",
          storeUrl: platform === "ios" ? "https://apps.apple.com" : "https://play.google.com"
        });
      }

      const isOlder = (current: string, target: string): boolean => {
        const currParts = current.split(".").map(Number);
        const targetParts = target.split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          const curr = currParts[i] || 0;
          const targ = targetParts[i] || 0;
          if (curr < targ) return true;
          if (curr > targ) return false;
        }
        return false;
      };

      const { latest, minRequired, storeUrl } = config;

      if (isOlder(version, minRequired)) {
        return res.json({
          updateRequired: true,
          forceUpdate: true,
          url: storeUrl,
          latest,
          minRequired
        });
      }

      if (isOlder(version, latest)) {
        return res.json({
          updateRequired: true,
          forceUpdate: false,
          url: storeUrl,
          latest,
          minRequired
        });
      }

      return res.json({
        updateRequired: false
      });
    } catch (error) {
      next(error);
    }
  }
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

