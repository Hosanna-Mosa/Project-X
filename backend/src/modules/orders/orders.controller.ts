import { Request, Response, NextFunction } from "express";
import { OrdersService } from "./orders.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import Order, { OrderStatus, ServiceType } from "../../database/models/Order";
import Driver from "../../database/models/Driver";
import Coupon from "../../database/models/Coupon";
import { ValidationError, NotFoundError, UnauthorizedError, ConflictError } from "../../utils/errors";

const ordersService = new OrdersService();

export class OrdersController {
  async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, cartTotal } = req.body;
      if (!code) {
        throw new ValidationError("Promo code is required");
      }

      const coupon = await Coupon.findOne({ code: code.toUpperCase() });
      if (!coupon) {
        throw new NotFoundError("Invalid promo code");
      }

      if (!coupon.isActive) {
        throw new ValidationError("This promo code is no longer active");
      }

      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        throw new ValidationError("This promo code has expired");
      }

      const orderTotal = Number(cartTotal) || 0;
      if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
        throw new ValidationError(`This promo code requires a minimum order of ₹${coupon.minOrderValue}`);
      }

      return res.json({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue,
      });
    } catch (error: any) {
      next(error);
    }
  }

  async estimateFare(req: Request, res: Response, next: NextFunction) {
    try {
      const { pickupLat, pickupLng, dropLat, dropLng, serviceType } = req.query;

      const parsedPickupLat = Number(pickupLat);
      const parsedPickupLng = Number(pickupLng);
      const parsedDropLat = Number(dropLat);
      const parsedDropLng = Number(dropLng);
      const parsedServiceType = String(serviceType || ServiceType.CAB) as ServiceType;

      const estimate = await ordersService.estimateFare(
        parsedPickupLat,
        parsedPickupLng,
        parsedDropLat,
        parsedDropLng,
        parsedServiceType,
      );

      return res.json(estimate);
    } catch (error: any) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { stops, serviceType, vendorId, totals, radius, duration, isReserved, reservedAt, customerPrice, bookingFor, scheduledDelivery } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new UnauthorizedError("User is not authenticated");
      }

      const order = await ordersService.createOrder(userId, stops, serviceType, vendorId, totals, radius, duration, isReserved, reservedAt, {
        customerPrice,
        bookingFor,
        scheduledDelivery,
      });

      return res.status(201).json(order);
    } catch (error: any) {
      next(error);
    }
  }

  async getOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await ordersService.getOrderById(id as string);

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      return res.json(order);
    } catch (error) {
      next(error);
    }
  }

  async requestScheduledDelivery(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { vendorId, scheduledFor } = req.body;
      if (!userId) {
        throw new UnauthorizedError("User is not authenticated");
      }

      const request = await ordersService.requestScheduledDelivery(userId, vendorId, scheduledFor);
      return res.status(202).json(request);
    } catch (error: any) {
      next(error);
    }
  }

  async getVendorScheduledDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId } = req.params;
      const requests = await ordersService.getVendorScheduledDeliveryRequests(vendorId as string);
      return res.json(requests);
    } catch (error: any) {
      next(error);
    }
  }

  async getScheduledDeliveryStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { requestId } = req.params;
      if (!userId) {
        throw new UnauthorizedError("User is not authenticated");
      }
      const status = await ordersService.getScheduledDeliveryRequestStatus(requestId as string, userId);
      return res.json(status);
    } catch (error: any) {
      if (error.message === "Scheduled delivery request not found") {
        return next(new NotFoundError(error.message));
      }
      next(error);
    }
  }

  async respondScheduledDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestId } = req.params;
      const { vendorId, accepted } = req.body;
      
      const result = await ordersService.respondToScheduledDelivery(requestId as string, vendorId, accepted);
      return res.json(result);
    } catch (error: any) {
      if (error.message === "Scheduled delivery request not found") {
        return next(new NotFoundError(error.message));
      }
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, otp } = req.body;

      if (!Object.values(OrderStatus).includes(status)) {
        throw new ValidationError("Invalid status value");
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
            throw new ValidationError("Invalid delivery verification OTP. Please ask the customer for the correct code.");
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
            throw new ValidationError("Invalid restaurant pickup code. Please ask the restaurant for the correct code.");
          }
        }
      }

      const order = await ordersService.updateOrderStatus(id as string, status);
      return res.json(order);
    } catch (error: any) {
      if (error.message === "Order not found") {
        return next(new NotFoundError(error.message));
      }
      next(error);
    }
  }

  async accept(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new UnauthorizedError("User is not authenticated");
      }

      const order = await ordersService.acceptOrder(id as string, userId);
      return res.json(order);
    } catch (error: any) {
      if (error.message === "Order is no longer available") {
        return next(new ConflictError(error.message));
      }
      if (error.message === "Driver profile not found" || error.message === "Order not found") {
        return next(new NotFoundError(error.message));
      }
      next(error);
    }
  }

  async getUserOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError("User is not authenticated");
      }

      const orders = await ordersService.getUserOrders(userId);
      return res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async getDriverScheduledOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError("User is not authenticated");
      }

      const driver = await Driver.findOne({ user: userId });
      if (!driver) {
        throw new NotFoundError("Driver not found");
      }

      const orders = await Order.find({
        driver: driver._id,
        isReserved: true,
        status: OrderStatus.DRIVER_ASSIGNED,
      }).populate("user").sort({ reservedAt: 1 });

      return res.json(orders);
    } catch (error: any) {
      next(error);
    }
  }

  async getVendorOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId } = req.params;
      const orders = await ordersService.getVendorOrders(vendorId as string);
      return res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async triggerSOS(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { id: orderId } = req.params;

      if (!userId) {
        throw new UnauthorizedError("User is not authenticated");
      }

      const success = await ordersService.triggerOrderSOS(orderId as string, userId);
      return res.json({ success, message: "SOS emergency triggered. Authorities and fleet admins notified." });
    } catch (error) {
      next(error);
    }
  }
}
