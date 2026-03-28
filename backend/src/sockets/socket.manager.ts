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
      url: `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`,
    });

    this.redisClient.on("error", (err: any) => console.log("Redis Client Error", err));
    await this.redisClient.connect();
    console.log("Redis connected for socket tracking");
  }

  private initializeHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Authenticated joining
      socket.on("join", (data: { userId: string; role: string }) => {
        socket.join(data.userId);
        console.log(`${data.role} ${data.userId} joined their room`);
      });

      // DRIVER LOCATION UPDATE: Store in Redis & Emit to User
      socket.on("driver_location_update", async (data: { driverId: string; orderId?: string; lat: number; lng: number }) => {
        const key = `driver_loc:${data.driverId}`;
        await this.redisClient.set(key, JSON.stringify({ lat: data.lat, lng: data.lng }), {
          EX: 30, // Expiry 30 seconds
        });

        if (data.orderId) {
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

  public emitToOrderRoom(orderId: string, event: string, data: any) {
    this.io.to(orderId).emit(event, data);
  }
}
