import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
  const { user, logout, setUser } = useAuthStore();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [loading, setLoading] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [securityVisible, setSecurityVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      customFetch<{ unreadCount: number }>("/api/v1/notifications/unread-count")
        .then((res) => setUnreadCount(res?.unreadCount || 0))
        .catch(() => {});
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any>("/api/v1/users/profile");
      if (data) setUser(data);
      try {
        const ordersData = await customFetch<any[]>("/api/v1/orders");
        if (ordersData && Array.isArray(ordersData)) {
          setOrdersCount(ordersData.length);
          setTotalSpent(ordersData.reduce((sum, o) => sum + (o.totalPrice || 0), 0));
        }
      } catch (orderErr) {
        console.warn("Failed to fetch user orders:", orderErr);
      }
    } catch (err: any) {
      console.error("Fetch profile error:", err);
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        await logout();
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0].uri) uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      const fd = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : "image";
      fd.append("image", { uri, name: filename, type } as any);
      const data = await customFetch<any>("/api/v1/users/profile-pic", { method: "POST", body: fd, isFormData: true });
      if (data && data.user) setUser(data.user);
    } catch (err) {
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing fields", "All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak password", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Doesn't match", "Passwords do not match");
      return;
    }
    try {
      setChangingPassword(true);
      const token = useAuthStore.getState().token;
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to change password");
      Alert.alert("Success", "Password changed successfully.");
      setSecurityVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const memberSinceYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;

  const MENU_ITEMS = [
    { key: "orders", icon: "receipt", label: "My orders", onPress: () => router.push("/(tabs)/orders") },
    { key: "personal", icon: "person-circle", label: "Personal details", onPress: () => router.push("/personal-details") },
    { key: "places", icon: "location", label: "Places", badge: user?.addresses?.length ? String(user.addresses.length) : undefined, onPress: () => router.push("/delivery/saved-addresses") },
    { key: "favorites", icon: "heart", label: "Favorites", badge: user?.favorites?.length ? String(user.favorites.length) : undefined, onPress: () => router.push("/favorites") },
    { key: "notifications", icon: "notifications", label: "Notifications", countBadge: unreadCount > 0 ? unreadCount : undefined, onPress: () => router.push("/notifications") },
    { key: "security", icon: "shield-checkmark", label: "Security", onPress: () => setSecurityVisible(true) },
    { key: "support", icon: "mail", label: "Help & support", onPress: () => router.push("/support") },
  ] as const;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.85}>
            {user?.profilePic ? (
              <Image source={{ uri: user.profilePic }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{(user?.name || "U").charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name || "Your name"}</Text>
            <Text style={styles.profilePhone}>{user?.phone || ""}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{ordersCount}</Text>
            <Text style={styles.statLabel}>orders</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>₹{totalSpent >= 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : Math.round(totalSpent)}</Text>
            <Text style={styles.statLabel}>spent</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{memberSinceYear || "—"}</Text>
            <Text style={styles.statLabel}>member since</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuRow, idx < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.key === "orders" ? accent.skin : tokens.sunken }]}>
                <Ionicons name={item.icon as any} size={17} color={item.key === "orders" ? accent.accent : tokens.sec} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {"badge" in item && item.badge && <Text style={styles.menuBadgeText}>{item.badge}</Text>}
              {"countBadge" in item && item.countBadge ? (
                <View style={styles.menuCountBadge}>
                  <Text style={styles.menuCountBadgeText}>{item.countBadge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={tokens.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator size="small" color={tokens.error} /> : <Text style={styles.signOutBtnText}>Sign out</Text>}
        </TouchableOpacity>
      </ScrollView>

      <AppTabBar active="account" />

      {/* Security modal */}
      <Modal visible={securityVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change password</Text>
              <TouchableOpacity onPress={() => { setSecurityVisible(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                <Ionicons name="close" size={moderateScale(22)} color={tokens.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginBottom: 16 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current password</Text>
                <TextInput style={styles.textInput} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Enter current password" placeholderTextColor={tokens.muted} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New password</Text>
                <TextInput style={styles.textInput} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 6 characters" placeholderTextColor={tokens.muted} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm new password</Text>
                <TextInput style={styles.textInput} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Confirm new password" placeholderTextColor={tokens.muted} />
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, { opacity: changingPassword ? 0.7 : 1 }]} onPress={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? <ActivityIndicator color={accent.on} /> : <Text style={styles.saveBtnText}>Update password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
    backBtn: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20), backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },

    profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 20, padding: 18, marginTop: 12 },
    avatar: { width: 64, height: 64, borderRadius: 999 },
    avatarPlaceholder: { width: 64, height: 64, borderRadius: 999, backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    avatarInitial: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), color: tokens.sec },
    profileName: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.3, color: tokens.text },
    profilePhone: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 4 },

    statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
    statTile: { flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
    statValue: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(19), letterSpacing: -0.3, color: tokens.text },
    statLabel: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

    menuCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, overflow: "hidden", marginTop: 20 },
    menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 56 },
    menuIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    menuLabel: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    menuBadgeText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
    menuCountBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: tokens.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    menuCountBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), color: "#fff" },

    signOutBtn: { marginTop: 14, borderWidth: 1, borderColor: tokens.error, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    signOutBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.error },

    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    modalBody: { backgroundColor: tokens.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "88%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
    modalTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(20), color: tokens.text },
    inputGroup: { gap: 8, marginBottom: 18 },
    inputLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    textInput: { borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, minHeight: 48, paddingHorizontal: 14, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    saveBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    saveBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  });
