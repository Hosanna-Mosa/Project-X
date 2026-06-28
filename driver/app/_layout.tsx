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
import "@/utils/networkLogger";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const segments = useSegments();
  const token = useDriverStore((s) => s.token);
  const isAuthenticated = useDriverStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useDriverStore((s) => s.hasCompletedOnboarding);
  const refreshSession = useDriverStore((s) => s.refreshSession);
  const loginPromptShown = useRef(false);
  const [hydrated, setHydrated] = useState(
    () => useDriverStore.persist.hasHydrated?.() ?? false,
  );
  const [needsLoginPrompt, setNeedsLoginPrompt] = useState(false);

  useEffect(() => {
    const finishHydration = async () => {
      const state = useDriverStore.getState();
      if (state.isAuthenticated && state.token) {
        await state.refreshSession();
      } else if (state.isAuthenticated && !state.token) {
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

  useEffect(() => {
    if (!hydrated) return;

    const isLoggedIn = Boolean(isAuthenticated && token);
    const inAuth = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!isLoggedIn) {
      if (!inAuth) {
        router.replace("/auth");
      }
      if (needsLoginPrompt && !loginPromptShown.current) {
        loginPromptShown.current = true;
        Alert.alert("Login required", "Please sign in again to continue as a driver.");
        setNeedsLoginPrompt(false);
      }
      return;
    }

    if (hasCompletedOnboarding) {
      if (inAuth || inOnboarding) {
        router.replace("/(tabs)");
      }
      return;
    }

    if (!inOnboarding) {
      router.replace("/onboarding");
    }
  }, [hydrated, isAuthenticated, token, hasCompletedOnboarding, needsLoginPrompt, segments]);

  useEffect(() => {
    if (!hydrated || !token) return;

    refreshSession().then((valid) => {
      if (!valid) {
        setNeedsLoginPrompt(true);
        router.replace("/auth");
      }
    });
  }, [hydrated, token, refreshSession]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
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
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
