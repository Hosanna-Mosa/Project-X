import { Response } from "express";
import { DriverService } from "./drivers.service";
import { AuthRequest } from "../../middleware/auth.middleware";

const driverService = new DriverService();

export class DriversController {
  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      const { userId } = req.user!;
      
      // Usually, driver id is separate from user id
      // For this system, we'll find driver linked to user
      const driver = await AppDataSource.getRepository("drivers").findOne({
        where: { user: { id: userId } }
      });

      if (!driver) return res.status(404).json({ message: "Driver profile not found" });

      await driverService.updateStatus(driver.id, status);
      return res.json({ message: "Status updated", status });
    } catch (error) {
       return res.status(500).json({ message: "Internal server error" });
    }
  }

  async nearby(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude, radius } = req.query;
      const drivers = await driverService.getNearbyDrivers(
        Number(latitude), 
        Number(longitude), 
        radius ? Number(radius) : 5000
      );
      return res.json(drivers);
    } catch (error) {
       return res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateLocation(req: AuthRequest, res: Response) {
    try {
      const { latitude, longitude } = req.body;
      const { userId } = req.user!;
      
      console.log(`[REST] Driver Location update attempt. User: ${userId}, Lat: ${latitude}, Lng: ${longitude}`);

      const driver = await AppDataSource.getRepository("drivers").findOne({
        where: { user: { id: userId } }
      });

      if (!driver) {
        console.warn(`[REST] Driver profile not found for user: ${userId}`);
        return res.status(404).json({ message: "Driver profile not found" });
      }

      await driverService.updateLocation(driver.id, latitude, longitude);
      console.log(`[REST] Successfully updated location for driver: ${driver.id}`);
      return res.json({ message: "Location updated" });
    } catch (error) {
       console.error(`[REST] Error updating location:`, error);
       return res.status(500).json({ message: "Internal server error" });
    }
  }
}
import { AppDataSource } from "../../database/data-source";
