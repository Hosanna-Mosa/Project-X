import { Request, Response } from "express";
import { AppDataSource } from "../../database/data-source";
import { Order } from "../../database/entities/Order";
import { Driver } from "../../database/entities/Driver";

const orderRepository = AppDataSource.getRepository(Order);
const driverRepository = AppDataSource.getRepository(Driver);

export class AdminController {
  async getAllOrders(req: Request, res: Response) {
    try {
      const orders = await orderRepository.find({
        relations: ["user", "driver", "stops"],
        order: { createdAt: "DESC" },
      });
      return res.json(orders);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getAllDrivers(req: Request, res: Response) {
    try {
      const drivers = await driverRepository.find({
        relations: ["user"],
      });
      return res.json(drivers);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getDashboardStats(req: Request, res: Response) {
    try {
      const totalOrders = await orderRepository.count();
      const activeDrivers = await driverRepository.count({
        where: { status: "ONLINE" as any }
      });
      const totalRevenue = await orderRepository.sum("totalPrice");

      return res.json({
        totalOrders,
        activeDrivers,
        totalRevenue: totalRevenue || 0,
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
