import { Request, Response } from "express";
import { OrdersService } from "./orders.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { OrderStatus, ServiceType } from "../../database/models/Order";

const ordersService = new OrdersService();

export class OrdersController {
  async estimateFare(req: Request, res: Response) {
    try {
      const { pickupLat, pickupLng, dropLat, dropLng, serviceType } = req.query;

      const parsedPickupLat = Number(pickupLat);
      const parsedPickupLng = Number(pickupLng);
      const parsedDropLat = Number(dropLat);
      const parsedDropLng = Number(dropLng);
      const parsedServiceType = String(serviceType || ServiceType.CAB) as ServiceType;

      if (
        !Number.isFinite(parsedPickupLat) ||
        !Number.isFinite(parsedPickupLng) ||
        !Number.isFinite(parsedDropLat) ||
        !Number.isFinite(parsedDropLng)
      ) {
        return res.status(400).json({ message: "Valid pickup and drop coordinates are required." });
      }

      if (!Object.values(ServiceType).includes(parsedServiceType)) {
        return res.status(400).json({ message: "Invalid service type." });
      }

      const estimate = await ordersService.estimateFare(
        parsedPickupLat,
        parsedPickupLng,
        parsedDropLat,
        parsedDropLng,
        parsedServiceType,
      );

      return res.json(estimate);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async create(req: AuthRequest, res: Response) {
    console.log("Creating Order - Payload:", req.body);
    try {
      const { stops, serviceType, vendorId, totals } = req.body;
      const userId = req.user?.userId;

      if (!userId || !stops || stops.length === 0) {
        console.warn("Incomplete Order Data Received.", { userId, stopsCount: stops?.length });
        return res.status(400).json({ message: "Incomplete order data. User and stops are required." });
      }

      const order = await ordersService.createOrder(userId, stops, serviceType, vendorId, totals);

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

  async getUserOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const orders = await ordersService.getUserOrders(userId);
      return res.json(orders);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getVendorOrders(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;
      const orders = await ordersService.getVendorOrders(vendorId as string);
      return res.json(orders);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
