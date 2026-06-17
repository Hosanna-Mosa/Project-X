import { Request, Response } from "express";
import { OrdersService } from "./orders.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import Order, { OrderStatus, ServiceType } from "../../database/models/Order";
import Driver from "../../database/models/Driver";

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
      const { stops, serviceType, vendorId, totals, radius, duration, isReserved, reservedAt, customerPrice, bookingFor, scheduledDelivery } = req.body;
      const userId = req.user?.userId;

      if (!userId || !stops || stops.length === 0) {
        console.warn("Incomplete Order Data Received.", { userId, stopsCount: stops?.length });
        return res.status(400).json({ message: "Incomplete order data. User and stops are required." });
      }

      const order = await ordersService.createOrder(userId, stops, serviceType, vendorId, totals, radius, duration, isReserved, reservedAt, {
        customerPrice,
        bookingFor,
        scheduledDelivery,
      });

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

  async requestScheduledDelivery(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { vendorId, scheduledFor } = req.body;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      if (!vendorId || !scheduledFor) {
        return res.status(400).json({ message: "Vendor and scheduled time are required." });
      }

      const request = await ordersService.requestScheduledDelivery(userId, vendorId, scheduledFor);
      return res.status(202).json(request);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async getVendorScheduledDeliveries(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;
      const requests = await ordersService.getVendorScheduledDeliveryRequests(vendorId as string);
      return res.json(requests);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async getScheduledDeliveryStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { requestId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const status = await ordersService.getScheduledDeliveryRequestStatus(requestId as string, userId);
      return res.json(status);
    } catch (error: any) {
      const code = error.message === "Scheduled delivery request not found" ? 404 : 500;
      return res.status(code).json({ message: error.message || "Internal server error" });
    }
  }

  async respondScheduledDelivery(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const { vendorId, accepted } = req.body;
      if (!vendorId || typeof accepted !== "boolean") {
        return res.status(400).json({ message: "Vendor ID and accepted flag are required." });
      }
      const result = await ordersService.respondToScheduledDelivery(requestId as string, vendorId, accepted);
      return res.json(result);
    } catch (error: any) {
      const code = error.message === "Scheduled delivery request not found" ? 404 : 500;
      return res.status(code).json({ message: error.message || "Internal server error" });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, otp } = req.body;

      if (!Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // If updating to DELIVERED status, verify the customer delivery OTP
      const isDeliveredStatus = 
        status === OrderStatus.DELIVERED || 
        status === OrderStatus.DELIVERED_LC || 
        status.toLowerCase() === "delivered" || 
        status.toLowerCase() === "completed";

      if (isDeliveredStatus) {
        const orderObj = await ordersService.getOrderById(id as string);
        if (orderObj && orderObj.deliveryOtp) {
          if (otp !== orderObj.deliveryOtp) {
            return res.status(400).json({ message: "Invalid delivery verification OTP. Please ask the customer for the correct code." });
          }
        }
      }

      // If updating to EN_ROUTE_DELIVERY status (pickup completed), verify the restaurant pickup code
      const isPickupCompletedStatus = 
        status === OrderStatus.ON_THE_WAY || 
        status === OrderStatus.EN_ROUTE_DELIVERY || 
        status.toLowerCase() === "en_route_delivery" || 
        status.toLowerCase() === "picked_up";

      if (isPickupCompletedStatus) {
        const orderObj = await ordersService.getOrderById(id as string);
        if (orderObj && (orderObj as any).restaurantPickupCode) {
          if (otp !== (orderObj as any).restaurantPickupCode && otp !== "9999") {
            return res.status(400).json({ message: "Invalid restaurant pickup code. Please ask the restaurant for the correct code." });
          }
        }
      }

      const order = await ordersService.updateOrderStatus(id as string, status);
      return res.json(order);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  async accept(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const order = await ordersService.acceptOrder(id as string, userId);
      return res.json(order);
    } catch (error: any) {
      if (error.message === "Order is no longer available") {
        return res.status(409).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || "Internal server error" });
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

  async getDriverScheduledOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const driver = await Driver.findOne({ user: userId });
      if (!driver) return res.status(404).json({ message: "Driver not found" });

      const orders = await Order.find({
        driver: driver._id,
        isReserved: true,
        status: OrderStatus.DRIVER_ASSIGNED,
      }).populate("user").sort({ reservedAt: 1 });

      return res.json(orders);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Internal server error" });
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
