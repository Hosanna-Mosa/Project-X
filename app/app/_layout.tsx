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
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Platform, View } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/contexts/authStore";
import { setAuthTokenGetter, setBaseUrl } from "@/utils/api/custom-fetch";

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
import { GlobalSocketHandler } from "@/components/GlobalSocketHandler";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const insets = useSafeAreaInsets();
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized) {
    return null; // Or a custom Loading/Splash view
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
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
        <Stack.Screen name="service-selection" options={{ headerShown: false }} />
        <Stack.Screen name="pickup-confirmation" options={{ headerShown: false }} />
        <Stack.Screen name="ride-searching" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant-menu" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant-details" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
      </Stack>
      {Platform.OS === "android" && insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: "#FFFFFF" }} />
      )}
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync("dark");
    }
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
