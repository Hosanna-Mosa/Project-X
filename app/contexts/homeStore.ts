import { create } from "zustand";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";

interface HomeState {
  restaurants: any[];
  meatCenters: any[];
  nearbyDriversCount: number | null;
  loading: boolean;
  loadingDrivers: boolean;
  store149Items: any[];
  activeService: 'Food' | 'Meat';
  lastFetchedCoords: { lat: number; lng: number } | null;
  lastFetchedService: 'Food' | 'Meat' | null;
  
  setRestaurants: (restaurants: any[] | ((prev: any[]) => any[])) => void;
  setMeatCenters: (meatCenters: any[] | ((prev: any[]) => any[])) => void;
  setNearbyDriversCount: (count: number | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingDrivers: (loading: boolean) => void;
  setStore149Items: (items: any[]) => void;
  setActiveService: (service: 'Food' | 'Meat') => void;
  
  fetchHomeData: (lat: number, lng: number, activeService: 'Food' | 'Meat', appliedDistanceKm?: number | null) => Promise<void>;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  restaurants: [],
  meatCenters: [],
  nearbyDriversCount: null,
  loading: true,
  loadingDrivers: true,
  store149Items: [],
  activeService: 'Food',
  lastFetchedCoords: null,
  lastFetchedService: null,
  
  setRestaurants: (val) => set((state) => ({
    restaurants: typeof val === 'function' ? val(state.restaurants) : val
  })),
  setMeatCenters: (val) => set((state) => ({
    meatCenters: typeof val === 'function' ? val(state.meatCenters) : val
  })),
  setNearbyDriversCount: (nearbyDriversCount) => set({ nearbyDriversCount }),
  setLoading: (loading) => set({ loading }),
  setLoadingDrivers: (loadingDrivers) => set({ loadingDrivers }),
  setStore149Items: (store149Items) => set({ store149Items }),
  setActiveService: (activeService) => set({ activeService }),
  
  fetchHomeData: async (lat, lng, activeService, appliedDistanceKm = null) => {
    set({ loading: true, loadingDrivers: true });
    
    // Get authorization token from authStore
    const token = useAuthStore.getState().token;
    const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
    
    try {
      // 1. Fetch drivers with exact same query params and headers as index.tsx
      const driversHeaders: any = {};
      if (token) {
        driversHeaders["Authorization"] = `Bearer ${token}`;
      }
      const driversPromise = customFetch<any[]>(
        `/api/v1/drivers/nearby?latitude=${lat}&longitude=${lng}&radius=5000`,
        { headers: driversHeaders }
      )
        .then((drivers) => {
          set({ nearbyDriversCount: Array.isArray(drivers) ? drivers.length : 0 });
        })
        .catch((err) => {
          console.error("Check drivers error in homeStore:", err);
          set({ nearbyDriversCount: 0 });
        })
        .finally(() => {
          set({ loadingDrivers: false });
        });

      // 2. Fetch main service data using the exact same endpoints as index.tsx
      let servicePromise;
      if (activeService === 'Meat') {
        servicePromise = customFetch<any[]>(`/api/v1/meat/nearby?lat=${lat}&lng=${lng}&page=1&limit=20${radiusParam}`)
          .then((data) => {
            set({ meatCenters: Array.isArray(data) ? data : [] });
          })
          .catch((err) => {
            console.error("Fetch meat centers error in homeStore:", err);
            set({ meatCenters: [] });
          });
      } else {
        servicePromise = Promise.all([
          customFetch<any[]>(`/api/v1/vendors/nearby?lat=${lat}&lng=${lng}&page=1&limit=20${radiusParam}`)
            .then((data) => {
              set({ restaurants: Array.isArray(data) ? data : [] });
            })
            .catch((err) => {
              console.error("Fetch vendors error in homeStore:", err);
              set({ restaurants: [] });
            }),
          customFetch<any[]>(`/api/v1/food/store-149?lat=${lat}&lng=${lng}`)
            .then((data) => {
              set({ store149Items: Array.isArray(data) ? data : [] });
            })
            .catch((err) => {
              console.error("Fetch 149 items error in homeStore:", err);
              set({ store149Items: [] });
            })
        ]);
      }

      await Promise.all([driversPromise, servicePromise]);
      set({ lastFetchedCoords: { lat, lng }, lastFetchedService: activeService });
    } catch (err) {
      console.error("fetchHomeData error:", err);
    } finally {
      set({ loading: false });
    }
  }
}));
