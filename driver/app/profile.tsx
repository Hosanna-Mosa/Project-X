import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";

const MENU_ITEMS = [
  {
    section: "Account",
    items: [
      { icon: "user" as const, label: "Personal Info", color: Colors.primary },
      {
        icon: "credit-card" as const,
        label: "Payment Details",
        color: "#8B5CF6",
      },
      {
        icon: "file-text" as const,
        label: "Documents",
        color: Colors.warning,
      },
    ],
  },
  {
    section: "Vehicle",
    items: [
      { icon: "truck" as const, label: "Vehicle Info", color: Colors.primary },
      {
        icon: "shield" as const,
        label: "Insurance",
        color: Colors.success,
      },
    ],
  },
  {
    section: "Support",
    items: [
      {
        icon: "help-circle" as const,
        label: "Help Center",
        color: Colors.primary,
      },
      {
        icon: "message-circle" as const,
        label: "Contact Support",
        color: "#8B5CF6",
      },
    ],
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { driverName, driverPhone, earnings, logout, isOnline } =
    useDriverStore();

  const handleLogout = () => {
    Alert.alert("Go Offline & Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
          router.replace("/auth");
        },
      },
    ]);
  };

  const initials = driverName
    ? driverName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "DR";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Profile</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{driverName || "Driver"}</Text>
          <Text style={styles.profilePhone}>{driverPhone || "+91 XXXXX XXXXX"}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isOnline
                  ? Colors.successLight
                  : Colors.surfaceAlt,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.success : Colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isOnline ? Colors.success : Colors.textMuted },
              ]}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{earnings.totalDeliveries}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4.9</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>98%</Text>
          <Text style={styles.statLabel}>Acceptance</Text>
        </View>
      </View>

      <View style={styles.earningsSummary}>
        <View style={styles.earningsItem}>
          <Feather name="dollar-sign" size={18} color={Colors.primary} />
          <Text style={styles.earningsItemLabel}>Today's Earnings</Text>
          <Text style={styles.earningsItemValue}>₹{earnings.today}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.earningsItem}>
          <Feather name="calendar" size={18} color={Colors.primary} />
          <Text style={styles.earningsItemLabel}>This Week</Text>
          <Text style={styles.earningsItemValue}>₹{earnings.week}</Text>
        </View>
      </View>

      {MENU_ITEMS.map((section) => (
        <View key={section.section} style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>{section.section}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, idx) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    Haptics.selectionAsync();
                  }}
                >
                  <View
                    style={[
                      styles.menuIcon,
                      { backgroundColor: item.color + "18" },
                    ]}
                  >
                    <Feather name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
                {idx < section.items.length - 1 && (
                  <View style={styles.menuDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Feather name="log-out" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>DeliverPro Driver v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  earningsSummary: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  earningsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  earningsItemLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
  },
  earningsItemValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.primary + "22",
  },
  menuSection: {
    gap: 10,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.errorLight,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  logoutText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.error,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },
});
