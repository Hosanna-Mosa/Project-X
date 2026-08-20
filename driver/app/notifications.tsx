import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";
import { navigateToNotificationTarget } from "@/utils/deepLink";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

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

const CATEGORY_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  order_status: "package",
  chat: "message-circle",
  system: "bell",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  if (d.toDateString() === now.toDateString()) return "Today";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function DriverNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useDriverStore();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchList = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/notifications`, { headers: authHeaders() });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchList();
    }, [])
  );

  const handleOpen = async (item: NotificationItem) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n)));
      fetch(`${apiUrl}/api/v1/notifications/${item._id}/read`, { method: "PATCH", headers: authHeaders() }).catch(() => {});
    }
    navigateToNotificationTarget(item.data);
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(`${apiUrl}/api/v1/notifications/read-all`, { method: "PATCH", headers: authHeaders() });
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
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
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bell-off" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Nothing here yet. Job and account updates will show up in this list.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.row, !item.isRead && styles.rowUnread]} activeOpacity={0.8} onPress={() => handleOpen(item)}>
              <View style={[styles.rowIcon, { backgroundColor: item.isRead ? Colors.surfaceAlt : Colors.primaryLight }]}>
                <Feather name={CATEGORY_ICON[item.category] || "bell"} size={16} color={item.isRead ? Colors.textSecondary : Colors.primaryDark} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]} numberOfLines={1}>{item.title}</Text>
                  {!item.isRead && <View style={styles.unreadDot} />}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: Colors.text },
  markAllText: { fontSize: 13, fontWeight: "600", color: Colors.primary },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 19 },

  row: { flexDirection: "row", gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 13 },
  rowUnread: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowTitle: { flex: 0, fontSize: 14, fontWeight: "600", color: Colors.text },
  rowTitleUnread: { fontWeight: "700" },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  rowBody: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary, marginTop: 3 },
  rowTime: { fontSize: 11, fontWeight: "500", color: Colors.textMuted, marginTop: 5 },
});
