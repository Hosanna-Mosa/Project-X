import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type StopType = "pickup" | "delivery";

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
  | "en_route_pickup"
  | "arrived_pickup"
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
}

export interface CompletedOrder {
  id: string;
  earnings: number;
  distance: string;
  customerName: string;
  stops: number;
  completedAt: Date;
}

export interface EarningsData {
  today: number;
  week: number;
  totalDeliveries: number;
  weeklyBreakdown: { day: string; amount: number }[];
}

interface DriverState {
  isOnline: boolean;
  currentOrder: Order | null;
  incomingOrder: Order | null;
  currentStep: number;
  earnings: EarningsData;
  orderHistory: CompletedOrder[];
  driverLocation: { lat: number; lng: number };
  driverName: string;
  driverPhone: string;
  isAuthenticated: boolean;

  goOnline: () => void;
  goOffline: () => void;
  acceptOrder: () => void;
  rejectOrder: () => void;
  updateStep: (step: number) => void;
  completeOrder: () => void;
  setIncomingOrder: (order: Order | null) => void;
  updateDriverLocation: (lat: number, lng: number) => void;
  setAuthenticated: (name: string, phone: string) => void;
  logout: () => void;
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
      currentOrder: null,
      incomingOrder: null,
      currentStep: 0,
      driverLocation: { lat: 12.971, lng: 77.594 },
      driverName: "",
      driverPhone: "",
      isAuthenticated: false,
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

      goOnline: () => set({ isOnline: true }),
      goOffline: () => set({ isOnline: false }),

      acceptOrder: () => {
        const { incomingOrder } = get();
        if (incomingOrder) {
          set({
            currentOrder: { ...incomingOrder, status: "accepted" },
            incomingOrder: null,
            currentStep: 0,
          });
        }
      },

      rejectOrder: () => set({ incomingOrder: null }),

      updateStep: (step) => {
        const { currentOrder } = get();
        if (!currentOrder) return;
        set({ currentStep: step });
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

      setAuthenticated: (name, phone) =>
        set({ isAuthenticated: true, driverName: name, driverPhone: phone }),

      logout: () =>
        set({
          isAuthenticated: false,
          driverName: "",
          driverPhone: "",
          isOnline: false,
          currentOrder: null,
          incomingOrder: null,
        }),
    }),
    {
      name: "driver-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        driverName: state.driverName,
        driverPhone: state.driverPhone,
        earnings: state.earnings,
        orderHistory: state.orderHistory,
      }),
    }
  )
);
