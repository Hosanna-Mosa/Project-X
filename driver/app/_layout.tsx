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
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDriverStore } from "@/store/driverStore";
import { LocationHandler } from "@/components/LocationHandler";
import { GlobalSocketHandler } from "@/components/GlobalSocketHandler";
import UpdateModal from "@/components/UpdateModal";
import Constants from "expo-constants";
import { Platform } from "react-native";
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
          setStoreUrl(result.url || (platform === "ios" ? "https://apps.apple.com" : "https://play.google.com"));
          setForceUpdate(result.forceUpdate);
          setShowUpdate(true);
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
                onDismiss={() => setShowUpdate(false)} 
              />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
