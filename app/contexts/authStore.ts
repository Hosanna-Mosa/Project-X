import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// The API URL should be retrieved from app.json/Constants
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  setUser: (user: any) => void;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
  requestOTP: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (phone: string, code: string, role: string, name?: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    set({ token });
    AsyncStorage.setItem("token", token);
  },

  initializeAuth: async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("user"),
      ]);
      
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) });
      }
    } catch (err) {
      console.error("Failed to initialize auth", err);
    }
  },

  logout: async () => {
    set({ user: null, token: null });
    await Promise.all([
      AsyncStorage.removeItem("token"),
      AsyncStorage.removeItem("user"),
    ]);
  },

  requestOTP: async (phone: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${apiUrl}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      set({ loading: false });
      if (!response.ok) throw new Error(data.message || "Something went wrong");
      return { success: true, message: data.message };
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  verifyOTP: async (phone: string, code: string, role: string, name?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${apiUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, role, name }),
      });
      const data = await response.json();
      set({ loading: false });

      if (!response.ok) throw new Error(data.message || "Verification failed");

      if (data.isNewUser) {
        return { success: true, isNewUser: true };
      }

      set({ user: data.user, token: data.token });
      await Promise.all([
        AsyncStorage.setItem("token", data.token),
        AsyncStorage.setItem("user", JSON.stringify(data.user)),
      ]);
      return { success: true, isNewUser: false };
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },
}));
