import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// The API URL should be retrieved from app.json/Constants
const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  /** True once initializeAuth() has completed — used to gate navigation */
  isInitialized: boolean;

  setUser: (user: any) => void;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
  requestOTP: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (phone: string, code: string, role: string, name?: string, email?: string, password?: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  loginWithPassword: (phoneOrEmail: string, password: string, role: string) => Promise<{ success: boolean }>;
  /** Registers a new user account and logs them in, saving the token */
  register: (name: string, phone: string, email: string, password: string) => Promise<{ success: boolean }>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  isInitialized: false,

  setUser: (user) => set({ user }),

  setToken: (token) => {
    set({ token });
    AsyncStorage.setItem("token", token);
  },

  /**
   * Called once on app start (inside _layout.tsx).
   * Reads the persisted token & user from AsyncStorage.
   * Sets isInitialized=true when done so the layout can safely redirect.
   */
  initializeAuth: async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("user"),
      ]);

      if (token && userStr) {
        const cachedUser = JSON.parse(userStr);
        set({ token, user: cachedUser });

        try {
          const response = await fetch(`${apiUrl}/api/v1/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            set({ user: data, isInitialized: true });
            await AsyncStorage.setItem("user", JSON.stringify(data));
          } else if (response.status === 401 || response.status === 403 || response.status === 404) {
            // Token is invalid/expired or user doesn't exist anymore
            set({ token: null, user: null, isInitialized: true });
            await Promise.all([
              AsyncStorage.removeItem("token"),
              AsyncStorage.removeItem("user"),
            ]);
          } else {
            set({ isInitialized: true });
          }
        } catch (fetchErr) {
          console.warn("Failed to verify user session with server, using cached session", fetchErr);
          set({ isInitialized: true });
        }
      } else {
        set({ isInitialized: true });
      }
    } catch (err) {
      console.error("Failed to initialize auth", err);
      set({ isInitialized: true }); // still mark done even on error
    }
  },

  logout: async () => {
    set({ user: null, token: null, error: null, loading: false });
    try {
      await Promise.all([
        AsyncStorage.removeItem("token"),
        AsyncStorage.removeItem("user"),
      ]);
    } finally {
      set({ user: null, token: null, error: null, loading: false });
    }
  },

  requestOTP: async (phone: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/request-otp`, {
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

  verifyOTP: async (phone: string, code: string, role: string, name?: string, email?: string, password?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, role, name, email, password }),
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

  loginWithPassword: async (phoneOrEmail: string, password: string, role: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/login-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneOrEmail, password, role }),
      });
      const data = await response.json();
      set({ loading: false });

      if (!response.ok) throw new Error(data.message || "Login failed");

      set({ user: data.user, token: data.token });
      await Promise.all([
        AsyncStorage.setItem("token", data.token),
        AsyncStorage.setItem("user", JSON.stringify(data.user)),
      ]);
      return { success: true };
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Dedicated signup action — calls /verify-otp with a fixed dummy code
   * to create the account, then persists the returned token.
   */
  register: async (name: string, phone: string, email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: "123456", role: "USER", name, email, password }),
      });
      const data = await response.json();
      set({ loading: false });

      if (!response.ok) throw new Error(data.message || "Registration failed");

      set({ user: data.user, token: data.token });
      await Promise.all([
        AsyncStorage.setItem("token", data.token),
        AsyncStorage.setItem("user", JSON.stringify(data.user)),
      ]);
      return { success: true };
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },
}));
