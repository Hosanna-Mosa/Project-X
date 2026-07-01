import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "";

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private userId: string | null = null;
  private role: string | null = null;
  private orderId: string | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect() {
    if (this.socket) return;

    let token = "";
    try {
      const store = require("../store/driverStore");
      token = store.useDriverStore.getState().token || "";
    } catch (e) {
      console.warn("[SocketService] Failed to load token from driverStore:", e);
    }

    console.log(`[Driver Socket] Connecting to ${SOCKET_URL || "not configured"}/ws/v1/socket.io`);

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      path: "/ws/v1/socket.io",
      auth: token ? { token } : undefined,
    });

    this.socket.on("connect", () => {
      console.log("Connected to Real-time Hub (Driver)");
      if (this.userId && this.role) {
        this.socket?.emit("join", { userId: this.userId, role: this.role });
      }
      if (this.orderId) {
        this.socket?.emit("track_order", this.orderId);
      }
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from Real-time Hub (Driver)");
    });
  }

  public join(userId: string, role: string = "DRIVER") {
    this.userId = userId;
    this.role = role;
    if (!this.socket) {
      this.connect();
    } else {
      this.socket.emit("join", { userId, role });
    }
  }

  public trackOrder(orderId: string) {
    this.orderId = orderId;
    if (!this.socket) {
      this.connect();
    } else {
      this.socket.emit("track_order", orderId);
    }
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  public emit(event: string, data: any) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, data);
  }

  public off(event: string, callback: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.userId = null;
    this.role = null;
    this.orderId = null;
  }
}

export const socketService = SocketService.getInstance();
