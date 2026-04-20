import { Request, Response } from "express";
import Order from "../../database/models/Order";
import Driver, { DriverStatus } from "../../database/models/Driver";
import User from "../../database/models/User";

export class AdminController {
  async getAllOrders(req: Request, res: Response) {
    try {
      const orders = await Order.find()
        .populate("user")
        .populate("driver")
        .sort({ createdAt: -1 });
      return res.json(orders);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getAllDrivers(req: Request, res: Response) {
    try {
      const drivers = await Driver.find().populate("user");
      return res.json(drivers);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getDashboardStats(req: Request, res: Response) {
    try {
      const totalUsers = await User.countDocuments();
      const totalOrders = await Order.countDocuments();
      const activeDrivers = await Driver.countDocuments({
        status: DriverStatus.ONLINE
      });
      
      const revenueData = await Order.aggregate([
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ]);
      const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

      return res.json({
        totalUsers,
        totalOrders,
        activeDrivers,
        totalRevenue,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
