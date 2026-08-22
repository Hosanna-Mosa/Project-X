import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { navigateToNotificationTarget } from "@/utils/deepLink";

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  category: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  order_status: "receipt",
  chat: "chatbubble-ellipses",
  system: "megaphone",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  if (d.toDateString() === now.toDateString()) return "Today";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      const data = await customFetch<NotificationItem[]>("/api/v1/notifications");
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchList();
    }, [])
  );

  const handleOpen = async (item: NotificationItem) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n)));
      customFetch(`/api/v1/notifications/${item._id}/read`, { method: "PATCH" }).catch(() => {});
    }
    navigateToNotificationTarget(item.data);
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await customFetch("/api/v1/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 24) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={32} color={tokens.muted} />
          <Text style={styles.emptyText}>Nothing here yet. Order and account updates will show up in this list.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.row, !item.isRead && { borderColor: accent.accent, backgroundColor: accent.skin }]} activeOpacity={0.8} onPress={() => handleOpen(item)}>
              <View style={[styles.rowIcon, { backgroundColor: item.isRead ? tokens.sunken : tokens.surface }]}>
                <Ionicons name={CATEGORY_ICON[item.category] || "notifications"} size={16} color={item.isRead ? tokens.sec : accent.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.rowTitle, !item.isRead && { fontFamily: fontFamilies.body.bold }]} numberOfLines={1}>{item.title}</Text>
                  {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: accent.accent }]} />}
                </View>
                <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.rowTime}>{formatWhen(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20), backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    markAllText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: accent.accent },

    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
    emptyText: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.sec, textAlign: "center", lineHeight: moderateScale(19) },

    row: { flexDirection: "row", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 13 },
    rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    rowTitle: { flex: 0, fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    unreadDot: { width: 6, height: 6, borderRadius: 3 },
    rowBody: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 3 },
    rowTime: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: tokens.muted, marginTop: 5 },
  });
