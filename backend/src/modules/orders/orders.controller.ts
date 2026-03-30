import { Response } from "express";
import { OrdersService } from "./orders.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { OrderStatus } from "../../database/entities/Order";

const ordersService = new OrdersService();

export class OrdersController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { stops } = req.body;
      const userId = req.user?.userId;

      if (!userId || !stops || stops.length === 0) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const order = await ordersService.createOrder(userId, stops);

      // Trigger Matching Driver logic (in background or service)
      // For now, return order
      return res.status(201).json(order);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async getOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const order = await ordersService.getOrderById(id as string);

      if (!order) return res.status(404).json({ message: "Order not found" });

      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const order = await ordersService.updateOrderStatus(id as string, status);
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
