import { Server, Socket } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { UserRole } from "../database/models/User";
import Order from "../database/models/Order";
import Driver, { DriverStatus } from "../database/models/Driver";
import ChatMessage from "../database/models/ChatMessage";

export class SocketManager {
  private static instance: SocketManager;
  private io: Server;
  private redisClient: any;
  private connectedUsers = new Map<string, Map<string, string>>();

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

  public getIo(): Server {
    return this.io;
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

  private rememberSocket(userId: string, socketId: string, role: string) {
    const sockets = this.connectedUsers.get(userId) || new Map<string, string>();
    sockets.set(socketId, role);
    this.connectedUsers.set(userId, sockets);
  }

  private forgetSocket(userId: string, socketId: string) {
    const sockets = this.connectedUsers.get(userId);
    if (!sockets) return;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  private getUserSocketStatus(userId: string) {
    const sockets = this.connectedUsers.get(userId);
    return {
      online: Boolean(sockets?.size),
      socketIds: sockets ? Array.from(sockets.keys()) : [],
      roles: sockets ? Array.from(new Set(sockets.values())) : [],
      personalRoomSize: this.getRoomSize(userId),
    };
  }

  private getDriverRoomStatus() {
    const socketIds = Array.from(this.io.sockets.adapter.rooms.get("drivers") || []);
    return {
      onlineDrivers: socketIds.length,
      socketIds,
    };
  }

  public logConnectionStatus(label: string, userId?: string, driverUserId?: string, orderId?: string) {
    const userStatus = userId ? this.getUserSocketStatus(userId) : null;
    const driverStatus = driverUserId ? this.getUserSocketStatus(driverUserId) : null;
    const orderRoomSize = orderId ? this.getRoomSize(orderId) : null;
    const driverRoomStatus = this.getDriverRoomStatus();

    console.log(
      `[SOCKET][STATUS][${label}] ` +
      `user=${userId || "n/a"} userOnline=${userStatus?.online ?? "n/a"} userSockets=${userStatus?.socketIds.join(",") || "none"} ` +
      `driver=${driverUserId || "n/a"} driverOnline=${driverStatus?.online ?? "n/a"} driverSockets=${driverStatus?.socketIds.join(",") || "none"} ` +
      `order=${orderId || "n/a"} orderRoomSize=${orderRoomSize ?? "n/a"} ` +
      `driversRoomSize=${driverRoomStatus.onlineDrivers} driverRoomSockets=${driverRoomStatus.socketIds.join(",") || "none"}`
    );
  }

  private initializeHandlers() {
    this.io.on("connection", (socket: Socket) => {
      const authUser = socket.data.user;
      const userId = authUser?.userId;
      const role = authUser?.role || "UNKNOWN";
      if (userId) {
        this.rememberSocket(userId, socket.id, role);
      }

      console.log(
        `[SOCKET][CONNECT] source=client socket=${socket.id} user=${userId || "unknown"} role=${role} ` +
        `userOnline=${userId ? this.getUserSocketStatus(userId).online : false} ` +
        `userSocketCount=${userId ? this.getUserSocketStatus(userId).socketIds.length : 0}`
      );

      // Automatically join the user to their own personal room
      if (authUser?.userId) {
        socket.join(authUser.userId);
        console.log(
          `[SOCKET][ROOM][JOIN] source=auto-personal socket=${socket.id} user=${authUser.userId} ` +
          `role=${role} personalRoomSize=${this.getRoomSize(authUser.userId)}`
        );
        
        if (role === "ADMIN") {
          socket.join("support_tickets");
          console.log(`[SOCKET][ADMIN][JOIN] socket=${socket.id} joined support_tickets room`);
        }
      }

      // Authenticated joining for drivers and vendors
      socket.on("join", (data: { userId: string; role: string }) => {
        if (!authUser || authUser.userId !== data.userId) {
          console.warn(`[SOCKET SECURITY] User ${authUser?.userId} unauthorized to join user room ${data.userId}`);
          return;
        }

        socket.join(data.userId);
        console.log(
          `[SOCKET][ROOM][JOIN] source=client-join socket=${socket.id} user=${data.userId} ` +
          `requestedRole=${data.role} authRole=${authUser.role} personalRoomSize=${this.getRoomSize(data.userId)}`
        );

        if (data.role === "DRIVER" && authUser.role === "DRIVER") {
          socket.join("drivers");
          const driverRoomStatus = this.getDriverRoomStatus();
          console.log(
            `[SOCKET][DRIVER][ONLINE] source=join socket=${socket.id} driverUser=${data.userId} ` +
            `driversRoomSize=${driverRoomStatus.onlineDrivers} driverRoomSockets=${driverRoomStatus.socketIds.join(",") || "none"}`
          );
        }

        const isVendorRole = ["VENDOR", "meat_vendor", "restaurant_vendor", "ADMIN"].includes(authUser.role);
        if (data.role === "VENDOR" && isVendorRole) {
          socket.join("vendors");
          console.log(`[SOCKET][VENDOR][ONLINE] source=join socket=${socket.id} vendorUser=${data.userId} vendorsRoomSize=${this.getRoomSize("vendors")}`);
        }
      });

      // DRIVER LOCATION UPDATE: Store in Redis Geospatial & Emit to Order Room
      socket.on("driver_location_update", async (data: { driverId: string; orderId?: string; lat: number; lng: number; heading?: number }) => {
        if (!authUser || (authUser.role !== "DRIVER")) {
          console.warn(`[SOCKET SECURITY] Unauthorized driver location update from user ${authUser?.userId}`);
          return;
        }

        let driverDocId = data.driverId;
        try {
          let resolvedDriver = null;
          if (mongoose.Types.ObjectId.isValid(data.driverId)) {
            resolvedDriver = await Driver.findById(data.driverId);
          }
          if (!resolvedDriver && authUser?.userId) {
            resolvedDriver = await Driver.findOne({ user: authUser.userId });
          }
          if (!resolvedDriver && data.driverId) {
            const userDoc = await User.findOne({ phone: data.driverId });
            if (userDoc) {
              resolvedDriver = await Driver.findOne({ user: userDoc._id });
            }
          }
          
          if (resolvedDriver) {
            driverDocId = resolvedDriver._id.toString();
            resolvedDriver.currentLocation = {
              type: "Point",
              coordinates: [Number(data.lng), Number(data.lat)]
            };
            resolvedDriver.status = DriverStatus.ONLINE;
            resolvedDriver.isAvailable = true; // Set available on active tracking update
            try {
              // Same fix as drivers.service.ts's updateLocation: re-resolve
              // on every update instead of only the first time, so a driver
              // who has actually moved to a different zone gets rematched
              // instead of staying permanently pinned to wherever they first
              // pinged from.
              const { ZonesService } = require("../modules/zones/zones.service");
              const zonesService = new ZonesService();
              const activeZone = await zonesService.getZoneForCoordinates(Number(data.lat), Number(data.lng));
              if (activeZone && (!resolvedDriver.preferredZone || resolvedDriver.preferredZone.toString() !== activeZone._id.toString())) {
                resolvedDriver.preferredZone = activeZone._id;
              }
            } catch (zoneErr) {
              console.warn("[SOCKET ZONE UPDATE] Error resolving zone for driver:", zoneErr);
            }
            await resolvedDriver.save();
          }
        } catch (e: any) {
          console.error("[SOCKET] Failed to resolve and update driver in MongoDB:", e.message);
        }

        console.log(`[SOCKET] Driver Location Update: ID=${data.driverId} (resolved=${driverDocId}), OrderID=${data.orderId || "none"}, Lat=${data.lat}, Lng=${data.lng}`);
        console.log(
          `[SOCKET][DRIVER][LOCATION] source=driver_location_update socket=${socket.id} ` +
          `driverUser=${data.driverId} order=${data.orderId || "none"} lat=${data.lat} lng=${data.lng} ` +
          `driverOnline=${this.getUserSocketStatus(data.driverId).online}`
        );
        
        if (this.redisClient && this.redisClient.isReady) {
          try {
            await this.redisClient.geoAdd("drivers:locations", {
              longitude: Number(data.lng),
              latitude: Number(data.lat),
              member: driverDocId
            });
            await this.redisClient.set(`driver_status:${driverDocId}`, "online", {
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
            heading: data.heading || 0,
          });
          console.log(
            `[SOCKET][EMIT] source=driver_location_update target=order_room event=driver_location_update ` +
            `order=${data.orderId} recipients=${this.getRoomSize(data.orderId)} driverUser=${data.driverId}`
          );
        }
      });

      // Join order room for tracking - Security: verify user belongs to the order
      socket.on("track_order", async (orderId: string) => {
        if (!authUser) return;

        try {
          const query = mongoose.Types.ObjectId.isValid(orderId) 
            ? { $or: [{ _id: orderId }, { _id: new mongoose.Types.ObjectId(orderId) }] }
            : { _id: orderId };
          const order = await Order.findOne(query as any);
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
          this.logConnectionStatus("track_order", order.user.toString(), driverUserId || undefined, orderId);
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
          console.log(
            `[SOCKET][EMIT] source=driver_accepted_order target=order_room event=order_accepted ` +
            `order=${data.orderId} recipients=${this.getRoomSize(data.orderId)} driverUser=${authUser.userId}`
          );
        }
      });

      // ORDER STATUS UPDATE: Broadcast to all in the order room
      socket.on("order_status_update", (data: { orderId: string; status: string }) => {
        if (data.orderId) {
          this.io.to(data.orderId).emit("order_status_update", data);
          console.log(
            `[SOCKET][EMIT] source=order_status_update target=order_room event=order_status_update ` +
            `order=${data.orderId} status=${data.status} recipients=${this.getRoomSize(data.orderId)} fromUser=${authUser?.userId || "unknown"}`
          );
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

      // HELPER TASK EVENTS
      socket.on("assign_task_confirmed", (data: { orderId: string }) => {
        if (!data.orderId) return;
        socket.to(data.orderId).emit("assign_task_confirmed", data);
      });

      socket.on("task_started", (data: { orderId: string }) => {
        if (!data.orderId) return;
        socket.to(data.orderId).emit("task_started", data);
      });

      socket.on("helper_status_update", (data: { orderId: string, text: string }) => {
        if (!data.orderId) return;
        socket.to(data.orderId).emit("helper_status_update", data);
      });

      // CHAT MESSAGES: Forward messages within the order room
      socket.on("send_message", async (data: { orderId: string; senderId: string; role: string; text: string; id?: string }) => {
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

        // Save to DB
        try {
          let realSenderId = authUser?.userId;
          
          if (!realSenderId || !mongoose.Types.ObjectId.isValid(realSenderId)) {
            if (data.senderId && mongoose.Types.ObjectId.isValid(data.senderId)) {
              realSenderId = data.senderId;
            } else {
              const query = mongoose.Types.ObjectId.isValid(data.orderId) 
                ? { $or: [{ _id: data.orderId }, { _id: new mongoose.Types.ObjectId(data.orderId) }] }
                : { _id: data.orderId };
              const orderDoc = await Order.findOne(query as any);
              if (orderDoc) {
                if (from === "driver") {
                  if (orderDoc.driver) {
                    const drv = await Driver.findById(orderDoc.driver);
                    if (drv) realSenderId = drv.user.toString();
                  }
                } else {
                  realSenderId = orderDoc.user.toString();
                }
              }
            }
          }

          if (realSenderId && mongoose.Types.ObjectId.isValid(realSenderId)) {
            const chatMsg = new ChatMessage({
              orderId: data.orderId,
              senderId: realSenderId,
              role: from,
              text: data.text,
              time: payload.time
            });
            await chatMsg.save();
          } else {
            console.warn(`[CHAT] Could not resolve a valid senderId for message orderId=${data.orderId}`);
          }
        } catch (error) {
          console.error("Error saving chat message to database:", error);
        }

        this.io.to(data.orderId).emit("receive_message", payload);
        console.log(`[CHAT][EMIT] order=${data.orderId} from=${from} id=${payload.id} recipients=${this.getRoomSize(data.orderId)}`);

        // Push-notify the other party so an out-of-app message isn't missed (fire-and-forget).
        (async () => {
          try {
            const orderDoc = await Order.findOne(mongoose.Types.ObjectId.isValid(data.orderId) ? { _id: data.orderId } : { _id: null });
            if (!orderDoc) return;

            let recipientUserId: string | undefined;
            let recipientDeepLink: { screen: string; params?: Record<string, string> };
            if (from === "driver") {
              recipientUserId = orderDoc.user?.toString();
              recipientDeepLink = { screen: "/chat", params: { orderId: data.orderId } };
            } else {
              if (orderDoc.driver) {
                const drv = await Driver.findById(orderDoc.driver);
                recipientUserId = drv?.user?.toString();
              }
              recipientDeepLink = { screen: "/chat", params: { orderId: data.orderId } };
            }

            // Don't notify the sender, and skip if we couldn't resolve a recipient.
            if (!recipientUserId || recipientUserId === authUser?.userId) return;

            const { NotificationService } = require("../services/notification.service");
            await NotificationService.getInstance().sendNotification({
              userId: recipientUserId,
              title: "New message 💬",
              body: data.text?.length > 120 ? `${data.text.slice(0, 117)}...` : data.text,
              type: "transactional",
              category: "chat",
              data: { orderId: data.orderId, deepLink: recipientDeepLink },
            });
          } catch (err) {
            console.error("[CHAT] Failed to send chat push notification:", err);
          }
        })();
      });

      socket.on("disconnect", async () => {
        if (userId) {
          this.forgetSocket(userId, socket.id);
        }

        const userStatus = userId ? this.getUserSocketStatus(userId) : null;
        const isDriver = role === "DRIVER";

        console.log(
          `[SOCKET][DISCONNECT] source=client socket=${socket.id} user=${userId || "unknown"} role=${role} ` +
          `userStillOnline=${userStatus?.online ?? false} ` +
          `remainingUserSockets=${userStatus?.socketIds.length ?? 0} ` +
          `driversRoomSize=${this.getDriverRoomStatus().onlineDrivers}`
        );

        // Note: Mobile socket disconnects when app is backgrounded or minimized.
        // Driver status is explicitly toggled by driver via API (goOffline) or admin control.
        // We log disconnects for tracking without forcibly changing driver.status in DB/Redis.
        if (isDriver && userId) {
          console.log(`🔌 [SOCKET][DRIVER][DISCONNECT] Driver user ${userId} socket disconnected. Keeping online status in DB/Redis.`);
        }
      });
    });
  }

  // Public methods to emit events from services
  public emitToUser(userId: string, event: string, data: any, source = "service") {
    const status = this.getUserSocketStatus(userId);
    console.log(
      `[SOCKET][EMIT] source=${source} target=user event=${event} user=${userId} ` +
      `online=${status.online} recipients=${status.personalRoomSize} socketIds=${status.socketIds.join(",") || "none"} roles=${status.roles.join(",") || "none"}`
    );
    this.io.to(userId).emit(event, data);
  }

  public emitToDriver(driverId: string, event: string, data: any, source = "service") {
    const status = this.getUserSocketStatus(driverId);
    console.log(
      `[SOCKET][EMIT] source=${source} target=driver event=${event} driverUser=${driverId} ` +
      `online=${status.online} recipients=${status.personalRoomSize} socketIds=${status.socketIds.join(",") || "none"} roles=${status.roles.join(",") || "none"}`
    );
    this.io.to(driverId).emit(event, data);
  }

  public broadcastToDrivers(event: string, data: any, source = "service") {
    const driverRoomStatus = this.getDriverRoomStatus();
    console.log(
      `[SOCKET][BROADCAST] source=${source} target=drivers event=${event} ` +
      `onlineDrivers=${driverRoomStatus.onlineDrivers} socketIds=${driverRoomStatus.socketIds.join(",") || "none"}`
    );
    this.io.to("drivers").emit(event, data);
  }

  public emitToOrderRoom(orderId: string, event: string, data: any, source = "service") {
    console.log(
      `[SOCKET][EMIT] source=${source} target=order_room event=${event} ` +
      `order=${orderId} recipients=${this.getRoomSize(orderId)}`
    );
    this.io.to(orderId).emit(event, data);
  }
}

