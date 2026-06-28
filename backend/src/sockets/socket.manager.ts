import { Server, Socket } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import jwt from "jsonwebtoken";
import { UserRole } from "../database/models/User";
import Order from "../database/models/Order";
import Driver from "../database/models/Driver";

export class SocketManager {
  private static instance: SocketManager;
  private io: Server;
  private redisClient: any;

  private constructor(server: http.Server) {
    this.io = new Server(server, {
      cors: { origin: "*" },
      path: "/ws/v1/socket.io",
    });

    this.setupRedis();
    this.setupAuthentication();
    this.initializeHandlers();
  }

  public static getInstance(server?: http.Server): SocketManager {
    if (!SocketManager.instance && server) {
      SocketManager.instance = new SocketManager(server);
    }
    return SocketManager.instance;
  }

  private async setupRedis() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    // Primary redisClient for location tracking
    this.redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    this.redisClient.on("error", (err: any) => {
      if (this.redisClient) {
        console.log("Redis Client Error:", err.message);
      }
    });
    
    try {
      await this.redisClient.connect();
      console.log("Redis connected for socket tracking");

      // Setup Redis Pub/Sub Adapter for Socket.io Horizontal Clustering
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.io.adapter(createAdapter(pubClient, subClient));
      console.log("Redis Socket Adapter initialized successfully");
    } catch (err: any) {
      console.warn("⚠️  Redis server not found or connection failed. Socket tracking (location updates) and clustering will be disabled.");
      this.redisClient = null; 
    }
  }

  private setupAuthentication() {
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers["authorization"]?.split(" ")[1];
      if (!token) {
        console.warn(`[SOCKET SECURITY] Handshake rejected: No token provided (Socket ID: ${socket.id})`);
        return next(new Error("Authentication error: No token provided"));
      }

      jwt.verify(token, process.env.JWT_SECRET || "supersecret123", (err: any, decoded: any) => {
        if (err) {
          console.warn(`[SOCKET SECURITY] Handshake rejected: Invalid token (Socket ID: ${socket.id})`);
          return next(new Error("Authentication error: Invalid token"));
        }
        
        // Normalize userId from id parameter if needed
        if (decoded && decoded.id && !decoded.userId) {
          decoded.userId = decoded.id;
        }
        
        socket.data.user = decoded;
        next();
      });
    });
  }

  private getRoomSize(roomId: string) {
    return this.io.sockets.adapter.rooms.get(roomId)?.size || 0;
  }

  private initializeHandlers() {
    this.io.on("connection", (socket: Socket) => {
      const authUser = socket.data.user;
      console.log(`[SOCKET][CONNECT] socket=${socket.id} user=${authUser?.userId} role=${authUser?.role}`);

      // Automatically join the user to their own personal room
      if (authUser?.userId) {
        socket.join(authUser.userId);
      }

      // Authenticated joining for drivers and vendors
      socket.on("join", (data: { userId: string; role: string }) => {
        if (!authUser || authUser.userId !== data.userId) {
          console.warn(`[SOCKET SECURITY] User ${authUser?.userId} unauthorized to join user room ${data.userId}`);
          return;
        }

        socket.join(data.userId);

        if (data.role === "DRIVER" && authUser.role === "DRIVER") {
          socket.join("drivers");
          console.log(`Driver ${data.userId} joined drivers room`);
        }

        const isVendorRole = ["VENDOR", "meat_vendor", "restaurant_vendor", "ADMIN"].includes(authUser.role);
        if (data.role === "VENDOR" && isVendorRole) {
          socket.join("vendors");
          console.log(`Vendor ${data.userId} joined vendors room`);
        }
      });

      // DRIVER LOCATION UPDATE: Store in Redis Geospatial & Emit to Order Room
      socket.on("driver_location_update", async (data: { driverId: string; orderId?: string; lat: number; lng: number }) => {
        if (!authUser || (authUser.userId !== data.driverId && authUser.role !== "DRIVER")) {
          console.warn(`[SOCKET SECURITY] Unauthorized driver location update from user ${authUser?.userId}`);
          return;
        }

        console.log(`[SOCKET] Driver Location Update: ID=${data.driverId}, OrderID=${data.orderId || "none"}, Lat=${data.lat}, Lng=${data.lng}`);
        
        if (this.redisClient) {
          try {
            await this.redisClient.geoAdd("drivers:locations", {
              longitude: Number(data.lng),
              latitude: Number(data.lat),
              member: data.driverId
            });
            await this.redisClient.set(`driver_status:${data.driverId}`, "online", {
              EX: 30, // Status expiry 30 seconds
            });
          } catch (err: any) {
            console.error(`[REDIS] Geospatial write failed:`, err.message);
          }
        }

        if (data.orderId) {
          // Emit to user tracking the order
          this.io.to(data.orderId).emit("driver_location_update", {
            driverId: data.driverId,
            lat: data.lat,
            lng: data.lng,
          });
        }
      });

      // Join order room for tracking - Security: verify user belongs to the order
      socket.on("track_order", async (orderId: string) => {
        if (!authUser) return;

        try {
          const order = await Order.findOne({ _id: orderId });
          if (!order) {
            console.warn(`[SOCKET] Order ${orderId} not found for tracking`);
            return;
          }

          let driverUserId: string | null = null;
          if (order.driver) {
            const driver = await Driver.findById(order.driver).select("user");
            driverUserId = driver?.user?.toString() || null;
          }

          const isAuthorized = 
            order.user.toString() === authUser.userId ||
            driverUserId === authUser.userId ||
            (order.vendor && order.vendor.toString() === authUser.userId) ||
            authUser.role === "ADMIN";

          if (!isAuthorized) {
            console.warn(
              `[SOCKET][TRACK][REJECTED] socket=${socket.id} user=${authUser.userId} role=${authUser.role} order=${orderId} ` +
              `orderUser=${order.user.toString()} orderDriver=${order.driver?.toString() || "none"} driverUser=${driverUserId || "none"}`
            );
            return;
          }

          socket.join(orderId);
          console.log(`[SOCKET][TRACK][JOINED] socket=${socket.id} user=${authUser.userId} role=${authUser.role} order=${orderId} roomSize=${this.getRoomSize(orderId)}`);
        } catch (error) {
          console.error(`[SOCKET] track_order error:`, error);
        }
      });

      // DRIVER ORDER ACCEPTANCE: Forward driver info to the customer
      socket.on("driver_accepted_order", (data: { orderId: string; driverInfo: any }) => {
        if (!authUser || authUser.role !== "DRIVER") return;
        
        console.log(`[SOCKET][ORDER_ACCEPTED] driverUser=${authUser.userId} order=${data.orderId}`, data.driverInfo);
        if (data.orderId) {
          socket.join(data.orderId);
          console.log(`[SOCKET][ORDER_ACCEPTED][JOINED] socket=${socket.id} order=${data.orderId} roomSize=${this.getRoomSize(data.orderId)}`);
          this.io.to(data.orderId).emit("order_accepted", {
            orderId: data.orderId,
            driver: data.driverInfo,
          });
        }
      });

      // ORDER STATUS UPDATE: Broadcast to all in the order room
      socket.on("order_status_update", (data: { orderId: string; status: string }) => {
        if (data.orderId) {
          this.io.to(data.orderId).emit("order_status_update", data);
        }
      });

      socket.on("scheduled_delivery_response", async (data: { requestId: string; customerId: string; vendorId: string; accepted: boolean; scheduledFor?: string }) => {
        if (!data.customerId || !data.requestId || !data.vendorId) return;
        try {
          const { OrdersService } = await import("../modules/orders/orders.service");
          const ordersService = new OrdersService();
          await ordersService.respondToScheduledDelivery(data.requestId, data.vendorId, data.accepted);
        } catch (error) {
          console.error("[SOCKET] scheduled_delivery_response failed:", error);
          this.io.to(data.customerId).emit(
            data.accepted ? "scheduled_delivery_accepted" : "scheduled_delivery_rejected",
            data,
          );
        }
      });

      // CHAT MESSAGES: Forward messages within the order room
      socket.on("send_message", (data: { orderId: string; senderId: string; role: string; text: string; id?: string }) => {
        if (!authUser) return;
        
        const from = data.role?.toLowerCase();
        const payload = {
          id: data.id || Date.now().toString(),
          text: data.text,
          from,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          senderId: data.senderId,
        };

        console.log(
          `[CHAT][SEND] socket=${socket.id} authUser=${authUser.userId} authRole=${authUser.role} ` +
          `order=${data.orderId || "missing"} senderId=${data.senderId} role=${data.role} roomSize=${data.orderId ? this.getRoomSize(data.orderId) : 0} text="${data.text}"`
        );

        if (!data.orderId) {
          console.warn(`[CHAT][DROP] Missing orderId for message id=${payload.id}`);
          return;
        }

        this.io.to(data.orderId).emit("receive_message", payload);
        console.log(`[CHAT][EMIT] order=${data.orderId} from=${from} id=${payload.id} recipients=${this.getRoomSize(data.orderId)}`);
      });

      socket.on("disconnect", () => {
        console.log(`[SOCKET][DISCONNECT] socket=${socket.id} user=${authUser?.userId} role=${authUser?.role}`);
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

