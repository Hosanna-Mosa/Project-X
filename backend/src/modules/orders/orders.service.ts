import mongoose from "mongoose";
import Order, { OrderStatus, ServiceType, StopType } from "../../database/models/Order";
import User from "../../database/models/User";
import Driver from "../../database/models/Driver";
import { RoutingService } from "../routing/routing.service";
import { PricingService } from "../pricing/pricing.service";
import { SocketManager } from "../../sockets/socket.manager";

export class OrdersService {
  private routingService = new RoutingService();
  private pricingService = new PricingService();

  async createOrder(userId: string, stopsData: any[], serviceType?: ServiceType, vendorId?: string, totals?: any, radius?: number, duration?: number) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid User ID format");
    }
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const startPos = { 
      latitude: stopsData[0].latitude || stopsData[0].lat, 
      longitude: stopsData[0].longitude || stopsData[0].lng 
    };

    const optimizationResult = await this.routingService.optimizeAndGetRoute(
      startPos, 
      stopsData.map(s => ({
        id: s.id || Math.random().toString(),
        address: s.address || "Address",
        latitude: s.latitude || s.lat,
        longitude: s.longitude || s.lng,
        type: s.type,
        items: s.items || [],
        instructions: s.instructions,
        deliveryAddress: s.deliveryAddress,
      }))
    );

    if (!optimizationResult) throw new Error("Could not optimize route");

    // Use new fare breakdown for rides, fallback to old pricing for delivery
    const effectiveType = serviceType || ServiceType.DELIVERY;
    const isRide = effectiveType !== ServiceType.DELIVERY;

    let totalPrice: number;
    let priceBreakdown: any;

    if (isRide) {
      priceBreakdown = this.pricingService.calculateFareBreakdown(
        effectiveType,
        optimizationResult.totalDistance,
        optimizationResult.estimatedTime,
      );
      totalPrice = priceBreakdown.total;
    } else {
      totalPrice = totals?.total ?? this.pricingService.calculatePrice(
        optimizationResult.totalDistance, 
        optimizationResult.optimizedStops.length
      );
      priceBreakdown = {
        baseFare: totals?.subtotal ?? this.pricingService.getRateConfig(effectiveType).baseFare,
        distanceFare: totals?.deliveryFee ?? totalPrice - this.pricingService.getRateConfig(effectiveType).baseFare,
        timeFare: 0,
        surgeMultiplier: 1,
        total: totalPrice,
      };
    }

    const orderStops = optimizationResult.optimizedStops.map((stop: any, index: number) => {
      let normalizedType = StopType.DROP;
      if (stop.type) {
        const typeLC = stop.type.toLowerCase();
        if (typeLC === "pickup") {
          normalizedType = StopType.PICKUP;
        } else if (typeLC === "stop") {
          normalizedType = StopType.STOP;
        } else {
          normalizedType = StopType.DROP;
        }
      } else {
        normalizedType = index === 0 ? StopType.PICKUP : StopType.DROP;
      }

      return {
        sequence: index + 1,
        location: {
          type: "Point",
          coordinates: [stop.longitude, stop.latitude],
        },
        address: stop.address,
        type: normalizedType,
        items: {
          lines: stop.items || [],
          instructions: stop.instructions,
          deliveryAddress: stop.deliveryAddress,
          totals: normalizedType === StopType.DROP ? totals : undefined,
        },
      };
    });

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const restaurantPickupCode = Math.floor(1000 + Math.random() * 9000).toString();

    const order = new Order({
      user: userId,
      vendor: vendorId,
      serviceType: effectiveType,
      totalDistance: optimizationResult.totalDistance,
      totalPrice,
      priceBreakdown,
      status: isRide ? OrderStatus.SEARCHING_DRIVER : OrderStatus.SEARCHING_DRIVER,
      stops: orderStops,
      radius,
      duration,
      deliveryOtp,
      restaurantPickupCode,
      polyline: optimizationResult.polyline,
    });

    const savedOrder = await order.save();

    const result = {
      ...savedOrder.toObject(),
      estimatedTime: optimizationResult.estimatedTime,
      polyline: optimizationResult.polyline,
      isRide,
    };

    // BROADCAST to drivers
    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      socketManager.broadcastToDrivers("new_order", {
        id: savedOrder._id,
        serviceType: effectiveType,
        distance: `${optimizationResult.totalDistance} km`,
        duration: duration ? `${duration} hrs` : `${optimizationResult.estimatedTime} min`,
        radius: radius,
        earnings: Math.round(savedOrder.totalPrice * 0.8),
        customerName: user.name || "Customer",
        customerPhone: user.phone || "N/A",
        status: "pending",
        timestamp: new Date(),
        restaurantPickupCode: savedOrder.restaurantPickupCode,
        stops: savedOrder.stops.map(s => ({
          id: (s as any)._id,
          type: s.type.toLowerCase(),
          locationName: s.address?.split(',')[0],
          address: s.address,
          lat: s.location.coordinates[1],
          lng: s.location.coordinates[0],
          items: s.items,
        }))
      });

      // NOTIFY vendor/restaurant
      if (vendorId) {
        console.log(`[SOCKET] Emitting new_order_vendor to vendor ${vendorId}`);
        socketManager.emitToUser(vendorId.toString(), "new_order_vendor", {
          id: savedOrder._id,
          serviceType: effectiveType,
          totalPrice: savedOrder.totalPrice,
          customerName: user.name || "Customer",
          customerPhone: user.phone || "N/A",
          status: savedOrder.status,
          timestamp: savedOrder.createdAt,
          restaurantPickupCode: savedOrder.restaurantPickupCode,
          stops: savedOrder.stops.map(s => ({
            id: (s as any)._id,
            type: s.type.toLowerCase(),
            locationName: s.address?.split(',')[0],
            address: s.address,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
            items: s.items,
          }))
        });
      }
    }

    return result;
  }

  async estimateFare(
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
    serviceType: ServiceType,
  ) {
    // Calculate approximate distance using Haversine
    const distanceInKm = this.haversineDistance(pickupLat, pickupLng, dropLat, dropLng);
    const estimatedMinutes = Math.round(distanceInKm * 4); // assume avg speed 15 km/h

    const breakdown = this.pricingService.calculateFareBreakdown(
      serviceType,
      distanceInKm,
      estimatedMinutes,
    );

    return {
      distanceInKm: Math.round(distanceInKm * 10) / 10,
      estimatedMinutes,
      fareBreakdown: breakdown,
    };
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getOrderById(orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return null;
    }
    return Order.findById(orderId).populate("user").populate("driver");
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    
    order.status = status;
    const savedOrder = await order.save();

    // Broadcast status change via Socket
    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      socketManager.emitToOrderRoom(orderId.toString(), "order_status_update", {
        orderId: orderId.toString(),
        status: status,
      });

      // ALSO: if the order has a vendor, emit to the vendor room!
      if (order.vendor) {
        socketManager.emitToUser(order.vendor.toString(), "order_status_update_vendor", {
          orderId: orderId.toString(),
          status: status,
        });
      }
    }

    return savedOrder;
  }

  async getUserOrders(userId: string) {
    return Order.find({ user: userId }).sort({ createdAt: -1 });
  }

  async getVendorOrders(vendorId: string) {
    return Order.find({ vendor: vendorId })
      .populate("user")
      .sort({ createdAt: -1 });
  }

  async acceptOrder(orderId: string, driverUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid order ID");
    }

    const driver = await Driver.findOne({ user: driverUserId });
    if (!driver) throw new Error("Driver profile not found");

    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (order.status !== OrderStatus.SEARCHING_DRIVER) {
      throw new Error("Order is no longer available");
    }

    order.driver = driver._id;
    order.status = OrderStatus.DRIVER_ASSIGNED;
    const savedOrder = await order.save();

    // Broadcast to the customer that order is accepted
    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      // Driver details to send to customer
      const driverUser = await User.findById(driver.user);
      const driverInfo = {
        id: driver._id,
        name: driverUser?.name || "Driver",
        phone: driverUser?.phone || "",
        vehicle: driver.vehicleType || "unknown",
      };
      
      socketManager.emitToOrderRoom(orderId.toString(), "order_accepted", {
        orderId: orderId.toString(),
        driver: driverInfo,
      });
    }

    return savedOrder;
  }
}
