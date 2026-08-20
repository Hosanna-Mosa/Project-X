import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  FamiljenGrotesk_400Regular,
  FamiljenGrotesk_500Medium,
  FamiljenGrotesk_600SemiBold,
  FamiljenGrotesk_700Bold,
} from "@expo-google-fonts/familjen-grotesk";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Platform, View, Modal, TouchableOpacity, Image, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/contexts/authStore";
import { setAuthTokenGetter, setBaseUrl } from "@/utils/api/custom-fetch";
import { navigateToNotificationTarget } from "@/utils/deepLink";

// The API URL should be retrieved from environment variables or app config
const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
console.log("[DEBUG] API URL:", apiUrl);

if (apiUrl) {
  setBaseUrl(apiUrl);
}

// Register token getter for automated Authorization headers
setAuthTokenGetter(() => {
  return useAuthStore.getState().token;
});


import { FloatingCart } from "@/components/FloatingCart";
import UpdateModal from "@/components/UpdateModal";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useState } from "react";
import { GlobalSocketHandler } from "@/components/GlobalSocketHandler";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { typography } from "@/constants/typography";
import { TextInput } from "react-native";

// --- Global Typography Patch ---
const patchComponentStyle = (Component: any) => {
  const originalRender = Component.render;
  if (!originalRender) return;

  Component.render = function (props: any, ref: any) {
    if (props && props.style) {
      const flat = StyleSheet.flatten(props.style);
      const updated = { ...flat };
      let changed = false;

      // 1. Intercept Font Size & Weight mapping to Typography
      if (typeof flat.fontSize === "number") {
        const size = flat.fontSize;
        if (size >= 24) {
          updated.fontSize = typography.heading1.fontSize;
          if (flat.fontWeight === undefined || flat.fontWeight === "700" || flat.fontWeight === "800" || flat.fontWeight === "900" || flat.fontWeight === "bold") {
            updated.fontWeight = typography.heading1.fontWeight;
          }
          changed = true;
        } else if (size >= 18) {
          updated.fontSize = typography.heading2.fontSize;
          if (flat.fontWeight === undefined || flat.fontWeight === "700" || flat.fontWeight === "800" || flat.fontWeight === "bold") {
            updated.fontWeight = typography.heading2.fontWeight;
          }
          changed = true;
        } else if (size >= 15) {
          updated.fontSize = typography.sizes.bodyLarge;
          changed = true;
        } else if (size >= 13) {
          updated.fontSize = typography.body.fontSize;
          changed = true;
        } else if (size >= 11) {
          updated.fontSize = typography.bodySecondary.fontSize;
          changed = true;
        } else {
          updated.fontSize = typography.sizes.caption;
          changed = true;
        }
      }

      // 2. Set Font Family based on Weight to ensure Inter is used everywhere
      const weight = flat.fontWeight;
      if (weight === "800" || weight === "900" || weight === "bold" || weight === "700") {
        updated.fontFamily = "Inter_700Bold";
        changed = true;
      } else if (weight === "600") {
        updated.fontFamily = "Inter_600SemiBold";
        changed = true;
      } else if (weight === "500") {
        updated.fontFamily = "Inter_500Medium";
        changed = true;
      } else {
        updated.fontFamily = "Inter_400Regular";
        changed = true;
      }

      if (changed) {
        props = {
          ...props,
          style: updated,
        };
      }
    } else {
      // Default to regular Inter font if no style is specified
      props = {
        ...props,
        style: { fontFamily: "Inter_400Regular" },
      };
    }
    return originalRender.call(this, props, ref);
  };
};

import { StyleSheet } from "react-native";
patchComponentStyle(Text);
patchComponentStyle(TextInput);
// -------------------------------

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const insets = useSafeAreaInsets();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  if (!isInitialized) {
    return null; // Or a custom Loading/Splash view
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="otp" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="delivery/entry" options={{ headerShown: false }} />
        <Stack.Screen name="delivery/add-stop" options={{ headerShown: false }} />
        <Stack.Screen name="delivery/checkout" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ headerShown: false }} />
        <Stack.Screen name="tracking" options={{ headerShown: false }} />
        <Stack.Screen name="pickup-confirmation" options={{ headerShown: false }} />
        <Stack.Screen name="ride-searching" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant-menu" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant-details" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="149-store" options={{ headerShown: false, animation: "slide_from_right" }} />
      </Stack>
      {Platform.OS === "android" && insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: colors.background }} />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [latestVersion, setLatestVersion] = useState("");

  const handleDismissUpdate = async () => {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      if (latestVersion) {
        await AsyncStorage.setItem("dismissed_update_version", latestVersion);
      }
    } catch (err) {
      console.warn("Failed to save dismissed version:", err);
    }
    setShowUpdate(false);
  };

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync("dark");
    }

    // Call version-check API on app launch
    (async () => {
      try {
        const platform = Platform.OS === "ios" ? "ios" : "android";
        const currentVersion = Constants.expoConfig?.version || "1.0.0";
        const res = await fetch(`${apiUrl}/api/v1/auth/version-check?platform=${platform}&version=${currentVersion}`);
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
            // Check if this version was already dismissed
            const AsyncStorage = require("@react-native-async-storage/async-storage").default;
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

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    FamiljenGrotesk_400Regular,
    FamiljenGrotesk_500Medium,
    FamiljenGrotesk_600SemiBold,
    FamiljenGrotesk_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const segments = useSegments();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Initialize auth (reads token from AsyncStorage), then hide splash
      initializeAuth().then(() => {
        SplashScreen.hideAsync();
      });
    }
  }, [fontsLoaded, fontError]);

  // Once auth is initialized and fonts are ready, redirect based on token
  useEffect(() => {
    if (!(fontsLoaded || fontError) || !isInitialized) return;

    const firstSegment = segments[0];
    const isAuthScreen = !firstSegment || firstSegment === "login" || firstSegment === "signup" || firstSegment === "otp";

    if (!token && !isAuthScreen) {
      router.replace("/login");
      return;
    }

    if (token && isAuthScreen) {
        // Token exists → go straight to the main app
        router.replace("/(tabs)");
      }
      if (token && false) {
        // No token → show login screen
        router.replace("/login");
      }
  }, [isInitialized, token, fontsLoaded, fontError, segments]);

  // Register push notifications when authenticated, and listen for tokens & taps (Priority 3 & 4)
  useEffect(() => {
    if (!token) return;

    const { registerForPushNotificationsAsync } = require("@/utils/notificationRegister");
    const { customFetch } = require("@/utils/api/custom-fetch");

    // 1. Initial Registration
    registerForPushNotificationsAsync().catch((err: any) => {
      console.error("Error registering push notifications:", err);
    });

    // 2. Token Refresh Listener (Priority 3)
    const tokenSubscription = Notifications.addPushTokenListener(async (tokenData) => {
      console.log("[PushNotifications] Token refreshed:", tokenData.data);
      try {
        await customFetch("/api/v1/users/push-token", {
          method: "POST",
          body: JSON.stringify({ expoPushToken: tokenData.data }),
        });
        console.log("[PushNotifications] Refreshed token updated on backend successfully!");
      } catch (err) {
        console.error("[PushNotifications] Failed to sync refreshed token on backend:", err);
      }
    });

    // 3. Notification Tap / Response Listener — app was already running (foreground/background)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log("[PushNotifications] Notification tapped. Payload data:", data);
      navigateToNotificationTarget(data);
    });

    // 4. Cold-start check — app was fully killed and got opened BY tapping a notification.
    // addNotificationResponseReceivedListener above never fires for this case.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data;
      console.log("[PushNotifications] Cold-started from notification. Payload data:", data);
      navigateToNotificationTarget(data);
    });

    return () => {
      tokenSubscription.remove();
      responseSubscription.remove();
    };
  }, [token]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
              <FloatingCart />
              <GlobalSocketHandler />
              <OfflineBanner />
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
