import { DriverService } from "../drivers/drivers.service";
import { Order, OrderStatus } from "../../database/entities/Order";
import { AppDataSource } from "../../database/data-source";
import { SocketManager } from "../../sockets/socket.manager";

const orderRepository = AppDataSource.getRepository(Order);

export class DeliveryService {
  private driverService = new DriverService();

  async findAndAssignDriver(orderId: string, lat: number, lng: number) {
    const nearbyDrivers = await this.driverService.getNearbyDrivers(lat, lng);

    if (nearbyDrivers.length === 0) {
      console.log(`No drivers found for order ${orderId}`);
      // Retry logic or status update to NO_DRIVERS_FOUND
      return;
    }

    const socketManager = SocketManager.getInstance();

    // Strategy: Broadcast to individual drivers or send to the first one?
    // User requested matching nearest drivers.
    
    // We'll iterate through nearby drivers and find the first one who accepts
    // For this mock logic, we'll try top 3
    for (const driver of nearbyDrivers.slice(0, 3)) {
      console.log(`Sending order request to driver ${driver.id}`);
      
      socketManager.emitToUser(driver.user.id, "new_order_request", {
        orderId,
        message: "New delivery request nearby!",
      });
      
      // Usually, wait for acceptance (e.g., via socket event/ACK or timeout)
      // For this system, we'll assume the driver will call acceptOrder API
    }
  }

  async acceptOrder(orderId: string, driverId: string) {
    const order = await orderRepository.findOne({ 
      where: { id: orderId }, 
      relations: ["user"] 
    });

    if (!order) throw new Error("Order not found");
    if (order.status !== OrderStatus.SEARCHING_DRIVER) {
      throw new Error("Order is already assigned or inactive");
    }

    const driver = await AppDataSource.getRepository("drivers").findOne({
      where: { id: driverId },
      relations: ["user"]
    });

    if (!driver) throw new Error("Driver not found");

    order.driver = driver as any;
    order.status = OrderStatus.DRIVER_ASSIGNED;
    await orderRepository.save(order);

    const socketManager = SocketManager.getInstance();
    
    // Notify User
    socketManager.emitToUser(order.user.id, "driver_assigned", {
      orderId,
      driverName: driver.user.name,
      driverPhone: driver.user.phone,
    });

    // Notify all listeners in the order room (Customer tracking screen)
    socketManager.emitToOrderRoom(orderId, "order_accepted", {
      orderId,
      driver: {
        id: driver.id,
        name: driver.user.name,
        phone: driver.user.phone,
        rating: 4.9, // Mock rating or fetch from driver entity
      }
    });

    // Join order room for driver
    socketManager.emitToUser(driver.user.id, "order_assigned", {
      orderId,
      message: "Delivery assigned successfully"
    });

    return order;
  }
}
