import { Server, Socket } from "socket.io";
import { createClient } from "redis";
import http from "http";

export class SocketManager {
  private static instance: SocketManager;
  private io: Server;
  private redisClient: any;

  private constructor(server: http.Server) {
    this.io = new Server(server, {
      cors: { origin: "*" },
    });

    this.setupRedis();
    this.initializeHandlers();
  }

  public static getInstance(server?: http.Server): SocketManager {
    if (!SocketManager.instance && server) {
      SocketManager.instance = new SocketManager(server);
    }
    return SocketManager.instance;
  }

  private async setupRedis() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.redisClient.on("error", (err: any) => console.log("Redis Client Error (Socket manager)", err.message));
    
    try {
      await this.redisClient.connect();
      console.log("Redis connected for socket tracking");
    } catch (err) {
      console.warn("⚠️  Redis server not found. Socket tracking (location updates) will be disabled. App will continue to run.");
      this.redisClient = null; // Mark as null so handlers can check
    }
  }

  private initializeHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Authenticated joining
      socket.on("join", (data: { userId: string; role: string }) => {
        socket.join(data.userId);
        if (data.role === "DRIVER") {
          socket.join("drivers");
        }
        console.log(`${data.role} ${data.userId} joined their rooms`);
      });

      // DRIVER LOCATION UPDATE: Store in Redis & Emit to User
      socket.on("driver_location_update", async (data: { driverId: string; orderId?: string; lat: number; lng: number }) => {
        console.log(`[SOCKET] Driver Location Update received: ID=${data.driverId}, OrderID=${data.orderId || "none"}, Lat=${data.lat}, Lng=${data.lng}`);
        
        if (this.redisClient) {
          const key = `driver_loc:${data.driverId}`;
          await this.redisClient.set(key, JSON.stringify({ lat: data.lat, lng: data.lng }), {
            EX: 30, // Expiry 30 seconds
          });
        }

        if (data.orderId) {
          console.log(`[SOCKET] Forwarding update to room: ${data.orderId}`);
          // Emit to user tracking the order
          this.io.to(data.orderId).emit("driver_location_update", {
            driverId: data.driverId,
            lat: data.lat,
            lng: data.lng,
          });
        }
      });

      // Join order room for tracking
      socket.on("track_order", (orderId: string) => {
        socket.join(orderId);
      });

      // DRIVER ORDER ACCEPTANCE: Forward driver info to the customer
      socket.on("driver_accepted_order", (data: { orderId: string; driverInfo: any }) => {
        console.log(`[SOCKET] Driver accepted order: ${data.orderId}`, data.driverInfo);
        if (data.orderId) {
          // Emit 'order_accepted' to the customer in the order room
          this.io.to(data.orderId).emit("order_accepted", {
            orderId: data.orderId,
            driver: data.driverInfo,
          });
        }
      });

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  // Public methods to emit events from services
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(userId).emit(event, data);
  }

  public emitToDriver(driverId: string, event: string, data: any) {
    this.io.to(driverId).emit(event, data);
  }

  public broadcastToDrivers(event: string, data: any) {
    console.log(`Broadcasting ${event} to all drivers`);
    this.io.to("drivers").emit(event, data);
  }

  public emitToOrderRoom(orderId: string, event: string, data: any) {
    this.io.to(orderId).emit(event, data);
  }
}
