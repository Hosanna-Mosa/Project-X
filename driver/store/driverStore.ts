import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import Constants from "expo-constants";
import { Alert } from "react-native";
import { router } from "expo-router";
import { socketService } from "../utils/socketService";

const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

export type StopType = "pickup" | "delivery" | "drop" | "stop";

export interface StopItem {
  name: string;
  quantity: number;
}

export interface Stop {
  id: string;
  type: StopType;
  locationName: string;
  address: string;
  lat: number;
  lng: number;
  items?: StopItem[];
  instructions?: string;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "driver_assigned"
  | "en_route_pickup"
  | "arrived_pickup"
  | "picking_items"
  | "picked_up"
  | "en_route_delivery"
  | "arrived_delivery"
  | "delivered"
  | "completed"
  | "CANCELLED";

export interface Order {
  id: string;
  distance: string;
  duration: string;
  earnings: number;
  stops: Stop[];
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  timestamp: Date;
  serviceType?: string;
  radius?: number;
  restaurantPickupCode?: string;
  deliveryOtp?: string;
  polyline?: string;
  vendorName?: string;
  vendorPhone?: string;
  isReserved?: boolean;
  reservedAt?: Date | string;
}

export interface CompletedOrder {
  id: string;
  earnings: number;
  distance: string;
  customerName: string;
  stops: number;
  completedAt: Date;
}

export interface ChatMessage {
  id: string;
  from: "driver" | "user";
  text: string;
  time: string;
}

export interface EarningsData {
  today: number;
  week: number;
  totalDeliveries: number;
  weeklyBreakdown: { day: string; amount: number }[];
}

interface DriverState {
  isOnline: boolean;
  homeMode: boolean;
  activeServices: ("food" | "ride")[];
  currentOrder: Order | null;
  incomingOrder: Order | null;
  currentStep: number;
  earnings: EarningsData;
  orderHistory: CompletedOrder[];
  driverLocation: { lat: number; lng: number } | null;
  driverName: string;
  driverPhone: string;
  driverUserId: string | null;
  token: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  identityVerified: boolean;
  activeChat: ChatMessage[];
  unreadCount: number;
  isChatActive: boolean;

  goOnline: (services: ("food" | "ride")[]) => Promise<void>;
  goOffline: () => Promise<void>;
  toggleHomeMode: () => void;
  acceptOrder: () => void;
  rejectOrder: (reason?: string) => void;
  updateStep: (step: number) => void;
  updateOrderStatus: (status: OrderStatus, otp?: string) => Promise<void>;
  completeOrder: () => void;
  setIncomingOrder: (order: Order | null) => void;
  updateDriverLocation: (lat: number, lng: number) => void;
  setAuthenticated: (name: string, phone: string, token: string, userId: string) => void;
  setOnboardingCompleted: () => void;
  setIdentityVerified: (verified: boolean) => void;
  resetOnboarding: () => void;
  logout: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  setIsChatActive: (active: boolean) => void;
  loginWithPassword: (phone: string, password: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  startReservedRide: (orderId: string) => Promise<void>;
  fetchEarnings: () => Promise<void>;
}

export const useMockIncomingOrder = (): Order => ({
  id: `ORD-${Date.now()}`,
  distance: "4.2 km",
  duration: "18 min",
  earnings: 85,
  customerName: "Rahul Sharma",
  customerPhone: "+91 98765 43210",
  status: "pending",
  timestamp: new Date(),
  stops: [
    {
      id: "stop-1",
      type: "pickup",
      locationName: "Swiggy Cloud Kitchen",
      address: "12, MG Road, Koramangala, Bangalore",
      lat: 12.935,
      lng: 77.614,
      items: [
        { name: "Butter Chicken", quantity: 2 },
        { name: "Garlic Naan", quantity: 4 },
      ],
      instructions: "Call on arrival",
    },
    {
      id: "stop-2",
      type: "pickup",
      locationName: "Zomato Partner - Fresh Bakes",
      address: "45, 80 Feet Road, Indiranagar, Bangalore",
      lat: 12.979,
      lng: 77.638,
      items: [
        { name: "Chocolate Cake", quantity: 1 },
        { name: "Cupcakes", quantity: 6 },
      ],
    },
    {
      id: "stop-3",
      type: "delivery",
      locationName: "Customer Location",
      address: "78, Brigade Road, Shivajinagar, Bangalore",
      lat: 12.972,
      lng: 77.598,
      instructions: "Leave at door",
    },
  ],
});

export const useDriverStore = create<DriverState>()(
  persist(
    (set, get) => ({
      isOnline: false,
      homeMode: false,
      activeServices: [],
      currentOrder: null,
      incomingOrder: null,
      currentStep: 0,
      driverLocation: null,
      driverName: "",
      driverPhone: "",
      driverUserId: null,
      token: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      identityVerified: false,
      activeChat: [],
      unreadCount: 0,
      isChatActive: false,
      earnings: {
        today: 0,
        week: 0,
        totalDeliveries: 0,
        weeklyBreakdown: [
          { day: "Mon", amount: 0 },
          { day: "Tue", amount: 0 },
          { day: "Wed", amount: 0 },
          { day: "Thu", amount: 0 },
          { day: "Fri", amount: 0 },
          { day: "Sat", amount: 0 },
          { day: "Sun", amount: 0 },
        ],
      },
      orderHistory: [],

      goOnline: async (services) => {
        set({ isOnline: true, activeServices: services });
        const { token, driverUserId } = get();
        if (token) {
          try {
            await fetch(`${apiUrl}/api/v1/drivers/status`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ status: "ONLINE" })
            });
          } catch (e) {
            console.error("Failed to set online status:", e);
          }
        }
        
        let finalDriverId = driverUserId;
        if (!finalDriverId && token) {
          try {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let buffer = "";
            const cleaned = base64.replace(/=+$/, "");
            for (let i = 0, len = cleaned.length; i < len; i += 4) {
              const chunk = (chars.indexOf(cleaned[i]) << 18) |
                            (chars.indexOf(cleaned[i + 1]) << 12) |
                            ((i + 2 < len ? chars.indexOf(cleaned[i + 2]) : 0) << 6) |
                            (i + 3 < len ? chars.indexOf(cleaned[i + 3]) : 0);
              buffer += String.fromCharCode((chunk >> 16) & 255);
              if (i + 2 < len) buffer += String.fromCharCode((chunk >> 8) & 255);
              if (i + 3 < len) buffer += String.fromCharCode(chunk & 255);
            }
            const decoded = JSON.parse(buffer);
            if (decoded && (decoded.userId || decoded.id)) {
              finalDriverId = decoded.userId || decoded.id;
              set({ driverUserId: finalDriverId }); // Self-heal store
            }
          } catch (e) {
            console.warn("Failed to decode token on goOnline:", e);
          }
        }

        // Connect to real-time order broadcasts regardless of token
        import("../utils/socketService").then(({ socketService }) => {
          socketService.connect();
          socketService.join(finalDriverId || "mock_driver_123", "DRIVER");
          socketService.on("new_order", (data: any) => {
            console.log("New order received:", data);
            
            const serviceType = data.serviceType?.toLowerCase();
            const activeServices = get().activeServices || [];

            const isRide = ["bike", "auto", "cab", "cab_prime"].includes(serviceType);
            const isFood = ["delivery", "helper"].includes(serviceType);

            const matchesActiveServices = 
              (isRide && activeServices.includes("ride")) ||
              (isFood && activeServices.includes("food"));

            if (matchesActiveServices) {
              get().setIncomingOrder(data as Order);
            } else {
              console.log(`Filtering out incoming order ${data.id || data._id} of type ${serviceType}. Active services:`, activeServices);
            }
          });
          socketService.on("order_cancelled", (data: any) => {
            console.log("Order cancelled received:", data);
            const orderId = data.orderId || data.id;
            if (!orderId) return;

            const incoming = get().incomingOrder;
            if (incoming && (incoming.id === orderId || incoming.id.toString() === orderId.toString())) {
              set({ incomingOrder: null });
              Alert.alert("Order Cancelled", "This incoming order was cancelled by the customer.");
            }

            const current = get().currentOrder;
            if (current && (current.id === orderId || current.id.toString() === orderId.toString())) {
              set({ currentOrder: null, currentStep: 0 });
              Alert.alert("Order Cancelled", "The active order has been cancelled by the customer.");
              router.push("/(tabs)");
            }
          });
          socketService.on("upcoming_reserved_ride", (data: any) => {
            console.log("Upcoming reserved ride alert received:", data);
            
            Alert.alert(
              "Upcoming Reserved Ride!",
              `Your scheduled ride for ${data.customerName} starts in 15 minutes! Please prepare to travel.`,
              [
                {
                  text: "Start Travel",
                  onPress: async () => {
                    const { startReservedRide } = get();
                    await startReservedRide(data.orderId);
                  }
                }
              ],
              { cancelable: false }
            );
          });
        });
      },
      goOffline: async () => {
        set({ isOnline: false, homeMode: false });
        const { token } = get();
        if (token) {
          try {
            await fetch(`${apiUrl}/api/v1/drivers/status`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ status: "OFFLINE" })
            });
          } catch (e) {
            console.error("Failed to set offline status:", e);
          }
        }
        
        import("../utils/socketService").then(({ socketService }) => {
          socketService.off("new_order", () => {}); // Remove listener
          socketService.off("order_cancelled", () => {}); // Remove listener
          socketService.off("upcoming_reserved_ride", () => {}); // Remove listener
          socketService.disconnect();
        });
      },
      toggleHomeMode: async () => {
        const nextMode = !get().homeMode;
        const { token } = get();
        if (token) {
          try {
            const res = await fetch(`${apiUrl}/api/v1/drivers/home-mode`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ homeMode: nextMode })
            });
            if (!res.ok) {
              const data = await res.json();
              Alert.alert("Home Mode Error", data.message || "Failed to update home mode.");
              return;
            }
          } catch (e: any) {
            console.error("Failed to update home mode on backend:", e);
            Alert.alert("Home Mode Error", "Connection failed. Please try again.");
            return;
          }
        }
        set({ homeMode: nextMode });
      },

      startReservedRide: async (orderId: string) => {
        const { token } = get();
        let orderFromApi: any = null;
        if (token) {
          try {
            const res = await fetch(`${apiUrl}/api/v1/orders/${orderId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              orderFromApi = await res.json();
            }
          } catch (err) {
            console.error("Failed to fetch reserved order details on start travel:", err);
          }
        }

        const orderToSet = orderFromApi ? {
          id: orderFromApi._id || orderFromApi.id,
          distance: `${orderFromApi.totalDistance || 0} km`,
          duration: `${orderFromApi.duration || 0} min`,
          earnings: Math.round(orderFromApi.totalPrice * 0.8),
          status: orderFromApi.status,
          customerName: orderFromApi.user?.name || "Customer",
          customerPhone: orderFromApi.user?.phone || "N/A",
          timestamp: new Date(orderFromApi.createdAt),
          serviceType: orderFromApi.serviceType,
          radius: orderFromApi.radius,
          restaurantPickupCode: orderFromApi.restaurantPickupCode,
          deliveryOtp: orderFromApi.deliveryOtp,
          polyline: orderFromApi.polyline,
          vendorName: orderFromApi.vendor?.name,
          vendorPhone: orderFromApi.vendor?.phone,
          stops: orderFromApi.stops.map((s: any) => ({
            id: s._id,
            type: s.type.toLowerCase() === "drop" ? "delivery" : s.type.toLowerCase(),
            locationName: s.address?.split(',')[0],
            address: s.address,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
            items: s.items,
          }))
        } : {
          id: orderId,
          distance: "N/A",
          duration: "N/A",
          earnings: 0,
          status: "driver_assigned",
          customerName: "Customer",
          customerPhone: "N/A",
          timestamp: new Date(),
          serviceType: "ride",
          stops: [],
        };

        set({
          currentOrder: orderToSet as any,
          currentStep: 0,
          activeChat: [],
          unreadCount: 0,
        });
        
        router.push("/active-order");
      },

      acceptOrder: async () => {
        const { incomingOrder, token } = get();
        if (incomingOrder) {
          const isReserved = incomingOrder.isReserved;
          let accepted = false;
          let orderFromApi: any = null;
          if (token) {
            try {
              const res = await fetch(`${apiUrl}/api/v1/orders/${incomingOrder.id}/accept`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                }
              });
              if (!res.ok) {
                const error = await res.json();
                console.warn(error.message || "Failed to accept order via API");
              } else {
                accepted = true;
                orderFromApi = await res.json();
              }
            } catch (e) {
              console.error("Order acceptance API failed:", e);
            }
          }
          
          if (!accepted) {
            // Fallback for unauthenticated testing or API failure
            import("../utils/socketService").then(({ socketService }) => {
              socketService.emit("driver_accepted_order", {
                orderId: incomingOrder.id,
                driverInfo: { id: "mock_driver_123", name: "Mock Driver", phone: "+1 (555) 987-6543", vehicle: "Mock Vehicle" }
              });
            });
          }

          if (isReserved) {
            Alert.alert(
              "Ride Reserved Successfully",
              "You have successfully accepted this scheduled ride reservation. We will notify you 15 minutes before the pickup time.",
              [{ text: "OK" }]
            );
            set({
              currentOrder: null,
              incomingOrder: null,
              activeChat: [],
              unreadCount: 0,
            });
            return;
          }

          const orderToSet = orderFromApi ? {
            id: orderFromApi._id || orderFromApi.id,
            distance: `${orderFromApi.totalDistance || 0} km`,
            duration: `${orderFromApi.duration || 0} min`,
            earnings: Math.round(orderFromApi.totalPrice * 0.8),
            status: orderFromApi.status,
            customerName: orderFromApi.user?.name || incomingOrder.customerName,
            customerPhone: orderFromApi.user?.phone || incomingOrder.customerPhone,
            timestamp: new Date(orderFromApi.createdAt),
            serviceType: orderFromApi.serviceType,
            radius: orderFromApi.radius,
            restaurantPickupCode: orderFromApi.restaurantPickupCode,
            deliveryOtp: orderFromApi.deliveryOtp,
            polyline: orderFromApi.polyline,
            vendorName: orderFromApi.vendor?.name || (orderFromApi.vendor && typeof orderFromApi.vendor === "object" ? orderFromApi.vendor.name : null) || incomingOrder?.vendorName,
            vendorPhone: orderFromApi.vendor?.phone || (orderFromApi.vendor && typeof orderFromApi.vendor === "object" ? orderFromApi.vendor.phone : null) || incomingOrder?.vendorPhone,
            stops: orderFromApi.stops.map((s: any) => ({
              id: s._id,
              type: s.type.toLowerCase() === "drop" ? "delivery" : s.type.toLowerCase(),
              locationName: s.address?.split(',')[0],
              address: s.address,
              lat: s.location.coordinates[1],
              lng: s.location.coordinates[0],
              items: s.items,
            }))
          } : { ...incomingOrder, status: "accepted" };

          set({
            currentOrder: orderToSet as any,
            incomingOrder: null,
            currentStep: 0,
            activeChat: [],
            unreadCount: 0,
          });
        }
      },

      rejectOrder: async (reason?: string) => {
        const { incomingOrder, token } = get();
        if (incomingOrder && token && reason) {
          try {
            await fetch(`${apiUrl}/api/v1/orders/${incomingOrder.id}/decline`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ reason })
            });
          } catch (e) {
            console.error("Failed to decline order", e);
          }
        }
        set({ incomingOrder: null });
      },

      updateStep: (step) => {
        const { currentOrder } = get();
        if (!currentOrder) return;
        set({ currentStep: step });
      },

      updateOrderStatus: async (status: OrderStatus, otp?: string) => {
        const { currentOrder, token } = get();
        if (!currentOrder) return;

        let updated = false;
        let orderFromApi: any = null;
        if (token) {
          try {
            const res = await fetch(`${apiUrl}/api/v1/orders/${currentOrder.id}/status`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ status, otp })
            });
            if (res.ok) {
              updated = true;
              orderFromApi = await res.json();
            } else {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || "Failed to update status on server");
            }
          } catch (e: any) {
            console.error("Failed to update order status via API:", e);
            throw e;
          }
        }

        // Also emit via socket to ensure real-time notification
        socketService.emit("order_status_update", {
          orderId: currentOrder.id,
          status: status
        });

        // Update local state
        const orderToSet = orderFromApi ? {
          id: orderFromApi._id || orderFromApi.id,
          distance: `${orderFromApi.totalDistance || 0} km`,
          duration: `${orderFromApi.duration || 0} min`,
          earnings: Math.round(orderFromApi.totalPrice * 0.8),
          status: orderFromApi.status,
          customerName: orderFromApi.user?.name || currentOrder.customerName,
          customerPhone: orderFromApi.user?.phone || currentOrder.customerPhone,
          timestamp: new Date(orderFromApi.createdAt),
          serviceType: orderFromApi.serviceType,
          radius: orderFromApi.radius,
          restaurantPickupCode: orderFromApi.restaurantPickupCode,
          deliveryOtp: orderFromApi.deliveryOtp,
          polyline: orderFromApi.polyline,
          vendorName: orderFromApi.vendor?.name || (orderFromApi.vendor && typeof orderFromApi.vendor === "object" ? orderFromApi.vendor.name : null) || currentOrder?.vendorName,
          vendorPhone: orderFromApi.vendor?.phone || (orderFromApi.vendor && typeof orderFromApi.vendor === "object" ? orderFromApi.vendor.phone : null) || currentOrder?.vendorPhone,
          stops: orderFromApi.stops.map((s: any) => ({
            id: s._id,
            type: s.type.toLowerCase() === "drop" ? "delivery" : s.type.toLowerCase(),
            locationName: s.address?.split(',')[0],
            address: s.address,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
            items: s.items,
          }))
        } : { ...currentOrder, status: status };

        set({
          currentOrder: orderToSet as any
        });
      },

      completeOrder: () => {
        const { currentOrder, earnings, orderHistory } = get();
        if (!currentOrder) return;

        const completed: CompletedOrder = {
          id: currentOrder.id,
          earnings: currentOrder.earnings,
          distance: currentOrder.distance,
          customerName: currentOrder.customerName,
          stops: currentOrder.stops.length,
          completedAt: new Date(),
        };

        set({
          currentOrder: null,
          currentStep: 0,
          activeChat: [],
          unreadCount: 0,
          orderHistory: [completed, ...orderHistory],
          earnings: {
            ...earnings,
            today: earnings.today + currentOrder.earnings,
            week: earnings.week + currentOrder.earnings,
            totalDeliveries: earnings.totalDeliveries + 1,
          },
        });
      },

      setIncomingOrder: (order) => set({ incomingOrder: order }),

      updateDriverLocation: (lat, lng) =>
        set({ driverLocation: { lat, lng } }),
  
      setAuthenticated: (name: string, phone: string, token: string, userId: string) =>
        set({
          isAuthenticated: true,
          driverName: name,
          driverPhone: phone,
          token,
          driverUserId: userId,
        }),
  
      setOnboardingCompleted: () => set({ hasCompletedOnboarding: true }),
      setIdentityVerified: (verified) => set({ identityVerified: verified }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),

      refreshSession: async () => {
        const { token, isAuthenticated } = get();
        if (!token) {
          if (isAuthenticated) get().logout();
          return false;
        }

        try {
          const res = await fetch(`${apiUrl}/api/v1/drivers/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.status === 401 || res.status === 403 || res.status === 404) {
            get().logout();
            return false;
          }

          if (res.ok) {
            const result = await res.json();
            set({
              driverName: result.account?.name || "",
              driverPhone: result.account?.phone || "",
              driverUserId: result.account?.id || null,
              hasCompletedOnboarding: result.driver?.onboardingStatus === "completed",
              identityVerified: result.verification?.identity ?? false,
            });
          }

          return true;
        } catch (error) {
          console.warn("Failed to refresh driver session:", error);
          return Boolean(get().token);
        }
      },
  
      logout: () => {
        AsyncStorage.removeItem("driver-store"); // Clear persistence on logout
        set({
          isAuthenticated: false,
          hasCompletedOnboarding: false,
          driverName: "",
          driverPhone: "",
          driverUserId: null,
          token: null,
          isOnline: false,
          currentOrder: null,
          incomingOrder: null,
        });
      },

      addChatMessage: (msg) => set((state) => ({ 
        activeChat: [...state.activeChat, msg] 
      })),

      clearChat: () => set({ activeChat: [], unreadCount: 0 }),

      setUnreadCount: (unreadCount) => set({ unreadCount }),

      incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

      setIsChatActive: (isChatActive) => set({ isChatActive }),

      loginWithPassword: async (phone: string, password: string) => {
        try {
          const response = await fetch(`${apiUrl}/api/v1/auth/login-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password, role: "DRIVER" }),
          });
          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          if (!response.ok) throw new Error(data.message || "Login failed");

          set({
            isAuthenticated: true,
            driverName: data.user.name,
            driverPhone: data.user.phone,
            driverUserId: data.user.id || data.user._id,
            token: data.token,
          });

          await get().refreshSession();
        } catch (err: any) {
          throw err;
        }
      },

      /**
       * Fetches real earnings data from the backend and updates the store.
       * Called from the home screen on mount and on pull-to-refresh.
       */
      fetchEarnings: async () => {
        const { token } = get();
        if (!token || !apiUrl) return;
        try {
          const res = await fetch(`${apiUrl}/api/v1/drivers/earnings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return; // silently ignore — keep whatever is in store
          const data = await res.json();
          // Backend returns:
          //   { availableBalance, weekBalance, trendPercent, weeklyBreakdown, stats: { completedTrips, onlineHours, totalDistance } }
          const weeklyBreakdown: { day: string; amount: number }[] =
            Array.isArray(data.weeklyBreakdown) && data.weeklyBreakdown.length > 0
              ? data.weeklyBreakdown
              : [
                  { day: "Mon", amount: 0 },
                  { day: "Tue", amount: 0 },
                  { day: "Wed", amount: 0 },
                  { day: "Thu", amount: 0 },
                  { day: "Fri", amount: 0 },
                  { day: "Sat", amount: 0 },
                  { day: "Sun", amount: 0 },
                ];
          set({
            earnings: {
              today: data.availableBalance ?? 0,   // available balance as "today's earnings"
              week: data.weekBalance ?? 0,
              totalDeliveries: data.stats?.completedTrips ?? 0,
              weeklyBreakdown,
            },
          });
        } catch (err) {
          console.warn("fetchEarnings failed:", err);
        }
      },
    }),
    {
      name: "driver-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        identityVerified: state.identityVerified,
        driverName: state.driverName,
        driverPhone: state.driverPhone,
        driverUserId: state.driverUserId,
        token: state.token,
        // Note: earnings and orderHistory are NOT persisted so fresh data
        // is always fetched from the API on each session start.
        activeChat: state.activeChat,
      }),
    }
  )
);
