import { DriverService } from "../drivers/drivers.service";
import Order, { OrderStatus } from "../../database/models/Order";
import Driver from "../../database/models/Driver";
import { SocketManager } from "../../sockets/socket.manager";

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

    // We'll iterate through nearby drivers and find the first one who accepts
    // For this mock logic, we'll try top 3
    for (const driver of nearbyDrivers.slice(0, 3)) {
      console.log(`Sending order request to driver ${driver._id}`);
      
      socketManager.emitToUser((driver.user as any)._id.toString(), "new_order_request", {
        orderId,
        message: "New delivery request nearby!",
      });
      
      // Usually, wait for acceptance (e.g., via socket event/ACK or timeout)
      // For this system, we'll assume the driver will call acceptOrder API
    }
  }

  async acceptOrder(orderId: string, driverId: string) {
    const order = await Order.findById(orderId).populate("user");

    if (!order) throw new Error("Order not found");
    if (order.status !== OrderStatus.SEARCHING_DRIVER) {
      throw new Error("Order is already assigned or inactive");
    }

    const driver = await Driver.findById(driverId).populate("user");

    if (!driver) throw new Error("Driver not found");

    order.driver = driver._id as any;
    order.status = OrderStatus.DRIVER_ASSIGNED;
    await order.save();

    const socketManager = SocketManager.getInstance();
    
    // Notify User
    socketManager.emitToUser((order.user as any)._id.toString(), "driver_assigned", {
      orderId,
      driverName: (driver.user as any).name,
      driverPhone: (driver.user as any).phone,
    });

    // Notify all listeners in the order room (Customer tracking screen)
    socketManager.emitToOrderRoom(orderId, "order_accepted", {
      orderId,
      driver: {
        id: driver._id,
        name: (driver.user as any).name,
        phone: (driver.user as any).phone,
        rating: 4.9,
      }
    });

    // Join order room for driver
    socketManager.emitToUser((driver.user as any)._id.toString(), "order_assigned", {
      orderId,
      message: "Delivery assigned successfully"
    });

    return order;
  }
}
