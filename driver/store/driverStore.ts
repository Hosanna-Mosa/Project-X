import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import Constants from "expo-constants";
import { socketService } from "../utils/socketService";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

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
  | "completed";

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
  activeChat: ChatMessage[];
  unreadCount: number;
  isChatActive: boolean;

  goOnline: (services: ("food" | "ride")[]) => Promise<void>;
  goOffline: () => Promise<void>;
  toggleHomeMode: () => void;
  acceptOrder: () => void;
  rejectOrder: () => void;
  updateStep: (step: number) => void;
  updateOrderStatus: (status: OrderStatus, otp?: string) => Promise<void>;
  completeOrder: () => void;
  setIncomingOrder: (order: Order | null) => void;
  updateDriverLocation: (lat: number, lng: number) => void;
  setAuthenticated: (name: string, phone: string, token: string) => void;
  setOnboardingCompleted: () => void;
  resetOnboarding: () => void;
  logout: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  setIsChatActive: (active: boolean) => void;
  loginWithPassword: (phone: string, password: string) => Promise<void>;
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
      activeChat: [],
      unreadCount: 0,
      isChatActive: false,
      earnings: {
        today: 342,
        week: 2180,
        totalDeliveries: 847,
        weeklyBreakdown: [
          { day: "Mon", amount: 280 },
          { day: "Tue", amount: 340 },
          { day: "Wed", amount: 410 },
          { day: "Thu", amount: 295 },
          { day: "Fri", amount: 385 },
          { day: "Sat", amount: 470 },
          { day: "Sun", amount: 342 },
        ],
      },
      orderHistory: [
        {
          id: "ORD-001",
          earnings: 95,
          distance: "5.2 km",
          customerName: "Priya Mehta",
          stops: 3,
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: "ORD-002",
          earnings: 75,
          distance: "3.8 km",
          customerName: "Arjun Singh",
          stops: 2,
          completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        },
        {
          id: "ORD-003",
          earnings: 110,
          distance: "6.5 km",
          customerName: "Sneha Patel",
          stops: 3,
          completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
        {
          id: "ORD-004",
          earnings: 62,
          distance: "2.9 km",
          customerName: "Vikram Nair",
          stops: 2,
          completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ],

      goOnline: async (services) => {
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
        
        // Connect to real-time order broadcasts regardless of token
        import("../utils/socketService").then(({ socketService }) => {
          socketService.connect();
          socketService.join(driverUserId || "mock_driver_123", "DRIVER");
          socketService.on("new_order", (data: any) => {
            console.log("New order received:", data);
            get().setIncomingOrder(data as Order);
          });
        });

        set({ isOnline: true, activeServices: services });
      },
      goOffline: async () => {
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
        });

        set({ isOnline: false, homeMode: false });
      },
      toggleHomeMode: () => set((state) => ({ homeMode: !state.homeMode })),

      acceptOrder: async () => {
        const { incomingOrder, token } = get();
        if (incomingOrder) {
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

      rejectOrder: () => set({ incomingOrder: null }),

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
  
      setAuthenticated: (name: string, phone: string, token: string) =>
        set({ isAuthenticated: true, driverName: name, driverPhone: phone, token, hasCompletedOnboarding: false }),
  
      setOnboardingCompleted: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
  
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
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Login failed");

          set({
            isAuthenticated: true,
            hasCompletedOnboarding: false,
            driverName: data.user.name,
            driverPhone: data.user.phone,
            driverUserId: data.user.id,
            token: data.token,
          });
        } catch (err: any) {
          throw err;
        }
      },
    }),
    {
      name: "driver-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        driverName: state.driverName,
        driverPhone: state.driverPhone,
        driverUserId: state.driverUserId,
        token: state.token,
        earnings: state.earnings,
        orderHistory: state.orderHistory,
        activeChat: state.activeChat,
      }),
    }
  )
);
