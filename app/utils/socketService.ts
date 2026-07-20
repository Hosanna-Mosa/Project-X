import { io, Socket } from "socket.io-client";
import Constants from "expo-constants";

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || "";
// Extract the base URL to prevent Socket.io from using the API path as a namespace
const BASE_SOCKET_URL = SOCKET_URL.split("/api")[0] || SOCKET_URL;

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private trackedOrderId: string | null = null;

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
      const store = require("../contexts/authStore");
      token = store.useAuthStore.getState().token || "";
    } catch (e) {
      console.warn("[SocketService] Failed to load token from authStore:", e);
    }

    this.socket = io(BASE_SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      path: "/ws/v1/socket.io",
      auth: token ? { token } : undefined,
    });

    this.socket.on("connect", () => {
      console.log("Connected to Real-time Hub (Customer)");
      if (this.trackedOrderId) {
        this.socket?.emit("track_order", this.trackedOrderId);
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error(`[Customer Socket] Connection failed: ${error.message}`);
    });
  }

  public trackOrder(orderId: string) {
    this.trackedOrderId = orderId;
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

  public off(event: string, callback: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  public emit(event: string, data: any) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, data);
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.trackedOrderId = null;
  }
}

export const socketService = SocketService.getInstance();
