import Order, { OrderStatus, StopType } from "../../database/models/Order";
import User from "../../database/models/User";
import { RoutingService } from "../routing/routing.service";
import { PricingService } from "../pricing/pricing.service";
import { SocketManager } from "../../sockets/socket.manager";

export class OrdersService {
  private routingService = new RoutingService();
  private pricingService = new PricingService();

  async createOrder(userId: string, stopsData: any[]) {
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
      }))
    );

    if (!optimizationResult) throw new Error("Could not optimize route");

    const totalPrice = this.pricingService.calculatePrice(
      optimizationResult.totalDistance, 
      optimizationResult.optimizedStops.length
    );

    const orderStops = optimizationResult.optimizedStops.map((stop: any, index: number) => ({
      sequence: index + 1,
      location: {
        type: "Point",
        coordinates: [stop.longitude, stop.latitude],
      },
      address: stop.address,
      type: stop.type || StopType.PICKUP,
      items: stop.items || [],
    }));

    const order = new Order({
      user: userId,
      totalDistance: optimizationResult.totalDistance,
      totalPrice,
      status: OrderStatus.SEARCHING_DRIVER,
      stops: orderStops,
    });

    const savedOrder = await order.save();

    const result = {
      ...savedOrder.toObject(),
      estimatedTime: optimizationResult.estimatedTime,
      polyline: optimizationResult.polyline,
    };

    // BROADCAST to drivers
    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      socketManager.broadcastToDrivers("new_order", {
        id: savedOrder._id,
        distance: `${optimizationResult.totalDistance} km`,
        duration: `${optimizationResult.estimatedTime} min`,
        earnings: Math.round(savedOrder.totalPrice * 0.8), // 80% to driver
        customerName: user.name || "Customer",
        customerPhone: user.phone || "N/A",
        status: "pending",
        timestamp: new Date(),
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

    return result;
  }

  async getOrderById(orderId: string) {
    return Order.findById(orderId).populate("user").populate("driver");
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    
    order.status = status;
    return order.save();
  }
}
