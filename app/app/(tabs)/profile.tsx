import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          } 
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 0) }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || "U"}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || "User Name"}</Text>
            <Text style={styles.userPhone}>{user?.phone || "+1 234 567 8900"}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#F0FDFA" }]}>
              <Feather name="user" size={20} color="#0EA5E9" />
            </View>
            <Text style={styles.menuText}>Personal Details</Text>
            <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#FDF4FF" }]}>
              <Feather name="map-pin" size={20} color="#D946EF" />
            </View>
            <Text style={styles.menuText}>Saved Addresses</Text>
            <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>GENERAL</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#FFF7ED" }]}>
              <Feather name="bell" size={20} color="#F97316" />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
            <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#F1F5F9" }]}>
              <Feather name="shield" size={20} color="#64748B" />
            </View>
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: Colors.light.text },
  container: { padding: 24, gap: 24, paddingBottom: 120 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
  userInfo: { gap: 4 },
  userName: { fontSize: 20, fontWeight: "700", color: Colors.light.text },
  userPhone: { fontSize: 14, color: Colors.light.textSecondary, fontWeight: "500" },
  menuSection: { gap: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: Colors.light.textMuted, letterSpacing: 1, marginLeft: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1, fontSize: 16, fontWeight: "600", color: Colors.light.text },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    marginTop: 12,
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#EF4444" },
  version: { textAlign: "center", color: Colors.light.textMuted, fontSize: 12, marginTop: 10 },
});
