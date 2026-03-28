import { Response } from "express";
import { AppDataSource } from "../../database/data-source";
import { User } from "../../database/entities/User";
import { AuthRequest } from "../../middleware/auth.middleware";

const userRepository = AppDataSource.getRepository(User);

export class UsersController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await userRepository.findOne({
        where: { id: req.user?.userId }
      });

      if (!user) return res.status(404).json({ message: "User not found" });

      return res.json(user);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, defaultLocation } = req.body;
      const user = await userRepository.findOne({
        where: { id: req.user?.userId }
      });

      if (!user) return res.status(404).json({ message: "User not found" });

      if (name) user.name = name;
      if (defaultLocation) {
        // Handle location update properly with PostGIS if needed
        // For simplicity, store as POINT(lng lat)
        user.defaultLocation = `POINT(${defaultLocation.longitude} ${defaultLocation.latitude})`;
      }

      await userRepository.save(user);
      return res.json(user);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
