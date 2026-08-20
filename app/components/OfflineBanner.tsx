import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";

const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
const CHECK_INTERVAL_MS = 15000;
const PING_TIMEOUT_MS = 6000;

/**
 * There's no NetInfo (or any native connectivity module) installed in this
 * app, so this can't get an instant OS-level "you just went offline" event.
 * Instead it periodically pings the real version-check endpoint (the same
 * one already hit on launch) and shows the banner once that ping actually
 * fails — a real, if slightly delayed, reachability signal rather than a
 * fabricated always-on/always-off indicator.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const styles = useMemo(() => createStyles(tokens), [theme]);

  const [isOffline, setIsOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);

  const ping = async () => {
    if (!apiUrl) return;
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/version-check?platform=android&version=1.0.0`, { signal: controller.signal });
      if (!mounted.current) return;
      if (res.ok || res.status < 500) {
        setIsOffline(false);
        setLastOnlineAt(new Date());
      }
    } catch {
      if (mounted.current) setIsOffline(true);
    } finally {
      clearTimeout(timer);
      if (mounted.current) setChecking(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    ping();
    const interval = setInterval(ping, CHECK_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);

  if (!isOffline) return null;

  const minsAgo = lastOnlineAt ? Math.max(0, Math.round((Date.now() - lastOnlineAt.getTime()) / 60000)) : null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.toast}>
        <View style={styles.dot} />
        <Text style={styles.text} numberOfLines={1}>
          You're offline{minsAgo != null ? ` · last synced ${minsAgo}m ago` : ""}
        </Text>
        <TouchableOpacity onPress={ping} disabled={checking}>
          <Text style={styles.retry}>{checking ? "Checking…" : "Retry"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    wrap: { position: "absolute", left: 12, right: 12, zIndex: 999 },
    toast: {
      flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tokens.text, borderRadius: 12,
      paddingHorizontal: 13, paddingVertical: 11,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.warning, flexShrink: 0 },
    text: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12.5), color: tokens.bg },
    retry: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 0.6, textTransform: "uppercase", color: tokens.services.food.accent },
  });
