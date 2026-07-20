import { Response } from "express";
import { DriverService } from "./drivers.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import Driver from "../../database/models/Driver";
import User from "../../database/models/User";

const driverService = new DriverService();

export class DriversController {
  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      const { userId } = req.user!;
      
      const driver = await Driver.findOne({ user: userId });

      if (!driver) return res.status(404).json({ message: "Driver profile not found" });

      await driverService.updateStatus((driver._id as any).toString(), status);
      return res.json({ message: "Status updated", status });
    } catch (error) {
       return res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateHomeMode(req: AuthRequest, res: Response) {
    try {
      const { homeMode } = req.body;
      const { userId } = req.user!;

      const driver = await Driver.findOne({ user: userId });
      if (!driver) return res.status(404).json({ message: "Driver profile not found" });

      if (homeMode === true) {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User profile not found" });

        const homeAddress = user.addresses?.find(
          (addr: any) => addr.label && addr.label.trim().toLowerCase() === "home"
        );

        if (!homeAddress || !homeAddress.location?.coordinates || homeAddress.location.coordinates.length < 2) {
          return res.status(400).json({
            message: "Please save a home address in your profile first before turning on Head Home mode."
          });
        }
      }

      await driverService.updateHomeMode((driver._id as any).toString(), Boolean(homeMode));
      return res.json({ message: "Home mode updated", homeMode });
    } catch (error: any) {
      console.error("Update home mode error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async nearby(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude, radius, vehicleType } = req.query;
      const drivers = await driverService.getNearbyDrivers(
        Number(latitude), 
        Number(longitude), 
        radius ? Number(radius) : 5000,
        vehicleType ? String(vehicleType) : undefined
      );
      return res.json(drivers);
    } catch (error) {
       return res.status(500).json({ message: "Internal server error" });
    }
  }

  async highDemandAreas(req: AuthRequest, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 6;
      const areas = await driverService.getHighDemandAreas(limit);
      return res.json(areas);
    } catch (error) {
       return res.status(500).json({ message: "Internal server error" });
    }
  }

  async profile(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const profile = await driverService.getProfile(userId);
      return res.json(profile);
    } catch (error: any) {
       const status = error.message === "User not found" ? 404 : 500;
       return res.status(status).json({ message: error.message || "Internal server error" });
    }
  }

  async earnings(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const earnings = await driverService.getEarnings(userId);
      return res.json(earnings);
    } catch (error: any) {
       const status = error.message === "Driver profile not found" ? 404 : 500;
       return res.status(status).json({ message: error.message || "Internal server error" });
    }
  }

  async cashOut(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const { password, amount } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password is required to cash out" });
      }

      const result = await driverService.cashOut(userId, password, amount ? Number(amount) : undefined);
      return res.json(result);
    } catch (error: any) {
       const validationErrors = [
        "Invalid driver credentials",
        "Verified bank account is required before cash out",
        "Minimum cash out amount is Rs.100",
        "Cash out amount exceeds available balance",
       ];
       const status = validationErrors.includes(error.message) ? 400 : 500;
       return res.status(status).json({ message: error.message || "Internal server error" });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const { name, username, email, phone, gender } = req.body;

      // Update user fields
      if (name || username || email || phone) {
        const user = await User.findById(userId);
        if (user) {
          if (name) user.name = name;
          if (username) user.username = username;
          if (email) user.email = email;
          if (phone) user.phone = phone;
          await user.save();
        }
      }

      // Update driver-specific fields
      if (gender) {
        const driver = await Driver.findOne({ user: userId });
        if (driver) {
          driver.gender = gender as "male" | "female";
          await driver.save();
        }
      }

      // Return fresh profile
      const profile = await driverService.getProfile(userId);
      return res.json({ message: "Profile updated", profile });
    } catch (error: any) {
      console.error("Update driver profile error:", error);
      if (error.code === 11000) {
        return res.status(400).json({ message: "Username or Email already exists" });
      }
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async updateLocation(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude } = req.body;
      const { userId } = req.user!;
      
      console.log(`[REST] Driver Location update attempt. User: ${userId}, Lat: ${latitude}, Lng: ${longitude}`);

      const driver = await Driver.findOne({ user: userId });

      if (!driver) {
        console.warn(`[REST] Driver profile not found for user: ${userId}`);
        return res.status(404).json({ message: "Driver profile not found" });
      }

      await driverService.updateLocation((driver._id as any).toString(), latitude, longitude);
      console.log(`[REST] Successfully updated location for driver: ${driver._id}`);
      return res.json({ message: "Location updated" });
    } catch (error) {
       console.error(`[REST] Error updating location:`, error);
       return res.status(500).json({ message: "Internal server error" });
    }
  }
}
