import { create } from "zustand";

export interface DeliveryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface DeliveryStop {
  id: string;
  address: string;
  storeName?: string;
  items: DeliveryItem[];
  lat?: number;
  lng?: number;
}

export interface RouteInfo {
  totalDistance: number;
  estimatedTime: number;
  polyline?: string;
}

export interface PriceBreakdown {
  baseFee: number;
  distanceCost: number;
  stopCharges: number;
  total: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "driver_assigned"
  | "picking_items"
  | "on_the_way"
  | "delivered";

export interface DeliveryState {
  stops: DeliveryStop[];
  route: RouteInfo | null;
  price: PriceBreakdown | null;
  status: OrderStatus;
  scheduling: "asap" | "scheduled";
  loadType: "parcel" | "grocery" | "fragile" | "mixed";
  paymentMethod: string;
  currentLocation: string;
  currentCoords: { lat: number; lng: number } | null;
  currentOrderId: string | null;
  driver: any | null;
  setCurrentLocation: (address: string) => void;
  setCurrentCoords: (coords: { lat: number; lng: number }) => void;
  setOrderId: (id: string | null) => void;
  setDriver: (driver: any) => void;
  addStop: (address: string, storeName?: string, items?: DeliveryItem[], lat?: number, lng?: number) => void;
  removeStop: (id: string) => void;
  reorderStops: (from: number, to: number) => void;
  addItemToStop: (stopId: string, item: DeliveryItem) => void;
  removeItemFromStop: (stopId: string, itemId: string) => void;
  updateStop: (stopId: string, data: Partial<DeliveryStop>) => void;
  setScheduling: (s: "asap" | "scheduled") => void;
  setLoadType: (t: "parcel" | "grocery" | "fragile" | "mixed") => void;
  calculateRoute: () => void;
  calculatePrice: () => void;
  setStatus: (status: OrderStatus) => void;
  setRoute: (route: RouteInfo) => void;
  setStops: (stops: DeliveryStop[]) => void;
  resetDelivery: () => void;
}

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

const initialState = {
  stops: [],
  route: null,
  price: null,
  status: "pending" as OrderStatus,
  scheduling: "asap" as const,
  loadType: "mixed" as const,
  paymentMethod: "**** 4342",
  currentLocation: "340 Main St, San Francisco, CA 94105",
  currentCoords: null,
  currentOrderId: null,
  driver: null,
};

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  ...initialState,
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setCurrentCoords: (currentCoords) => set({ currentCoords }),
  setOrderId: (currentOrderId) => set({ currentOrderId }),
  setDriver: (driver) => set({ driver }),

  addStop: (address: string, storeName?: string, items: DeliveryItem[] = [], lat?: number, lng?: number) => {
    set((state) => ({
      stops: [
        ...state.stops,
        {
          id: generateId(),
          address,
          storeName,
          items,
          lat,
          lng,
        },
      ],
    }));
  },

  removeStop: (id: string) => {
    set((state) => ({
      stops: state.stops.filter((s) => s.id !== id),
    }));
  },

  reorderStops: (from: number, to: number) => {
    set((state) => {
      const stops = [...state.stops];
      const [removed] = stops.splice(from, 1);
      stops.splice(to, 0, removed);
      return { stops };
    });
  },

  addItemToStop: (stopId: string, item: DeliveryItem) => {
    set((state) => ({
      stops: state.stops.map((s) =>
        s.id === stopId ? { ...s, items: [...s.items, item] } : s
      ),
    }));
  },

  removeItemFromStop: (stopId: string, itemId: string) => {
    set((state) => ({
      stops: state.stops.map((s) =>
        s.id === stopId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      ),
    }));
  },

  updateStop: (stopId: string, data: Partial<DeliveryStop>) => {
    set((state) => ({
      stops: state.stops.map((s) =>
        s.id === stopId ? { ...s, ...data } : s
      ),
    }));
  },

  setScheduling: (scheduling) => set({ scheduling }),
  setLoadType: (loadType) => set({ loadType }),

  calculateRoute: () => {
    const { stops } = get();
    const totalDistance = stops.length * 2.5 + Math.random() * 3;
    const estimatedTime = Math.round(totalDistance * 4);
    set({
      route: {
        totalDistance: Math.round(totalDistance * 10) / 10,
        estimatedTime,
      },
    });
  },

  calculatePrice: () => {
    const { stops, route } = get();
    const baseFee = 2.0;
    const distanceCost = route ? Math.round(route.totalDistance * 0.6 * 100) / 100 : 4.5;
    const stopCharges = stops.length * 1.5;
    const total = Math.round((baseFee + distanceCost + stopCharges) * 100) / 100;
    set({ price: { baseFee, distanceCost, stopCharges, total } });
  },

  setStatus: (status) => set({ status }),
  setRoute: (route) => set({ route }),
  setStops: (stops) => set({ stops }),
  resetDelivery: () => set(initialState),
}));
