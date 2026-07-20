import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDriverStore } from "@/store/driverStore";
import { LocationHandler } from "@/components/LocationHandler";
import { GlobalSocketHandler } from "@/components/GlobalSocketHandler";
import UpdateModal from "@/components/UpdateModal";
import { registerForPushNotificationsAsync } from "../utils/notificationRegister";
import "@/utils/networkLogger";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const segments = useSegments();
  const token = useDriverStore((s) => s.token);
  const isAuthenticated = useDriverStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useDriverStore((s) => s.hasCompletedOnboarding);
  const loginPromptShown = useRef(false);
  const sessionChecked = useRef(false); // prevent double refresh

  const [hydrated, setHydrated] = useState(
    () => useDriverStore.persist.hasHydrated?.() ?? false,
  );
  const [needsLoginPrompt, setNeedsLoginPrompt] = useState(false);

  // ── Step 1: Hydrate the store from AsyncStorage ───────────────────────────
  useEffect(() => {
    const finishHydration = async () => {
      const state = useDriverStore.getState();

      if (state.isAuthenticated && state.token && !sessionChecked.current) {
        sessionChecked.current = true;
        const valid = await state.refreshSession();
        if (!valid) {
          state.logout();
          setNeedsLoginPrompt(true);
        }
      } else if (state.isAuthenticated && !state.token) {
        // Auth flag set but no token — clear stale state
        state.logout();
        setNeedsLoginPrompt(true);
      }

      setHydrated(true);
    };

    if (useDriverStore.persist.hasHydrated?.()) {
      finishHydration();
      return;
    }

    const unsub = useDriverStore.persist.onFinishHydration(() => {
      finishHydration();
    });

    return unsub;
  }, []);

  // ── Step 2: Route the user based on auth + onboarding state ──────────────
  useEffect(() => {
    if (!hydrated) return;

    const isLoggedIn = Boolean(isAuthenticated && token);
    const inAuth = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!isLoggedIn) {
      // Unauthenticated → always go to auth screen
      if (!inAuth) {
        router.replace("/auth");
      }
      // Show a helpful alert if session expired
      if (needsLoginPrompt && !loginPromptShown.current) {
        loginPromptShown.current = true;
        Alert.alert("Login required", "Please sign in again to continue as a driver.");
        setNeedsLoginPrompt(false);
      }
      return;
    }

    // Authenticated: guard auth/onboarding screens
    if (hasCompletedOnboarding) {
      if (inAuth || inOnboarding) {
        router.replace("/(tabs)");
      }
      return;
    }

    // Authenticated but onboarding incomplete
    const isAllowedOnboardingScreen = inOnboarding || segments[0] === "zone-map";
    if (!isAllowedOnboardingScreen) {
      router.replace("/onboarding");
    }
  }, [hydrated, isAuthenticated, token, hasCompletedOnboarding, needsLoginPrompt, segments]);

  // Register push notifications when authenticated, and listen for tokens & taps (Priority 3 & 4)
  useEffect(() => {
    if (!token) return;

    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === "expo";

    if (isExpoGo) {
      console.log("[PushNotifications] Push notifications disabled in Expo Go SDK 53+. Use a development build.");
      return;
    }

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

      // 1. Initial Registration
      registerForPushNotificationsAsync(token).catch((err: any) => {
        console.error("Error registering push notifications:", err);
      });

      // 2. Token Refresh Listener (Priority 3)
      const tokenSubscription = Notifications.addPushTokenListener(async (tokenData: any) => {
        console.log("[PushNotifications] Token refreshed (Driver):", tokenData.data);
        try {
          const response = await fetch(`${apiUrl}/api/v1/users/push-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ expoPushToken: tokenData.data }),
          });
          if (response.ok) {
            console.log("[PushNotifications] Refreshed token updated on backend successfully (Driver)!");
          } else {
            console.error("[PushNotifications] Failed to sync refreshed token on backend (Driver):", await response.text());
          }
        } catch (err) {
          console.error("[PushNotifications] Failed to sync refreshed token on backend (Driver):", err);
        }
      });

      // 3. Notification Tap / Response Listener (Priority 4)
      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        console.log("[PushNotifications] Notification tapped (Driver). Payload data:", data);
        
        if (data && data.orderId) {
          // Deep link to the active order screen
          router.push({
            pathname: "/active-order",
            params: { orderId: data.orderId }
          });
        }
      });

      return () => {
        tokenSubscription?.remove();
        responseSubscription?.remove();
      };
    } catch (err) {
      console.warn("[PushNotifications] Error setting up notifications:", err);
    }
  }, [token]);

  if (!hydrated) {
    return null; // Or a custom Loading/Splash view
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="zone-map" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [latestVersion, setLatestVersion] = useState("");

  const handleDismissUpdate = async () => {
    try {
      if (latestVersion) {
        await AsyncStorage.setItem("dismissed_update_version", latestVersion);
      }
    } catch (err) {
      console.warn("Failed to save dismissed version:", err);
    }
    setShowUpdate(false);
  };

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Check version on launch
    (async () => {
      try {
        const platform = Platform.OS === "ios" ? "ios" : "android";
        const currentVersion = Constants.expoConfig?.version || "1.0.0";
        const apiUri = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUri}/api/v1/auth/version-check?platform=${platform}&version=${currentVersion}`);
        if (!res.ok) return;
        const result = await res.json();
        if (result.updateRequired) {
          const latest = result.latest || "1.0.0";
          setLatestVersion(latest);
          setStoreUrl(result.url || (platform === "ios" ? "https://apps.apple.com" : "https://play.google.com"));
          setForceUpdate(result.forceUpdate);
          
          if (result.forceUpdate) {
            setShowUpdate(true);
          } else {
            const dismissedVersion = await AsyncStorage.getItem("dismissed_update_version");
            if (dismissedVersion !== latest) {
              setShowUpdate(true);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to check app updates:", err);
      }
    })();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
              <LocationHandler />
              <GlobalSocketHandler />
              <UpdateModal 
                visible={showUpdate} 
                forceUpdate={forceUpdate} 
                storeUrl={storeUrl} 
                onDismiss={handleDismissUpdate} 
              />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
