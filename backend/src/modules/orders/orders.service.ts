import { AppDataSource } from "../../database/data-source";
import { Order, OrderStatus } from "../../database/entities/Order";
import { Stop, StopType } from "../../database/entities/Stop";
import { User } from "../../database/entities/User";
import { RoutingService } from "../routing/routing.service";
import { PricingService } from "../pricing/pricing.service";
import { SocketManager } from "../../sockets/socket.manager";

const orderRepository = AppDataSource.getRepository(Order);
const stopRepository = AppDataSource.getRepository(Stop);
const userRepository = AppDataSource.getRepository(User);

export class OrdersService {
  private routingService = new RoutingService();
  private pricingService = new PricingService();

  async createOrder(userId: string, stops: any[]) {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // Basic coordinate for optimization: user's default location if available, else first stop
    // For now, let's assume the starting point is user's current location (to be passed)
    // For this simulation, we'll use first stop as start point or pass it in body
    
    // Simple start point (let's assume first pickup)
    const startPos = { 
      latitude: stops[0].latitude || stops[0].lat, 
      longitude: stops[0].longitude || stops[0].lng 
    };

    const optimizationResult = await this.routingService.optimizeAndGetRoute(
      startPos, 
      stops.map(s => ({
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

    const order = orderRepository.create({
      user,
      totalDistance: optimizationResult.totalDistance,
      totalPrice,
      status: OrderStatus.SEARCHING_DRIVER,
    });

    const savedOrder = await orderRepository.save(order);

    const stopEntities = optimizationResult.optimizedStops.map((stop: any, index: number) => {
      return stopRepository.create({
        order: savedOrder,
        sequence: index + 1,
        latitude: stop.latitude,
        longitude: stop.longitude,
        address: stop.address,
        type: stop.type || StopType.PICKUP,
        items: stop.items || [],
      });
    });

    await stopRepository.save(stopEntities);

    const result = {
      ...savedOrder,
      stops: stopEntities,
      estimatedTime: optimizationResult.estimatedTime,
      polyline: optimizationResult.polyline,
    };

    // BROADCAST to drivers
    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      socketManager.broadcastToDrivers("new_order", {
        id: savedOrder.id,
        distance: `${optimizationResult.totalDistance} km`,
        duration: `${optimizationResult.estimatedTime} min`,
        earnings: Math.round(savedOrder.totalPrice * 0.8), // 80% to driver
        customerName: user.name || "Customer",
        customerPhone: user.phone || "N/A",
        status: "pending",
        timestamp: new Date(),
        stops: stopEntities.map(s => ({
          id: s.id,
          type: s.type.toLowerCase(),
          locationName: s.address.split(',')[0],
          address: s.address,
          lat: s.latitude,
          lng: s.longitude,
          items: s.items,
        }))
      });
    }

    return result;
  }

  async getOrderById(orderId: string) {
    return orderRepository.findOne({
      where: { id: orderId },
      relations: ["user", "driver", "stops"],
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    
    order.status = status;
    return orderRepository.save(order);
  }
}
