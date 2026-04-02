import { Response } from "express";
import User from "../../database/models/User";
import { AuthRequest } from "../../middleware/auth.middleware";

export class UsersController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user?.userId);

      if (!user) return res.status(404).json({ message: "User not found" });

      return res.json(user);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, defaultLocation } = req.body;
      const user = await User.findById(req.user?.userId);

      if (!user) return res.status(404).json({ message: "User not found" });

      if (name) user.name = name;
      if (defaultLocation) {
        user.defaultLocation = {
          type: "Point",
          coordinates: [defaultLocation.longitude, defaultLocation.latitude],
        };
      }

      await user.save();
      return res.json(user);
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
