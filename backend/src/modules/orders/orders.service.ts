import mongoose from "mongoose";
import Order, { OrderStatus, ServiceType, StopType } from "../../database/models/Order";
import User from "../../database/models/User";
import Driver from "../../database/models/Driver";
import Vendor from "../../database/models/Vendor";
import ScheduledDeliveryRequest from "../../database/models/ScheduledDeliveryRequest";
import SupportTicket from "../../database/models/SupportTicket";
import { RoutingService } from "../routing/routing.service";
import { PricingService } from "../pricing/pricing.service";
import { SocketManager } from "../../sockets/socket.manager";
import { QueueManager } from "../../services/queue.service";
import { ZonesService } from "../zones/zones.service";
import Zone from "../../database/models/Zone";
import { ValidationError } from "../../utils/errors";
import { NotificationService } from "../../services/notification.service";

export class OrdersService {
  private routingService = new RoutingService();
  private pricingService = new PricingService();
  private zonesService = new ZonesService();

  async createOrder(userId: string, stopsData: any[], serviceType?: ServiceType, vendorId?: string, totals?: any, radius?: number, duration?: number, isReserved?: boolean, reservedAt?: Date | string, metadata?: any) {
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

    let surgeMultiplier = 1.0;
    const activeZonesCount = await Zone.countDocuments({ isActive: true });
    if (activeZonesCount > 0) {
      const zone = await this.zonesService.getZoneForCoordinates(startPos.latitude, startPos.longitude, effectiveType);
      if (zone) {
        surgeMultiplier = zone.pricingMultiplier;
      }
    }

    let totalPrice: number;
    let priceBreakdown: any;

    if (metadata?.customerPrice && Number(metadata.customerPrice) > 0) {
      totalPrice = Math.round(Number(metadata.customerPrice));
      priceBreakdown = {
        baseFare: totalPrice,
        distanceFare: 0,
        timeFare: 0,
        surgeMultiplier: 1,
        total: totalPrice,
      };
    } else if (isRide) {
      priceBreakdown = await this.pricingService.calculateFareBreakdown(
        effectiveType,
        optimizationResult.totalDistance,
        optimizationResult.estimatedTime,
        surgeMultiplier,
      );
      totalPrice = priceBreakdown.total;
    } else {
      totalPrice = totals?.total ?? await this.pricingService.calculatePrice(
        optimizationResult.totalDistance, 
        optimizationResult.optimizedStops.length,
        surgeMultiplier,
      );
      const rateConfig = await this.pricingService.getRateConfig(effectiveType);
      priceBreakdown = {
        baseFare: totals?.subtotal ?? rateConfig.baseFare,
        distanceFare: totals?.deliveryFee ?? totalPrice - rateConfig.baseFare,
        timeFare: 0,
        surgeMultiplier,
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

    const generateIndustrialOrderId = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `ORD-${year}${month}${day}-${randomSuffix}`;
    };

    const order = new Order({
      _id: generateIndustrialOrderId(),
      user: userId,
      vendor: vendorId,
      serviceType: effectiveType,
      totalDistance: optimizationResult.totalDistance,
      totalPrice,
      priceBreakdown,
      status: isReserved ? OrderStatus.CREATED : OrderStatus.SEARCHING_DRIVER,
      stops: orderStops,
      radius,
      duration,
      customerPrice: metadata?.customerPrice ? Math.round(Number(metadata.customerPrice)) : undefined,
      bookingFor: metadata?.bookingFor,
      scheduledDelivery: metadata?.scheduledDelivery,
      isReserved,
      reservedAt: reservedAt ? new Date(reservedAt) : undefined,
      deliveryOtp,
      restaurantPickupCode,
      polyline: optimizationResult.polyline,
    });

    const savedOrder = await order.save();

    // Schedule reservation notification if this is a reserved ride/delivery
    if (savedOrder.isReserved && savedOrder.reservedAt) {
      const fifteenMinutesBefore = savedOrder.reservedAt.getTime() - 15 * 60 * 1000;
      const delay = fifteenMinutesBefore - Date.now();
      await QueueManager.getInstance().scheduleReservedRideNotification(savedOrder._id, delay);
    }

    const result = {
      ...savedOrder.toObject(),
      estimatedTime: optimizationResult.estimatedTime,
      polyline: optimizationResult.polyline,
      isRide,
    };

    // Fetch vendor details for broadcast
    let vendorName = "Restaurant";
    let vendorPhone = "";
    if (vendorId) {
      try {
        const vendorObj = await Vendor.findById(vendorId);
        if (vendorObj) {
          vendorName = vendorObj.name;
          vendorPhone = vendorObj.phone;
        }
      } catch (err) {
        console.error("Error fetching vendor for order broadcast:", err);
      }
    }

    // BROADCAST to drivers
    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      const { ZonesService } = require("../zones/zones.service");
      const zonesService = new ZonesService();
      const pickupZone = await zonesService.getZoneForCoordinates(startPos.latitude, startPos.longitude);
      const pickupZoneName = pickupZone ? pickupZone.name : "Unknown Pickup Zone";

      // Load Zone map for human-readable driver zone names
      const ZoneModel = require("../../database/models/Zone").default;
      const allZones = await ZoneModel.find().lean();
      const zoneNameMap = new Map<string, string>();
      allZones.forEach((z: any) => zoneNameMap.set(z._id.toString(), z.name));

      console.log("\n============================================================");
      console.log("🛒 [NEW ORDER BOOKED]");
      console.log(`Order ID: ${savedOrder._id}`);
      console.log(`👤 Customer: ${user.name || "N/A"} (${user.phone || "N/A"})`);
      console.log(`📍 Booked Pickup Zone: "${pickupZoneName}"`);
      console.log(`Service Type: ${effectiveType}`);

      // 1. Find nearby/matching drivers
      const { DriverService } = require("../drivers/drivers.service");
      const driversService = new DriverService();
      
      let nearbyDrivers: any[] = [];
      try {
        nearbyDrivers = await driversService.getNearbyDrivers(
          startPos.latitude,
          startPos.longitude,
          undefined, // Let 3-Stage Dynamic Expansion drive search radius per vehicle type
          effectiveType
        );
      } catch (err) {
        console.error("Error getting nearby drivers in createOrder:", err);
      }

      let driversToNotify = [...nearbyDrivers];
      // Fallback: If no drivers within immediate radius, check online drivers in the same zone
      if (driversToNotify.length === 0) {
        try {
          const Driver = require("../../database/models/Driver").default;
          const zoneQuery: any = { status: "ONLINE", isAvailable: true };
          if (pickupZone) {
            zoneQuery.preferredZone = pickupZone._id;
          }

          const onlineZoneDrivers = await Driver.find(zoneQuery).populate("user");
          driversToNotify = onlineZoneDrivers;
        } catch (err) {
          console.error("Error fetching fallback online drivers:", err);
        }
      }

      // 2. Filter drivers in homeMode
      const filteredDrivers: any[] = [];
      const pickupCoords = savedOrder.stops[0]?.location?.coordinates;
      const dropoffCoords = savedOrder.stops[savedOrder.stops.length - 1]?.location?.coordinates;

      if (pickupCoords && dropoffCoords) {
        for (const d of driversToNotify) {
          if (d.homeMode === true) {
            const onTheWay = await driversService.isOrderOnTheWayToHome(
              (d._id as any).toString(),
              pickupCoords,
              dropoffCoords
            );
            if (onTheWay) {
              filteredDrivers.push(d);
            }
          } else {
            filteredDrivers.push(d);
          }
        }
        driversToNotify = filteredDrivers;
      }

      console.log(`\n📢 [NOTIFIED DRIVERS]: ${driversToNotify.length} drivers selected`);
      driversToNotify.forEach((d: any) => {
        const uName = (d.user as any)?.name || "Unknown";
        const uPhone = (d.user as any)?.phone || "No Phone";
        const dZoneName = d.preferredZone ? (zoneNameMap.get(d.preferredZone.toString()) || "Unknown Zone") : "No Zone";
        console.log(`   🚗 Driver: ${uName} (${uPhone}) | Driver ID: ${d._id} | Assigned Zone: "${dZoneName}"`);
      });
      console.log("============================================================\n");

      // 3. Emit real-time WebSocket events specifically to the matched/filtered drivers
      const orderPayload = {
        id: savedOrder._id,
        serviceType: effectiveType,
        distance: `${optimizationResult.totalDistance} km`,
        duration: duration ? `${duration} hrs` : `${optimizationResult.estimatedTime} min`,
        radius: radius,
        earnings: Math.round(savedOrder.totalPrice * 0.8),
        customerPrice: savedOrder.customerPrice,
        bookingFor: savedOrder.bookingFor,
        scheduledDelivery: savedOrder.scheduledDelivery,
        customerName: user.name || "Customer",
        customerPhone: user.phone || "N/A",
        vendorName,
        vendorPhone,
        status: "pending",
        timestamp: new Date(),
        restaurantPickupCode: savedOrder.restaurantPickupCode,
        isReserved: savedOrder.isReserved,
        reservedAt: savedOrder.reservedAt,
        stops: savedOrder.stops.map(s => ({
          id: (s as any)._id,
          type: s.type.toLowerCase(),
          locationName: s.address?.split(',')[0],
          address: s.address,
          lat: s.location.coordinates[1],
          lng: s.location.coordinates[0],
          items: s.items,
        }))
      };

      socketManager.logConnectionStatus("before_new_order_selective_emit", userId, undefined, savedOrder._id.toString());
      
      require('fs').appendFileSync('e:/X/x25/Project-X/backend/debug_helper.txt', `\n[${new Date().toISOString()}] Created order ${savedOrder._id} type: ${effectiveType}, driversToNotify: ${driversToNotify.length}, isReserved: ${savedOrder.isReserved}\n`);

      for (const d of driversToNotify) {
        const driverUser = d.user as any;
        if (driverUser && driverUser._id) {
          require('fs').appendFileSync('e:/X/x25/Project-X/backend/debug_helper.txt', ` -> emitting new_order to driverUser._id: ${driverUser._id.toString()}\n`);
          socketManager.emitToDriver(driverUser._id.toString(), "new_order", orderPayload, "orders.createOrder");
        }
      }
      
      socketManager.logConnectionStatus("after_new_order_selective_emit", userId, undefined, savedOrder._id.toString());

      // 4. Send push & in-app notifications to matched/filtered drivers
      if (!savedOrder.isReserved) {
        (async () => {
          try {
            const earnings = Math.round(savedOrder.totalPrice * 0.8);
            const serviceLabel = effectiveType === ServiceType.DELIVERY ? "delivery" : "ride";

            for (const d of driversToNotify) {
              const driverUser = d.user as any;
              if (driverUser && driverUser._id) {
                await NotificationService.getInstance().sendNotification({
                  userId: driverUser._id.toString(),
                  title: "New Delivery Request Nearby! 🚖",
                  body: `Earn ₹${earnings} for a ${effectiveType} ${serviceLabel} from ${savedOrder.stops[0]?.address?.split(',')[0] || "nearby"}.`,
                  type: "transactional",
                  category: "order_status",
                  data: {
                    orderId: savedOrder._id,
                    serviceType: effectiveType,
                    type: "new_request",
                  }
                });
              }
            }
          } catch (err) {
            console.error("[orders.service] Error sending driver match notifications:", err);
          }
        })();
      }

      // NOTIFY vendor/restaurant
      if (vendorId && !isReserved) {
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
          scheduledDelivery: savedOrder.scheduledDelivery,
          stops: savedOrder.stops.map(s => ({
            id: (s as any)._id,
            type: s.type.toLowerCase(),
            locationName: s.address?.split(',')[0],
            address: s.address,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
            items: s.items,
          }))
        }, "orders.createOrder.vendor");
      }
    }

    return result;
  }

  async requestScheduledDelivery(userId: string, vendorId: string, scheduledFor: Date | string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("Invalid User ID format");
    if (!vendorId) throw new Error("Vendor is required");

    const user = await User.findById(userId);
    const vendor = await Vendor.findById(vendorId);
    if (!user) throw new Error("User not found");
    if (!vendor) throw new Error("Vendor not found");

    const requestedAt = new Date(scheduledFor);
    if (Number.isNaN(requestedAt.getTime()) || requestedAt.getTime() <= Date.now()) {
      throw new Error("Choose a valid future delivery time");
    }

    const requestId = `SCH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerId = user._id.toString();

    const saved = await ScheduledDeliveryRequest.create({
      requestId,
      customer: user._id,
      vendor: vendor._id,
      customerName: user.name || "Customer",
      customerPhone: user.phone || "",
      scheduledFor: requestedAt,
      status: "pending",
    });

    const payload = {
      requestId,
      vendorId: vendor._id.toString(),
      customerId,
      customerName: saved.customerName,
      customerPhone: saved.customerPhone,
      scheduledFor: requestedAt.toISOString(),
      status: "pending",
    };

    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      socketManager.emitToUser(vendor._id.toString(), "scheduled_delivery_request", payload);
      socketManager.emitToUser(customerId, "scheduled_delivery_pending", payload);
    }

    return {
      requestId,
      vendorId: vendor._id.toString(),
      customerId,
      scheduledFor: requestedAt.toISOString(),
      status: "pending",
    };
  }

  async getVendorScheduledDeliveryRequests(vendorId: string) {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) throw new Error("Invalid vendor ID");
    const requests = await ScheduledDeliveryRequest.find({ vendor: vendorId })
      .sort({ createdAt: -1 })
      .lean();
    return requests.map((request) => ({
      requestId: request.requestId,
      vendorId: request.vendor.toString(),
      customerId: request.customer.toString(),
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      scheduledFor: request.scheduledFor,
      status: request.status,
      respondedAt: request.respondedAt,
      createdAt: request.createdAt,
    }));
  }

  async getScheduledDeliveryRequestStatus(requestId: string, customerId: string) {
    const request = await ScheduledDeliveryRequest.findOne({ requestId, customer: customerId }).lean();
    if (!request) throw new Error("Scheduled delivery request not found");
    return {
      requestId: request.requestId,
      vendorId: request.vendor.toString(),
      customerId: request.customer.toString(),
      scheduledFor: request.scheduledFor,
      status: request.status,
      respondedAt: request.respondedAt,
    };
  }

  async respondToScheduledDelivery(requestId: string, vendorId: string, accepted: boolean) {
    const request = await ScheduledDeliveryRequest.findOne({ requestId, vendor: vendorId });
    if (!request) throw new Error("Scheduled delivery request not found");
    if (request.status !== "pending") {
      throw new Error(`Request already ${request.status}`);
    }

    request.status = accepted ? "accepted" : "rejected";
    request.respondedAt = new Date();
    await request.save();

    const customerId = request.customer.toString();
    const payload = {
      requestId: request.requestId,
      vendorId: request.vendor.toString(),
      customerId,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      scheduledFor: request.scheduledFor.toISOString(),
      accepted,
      status: request.status,
    };

    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      socketManager.emitToUser(
        customerId,
        accepted ? "scheduled_delivery_accepted" : "scheduled_delivery_rejected",
        payload,
      );
    }

    return payload;
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

    let surgeMultiplier = 1.0;
    const activeZonesCount = await Zone.countDocuments({ isActive: true });
    if (activeZonesCount > 0) {
      const zone = await this.zonesService.getZoneForCoordinates(pickupLat, pickupLng, serviceType);
      if (zone) {
        surgeMultiplier = zone.pricingMultiplier;
      }
    }

    const breakdown = await this.pricingService.calculateFareBreakdown(
      serviceType,
      distanceInKm,
      estimatedMinutes,
      surgeMultiplier,
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

  private getOrderQuery(orderId: string): any {
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      return { $or: [{ _id: orderId }, { _id: new mongoose.Types.ObjectId(orderId) }] };
    }
    return { _id: orderId };
  }

  async getOrderById(orderId: string) {
    if (!orderId) {
      return null;
    }
    return Order.findOne(this.getOrderQuery(orderId))
      .populate("user")
      .populate({
        path: "driver",
        populate: { path: "user" }
      })
      .populate("vendor");
  }

  async increaseOrderPrice(orderId: string, amount: number, userId: string) {
    const order = await Order.findOne(this.getOrderQuery(orderId));
    if (!order) throw new Error("Order not found");

    if (order.user.toString() !== userId) {
      throw new Error("Unauthorized to modify this order");
    }

    if (order.status !== OrderStatus.SEARCHING_DRIVER && order.status !== OrderStatus.CREATED) {
      throw new Error("Cannot increase price for a non-pending order");
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const currentPrice = order.customerPrice || order.totalPrice;
      const newPrice = currentPrice + amount;

      order.customerPrice = newPrice;
      order.totalPrice = newPrice;
      
      if (order.priceBreakdown) {
        const bd = order.priceBreakdown as any;
        bd.baseFare = (bd.baseFare || bd.total) + amount;
        bd.total = newPrice;
        order.priceBreakdown = bd;
      }

      await order.save({ session });
      await session.commitTransaction();

      await order.populate("user");
      await order.populate("vendor");

      const vendor = order.vendor as any;
      const user = order.user as any;

      // Emit to drivers so they see the new price popup again
      const socketManager = SocketManager.getInstance();
      if (socketManager) {
        const payload = {
          id: order._id,
          serviceType: order.serviceType,
          distance: "Updated Price",
          duration: "ASAP",
          radius: 5000,
          earnings: Math.round(newPrice * 0.8),
          customerPrice: newPrice,
          bookingFor: order.bookingFor,
          scheduledDelivery: order.scheduledDelivery,
          customerName: user?.name || "Customer",
          customerPhone: user?.phone || "N/A",
          vendorName: vendor?.name || "Restaurant",
          vendorPhone: vendor?.phone || "",
          status: "pending",
          timestamp: new Date(),
          restaurantPickupCode: (order as any).restaurantPickupCode,
          isReserved: order.isReserved,
          reservedAt: order.reservedAt,
          stops: order.stops.map((s: any) => ({
            id: s._id,
            type: s.type.toLowerCase(),
            locationName: s.address?.split(',')[0],
            address: s.address,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
            items: s.items,
          }))
        };
        socketManager.broadcastToDrivers("new_order", payload, "orders.increasePrice");
      }

      // Send push notifications to notify them of the price bump
      (async () => {
        try {
          const { DriverService } = require("../drivers/drivers.service");
          const driversService = new DriverService();
          const startPos = order.stops[0].location.coordinates; // [lng, lat]
          const nearbyDrivers = await driversService.getNearbyDrivers(
            startPos[1], // lat
            startPos[0], // lng
            5000,
            order.serviceType
          );

          let driversToNotify = [...nearbyDrivers];
          if (driversToNotify.length === 0) {
            driversToNotify = await Driver.find({ status: "online", activeServices: order.serviceType }).populate("user");
          }

          const notificationService = NotificationService.getInstance();
          for (const d of driversToNotify) {
            if (d.user && (d.user as any).fcmToken) {
              await notificationService.sendPushNotification(
                (d.user as any).fcmToken,
                "Task Price Increased! 💰",
                `Customer added a tip! New task price: ₹${newPrice}`,
                { type: "new_order", orderId: order._id.toString() }
              );
            }
          }
        } catch (err) {
          console.error("Error sending push notifications for price increase:", err);
        }
      })();

      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await Order.findOne(this.getOrderQuery(orderId));
    if (!order) throw new Error("Order not found");
    
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      order.status = status;
      await order.save({ session });

      const isFinishedStatus = [
        OrderStatus.COMPLETED,
        OrderStatus.DELIVERED,
        OrderStatus.DELIVERED_LC,
        OrderStatus.CANCELLED
      ].includes(status) || 
      status.toLowerCase() === "completed" || 
      status.toLowerCase() === "delivered" || 
      status.toLowerCase() === "cancelled";

      if (isFinishedStatus && order.driver) {
        await Driver.findByIdAndUpdate(
          order.driver,
          { isAvailable: true },
          { session }
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    const savedOrder = await Order.findOne(this.getOrderQuery(orderId));

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

      // Broadcast order cancellation to all online drivers
      if (status === OrderStatus.CANCELLED) {
        socketManager.broadcastToDrivers("order_cancelled", {
          orderId: orderId.toString(),
        });
      }
    }

    const populated = await Order.findOne(this.getOrderQuery(orderId)).populate("user").populate("driver").populate("vendor");

    // Send Push & In-app notifications based on status changes
    if (populated && populated.user) {
      try {
        let title = "";
        let body = "";
        const serviceName = populated.serviceType === ServiceType.DELIVERY ? "delivery" : "ride";

        switch (status) {
          case OrderStatus.ARRIVED_PICKUP:
          case OrderStatus.ARRIVED_PICKUP_LC:
            title = "Driver Arrived 🚖";
            body = `Your driver has arrived at your location. Give PIN ${populated.deliveryOtp || ""} to start your ${serviceName} safely.`;
            break;
          case OrderStatus.ON_THE_WAY:
          case OrderStatus.IN_TRANSIT:
          case OrderStatus.EN_ROUTE_DELIVERY:
            title = populated.serviceType === ServiceType.DELIVERY ? "Out for Delivery 📦" : "Trip Started 📍";
            body = populated.serviceType === ServiceType.DELIVERY 
              ? "Your items have been picked up and are on the way!" 
              : "Your ride is now in progress. Enjoy the journey!";
            break;
          case OrderStatus.COMPLETED:
          case OrderStatus.DELIVERED:
          case OrderStatus.DELIVERED_LC:
            title = populated.serviceType === ServiceType.DELIVERY ? "Order Delivered 🍔" : "Trip Completed 🎉";
            body = `Your ${serviceName} is complete. Thank you for choosing us! Please rate your experience.`;
            break;
          case OrderStatus.CANCELLED:
            title = "Order Cancelled ❌";
            body = `Your ${serviceName} has been cancelled. If any payment was deducted, it will be refunded.`;
            break;
        }

        if (title && body) {
          await NotificationService.getInstance().sendNotification({
            userId: populated.user._id.toString(),
            title,
            body,
            type: "transactional",
            category: "order_status",
            data: {
              orderId: populated._id,
              status: status,
              serviceType: populated.serviceType,
            }
          });
        }
      } catch (err) {
        console.error("[orders.service] Error sending status update notification:", err);
      }
    }

    return populated || savedOrder || order;
  }

  async getUserOrders(userId: string) {
    return Order.find({ user: userId }).sort({ createdAt: -1 });
  }

  async getVendorOrders(vendorId: string) {
    return Order.find({ vendor: vendorId })
      .populate("user")
      .sort({ createdAt: -1 });
  }

  async declineOrder(orderId: string, driverUserId: string, reason: string) {
    const order = await Order.findOne(this.getOrderQuery(orderId));
    if (!order) throw new Error("Order not found");

    const driver = await Driver.findOne({ user: driverUserId });
    if (!driver) throw new Error("Driver profile not found");

    // Push the reason
    if (!order.declineReasons) {
      order.declineReasons = [];
    }
    
    // Prevent duplicate declining from the same driver
    const alreadyDeclined = order.declineReasons.some(r => r.driverId === driver._id.toString());
    if (!alreadyDeclined) {
      order.declineReasons.push({ driverId: driver._id.toString(), reason });
      await order.save();
    }

    // Average of all drivers or helpers opinion
    // E.g., if 2 or more drivers declined, find the most common reason
    if (order.declineReasons.length >= 2) {
      const reasonCounts = order.declineReasons.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      let mostCommonReason = "";
      let maxCount = 0;
      for (const [r, count] of Object.entries(reasonCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonReason = r;
        }
      }

      if (maxCount >= 2) { // At least 2 drivers agree on the exact same reason
        // Send a socket event to the customer
        const socketManager = SocketManager.getInstance();
        if (socketManager) {
          socketManager.emitToUser(order.user.toString(), "order_delayed_reason", {
            orderId: order._id,
            reason: mostCommonReason
          });
        }
      }
    }

    return order;
  }

  async acceptOrder(orderId: string, driverUserId: string) {
    if (!orderId) {
      throw new Error("Invalid order ID");
    }

    const driver = await Driver.findOne({ user: driverUserId });
    if (!driver) throw new Error("Driver profile not found");

    const order = await Order.findOne(this.getOrderQuery(orderId));
    if (!order) throw new Error("Order not found");

    if (order.status !== OrderStatus.SEARCHING_DRIVER && !(order.isReserved && order.status === OrderStatus.CREATED)) {
      throw new Error("Order is no longer available");
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      order.driver = driver._id;
      order.status = OrderStatus.DRIVER_ASSIGNED;
      await order.save({ session });

      driver.isAvailable = false;
      await driver.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    const savedOrder = await Order.findOne(this.getOrderQuery(orderId));

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
      
      const payload = {
        orderId: orderId.toString(),
        driver: driverInfo,
        isReserved: order.isReserved,
        reservedAt: order.reservedAt,
      };

      console.log(
        `[ORDER][SOCKET][DRIVER_ACCEPTED] order=${orderId} driverUser=${driverUserId} ` +
        `customerUser=${order.user?.toString() || "unknown"} driverProfile=${driver._id}`
      );
      socketManager.logConnectionStatus("before_driver_accept_emit", order.user?.toString(), driverUserId, orderId.toString());
      socketManager.emitToOrderRoom(orderId.toString(), "order_accepted", payload, "orders.acceptOrder");

      // Also emit directly to the customer's user room
      if (order.user) {
        socketManager.emitToUser(order.user.toString(), "order_accepted", payload, "orders.acceptOrder.customer");
      }
      socketManager.logConnectionStatus("after_driver_accept_emit", order.user?.toString(), driverUserId, orderId.toString());
    }

    const populated = await Order.findOne(this.getOrderQuery(orderId)).populate("user").populate("driver").populate("vendor");

    // Send Push & In-app Notification to customer
    if (populated && populated.user) {
      try {
        const driverUser = await User.findById(driver.user);
        const vehicleName = populated.serviceType === ServiceType.CAB ? "cab" : populated.serviceType === ServiceType.BIKE ? "bike" : populated.serviceType === ServiceType.AUTO ? "auto" : "delivery rider";
        const pinText = populated.deliveryOtp ? `. Share PIN ${populated.deliveryOtp} to start your ride safely` : "";
        
        await NotificationService.getInstance().sendNotification({
          userId: populated.user._id.toString(),
          title: "Driver Assigned 🚖",
          body: `${driverUser?.name || "A driver"} has accepted your request. Your ${vehicleName} is arriving${pinText}.`,
          type: "transactional",
          category: "order_status",
          data: {
            orderId: populated._id,
            status: OrderStatus.DRIVER_ASSIGNED,
            serviceType: populated.serviceType,
          }
        });
      } catch (err) {
        console.error("[orders.service] Error sending driver assignment notification:", err);
      }
    }

    return populated || savedOrder || order;
  }

  async triggerOrderSOS(orderId: string, userId: string): Promise<boolean> {
    const order = await Order.findById(orderId)
      .populate("user")
      .populate({
        path: "driver",
        populate: { path: "user" }
      });
      
    if (!order) throw new Error("Order not found");

    const passengerUser = order.user as any;
    const driverObj = order.driver as any;
    const driverUser = driverObj?.user as any;

    // Check permissions: either passenger or driver must be triggering this
    if (passengerUser?._id.toString() !== userId && driverUser?._id.toString() !== userId) {
      throw new Error("Unauthorized to trigger SOS for this order");
    }

    const passengerName = passengerUser?.name || "Passenger";
    const driverName = driverUser?.name || "Unassigned";

    // 1. Generate unique ticketId for SupportTicket
    const ticketId = `SOS-${orderId}-${Date.now().toString().slice(-4)}`;

    const supportTicket = new SupportTicket({
      ticketId,
      title: `EMERGENCY SOS: Order ${orderId}`,
      category: "EMERGENCY SOS",
      status: "OPEN",
      message: `SOS emergency triggered by ${userId === passengerUser?._id.toString() ? 'Passenger' : 'Driver'}. Order: ${orderId}. Driver: ${driverName}. Customer: ${passengerName}.`,
      user: passengerName,
      time: "Just now",
      messages: [
        {
          sender: "system",
          time: new Date().toISOString(),
          text: `🚨 SOS Triggered by user. Emergency details shared with admins. GPS Coordinates: ${order.stops[0]?.location?.coordinates?.join(', ') || 'N/A'}`
        }
      ]
    });
    await supportTicket.save();

    // 2. Query all Admin users
    const admins = await User.find({ role: "ADMIN" });

    // 3. Dispatch Push & In-app alerts to all admins
    const notificationService = NotificationService.getInstance();
    for (const admin of admins) {
      try {
        await notificationService.sendNotification({
          userId: admin._id.toString(),
          title: "🚨 EMERGENCY SOS ALERT 🚨",
          body: `${passengerName} has triggered an SOS emergency on ride ${orderId}. Driver: ${driverName}.`,
          type: "alert",
          category: "system",
          data: {
            orderId,
            ticketId,
            type: "sos",
            passengerName,
            driverName,
          }
        });
      } catch (err) {
        console.error(`[orders.service] SOS notification failed for admin ${admin._id}:`, err);
      }
    }

    // 4. Also notify driver if passenger triggers, or passenger if driver triggers
    const receiverUserId = userId === passengerUser?._id.toString() ? driverUser?._id?.toString() : passengerUser?._id?.toString();
    if (receiverUserId) {
      try {
        await notificationService.sendNotification({
          userId: receiverUserId,
          title: "Emergency Alert Triggered 🚨",
          body: "SOS has been triggered for this trip. Emergency contacts and authorities are being notified.",
          type: "alert",
          category: "system",
          data: { orderId, type: "sos" }
        });
      } catch (err) {
        console.error(`[orders.service] SOS peer alert failed:`, err);
      }
    }

    return true;
  }
}
