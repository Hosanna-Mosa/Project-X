import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialIcons, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuthStore();
  const { theme } = useThemeStore();
  
  // Brand colors matching DESIGN.md / constants/colors
  const colors = Colors[theme];

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);

  // Notifications Modal States
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [promoEnabled, setPromoEnabled] = useState(false);

  // Security Modal States
  const [securityVisible, setSecurityVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Edit States
  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any>("/api/v1/users/profile");
      if (data) {
        setUser(data);
        setFormData({
          name: data.name || "",
          username: data.username || "",
          email: data.email || "",
          phone: data.phone || "",
        });
      }

      // Fetch the real user orders to display the exact orders count
      try {
        const ordersData = await customFetch<any[]>("/api/v1/orders");
        if (ordersData && Array.isArray(ordersData)) {
          setOrdersCount(ordersData.length);
        }
      } catch (orderErr) {
        console.warn("Failed to fetch user orders count:", orderErr);
      }
    } catch (err: any) {
      console.error("Fetch profile error:", err);
      // If unauthorized, forbidden, or user not found, log out
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        await logout();
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('image', { uri, name: filename, type } as any);

      const data = await customFetch<any>("/api/v1/users/profile-pic", {
        method: "POST",
        body: formData,
        isFormData: true,
      });

      if (data && data.user) {
        setUser(data.user);
        Alert.alert("Success", "Profile picture updated!");
      }
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any>("/api/v1/users/profile", {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      if (data) {
        setUser(data);
        setEditing(false);
        Alert.alert("Success", "Profile updated successfully");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);
      const token = useAuthStore.getState().token;
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to change password");
      }
      Alert.alert("Success", "Password changed successfully!");
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

  // Name formatting helper for the split asymmetrical header layout
  const nameParts = (user?.name || "Alex Johnson").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            top: insets.top + 12,
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)");
        }}
        activeOpacity={0.85}
      >
        <Feather name="arrow-left" size={22} color={colors.primary} />
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Asymmetrical Header - Profile Info Section */}
        <View style={styles.asymmetricHeader}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarWrapper}>
            <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
              {user?.profilePic ? (
                <Image source={{ uri: user.profilePic }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{firstName.charAt(0) || "U"}</Text>
                </View>
              )}
            </View>
            <View style={[styles.cameraButton, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Feather name="edit-2" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.userInfoWrapper}>
            <Text style={[styles.userHeadline, { color: colors.primary }]}>
              {firstName}{lastName ? `\n${lastName}` : ""}
            </Text>
            <View style={styles.verifiedRow}>
              <MaterialIcons name="verified" size={14} color={colors.teal} />
              <Text style={[styles.verifiedText, { color: colors.teal }]}>Premium Member</Text>
            </View>
          </View>
        </View>

        {/* Dashboard 1x2 Neobrutalist Grid */}
        <View style={styles.neobrutalistGrid}>
          <View style={styles.neobrutalistRow}>
            {/* Total Orders Card */}
            <TouchableOpacity 
              style={[styles.neoCard, { shadowColor: colors.text }]} 
              activeOpacity={0.9}
              onPress={() => router.replace("/(tabs)/orders")}
            >
              <Feather name="folder" size={24} color={colors.teal} style={styles.neoCardIcon} />
              <View>
                <Text style={[styles.neoCardValue, { color: colors.primary }]}>{ordersCount}</Text>
                <Text style={[styles.neoCardLabel, { color: colors.textSecondary }]}>TOTAL ORDERS</Text>
              </View>
            </TouchableOpacity>

            {/* Saved Places Card */}
            <TouchableOpacity 
              style={[styles.neoCard, { shadowColor: colors.text }]} 
              activeOpacity={0.9}
              onPress={() => router.push("/delivery/saved-addresses")}
            >
              <Ionicons name="location-outline" size={26} color={colors.teal} style={styles.neoCardIcon} />
              <View>
                <Text style={[styles.neoCardValue, { color: colors.primary }]}>
                  {user?.addresses?.length || 0} Places
                </Text>
                <Text style={[styles.neoCardLabel, { color: colors.textSecondary }]}>SAVED PLACES</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Compact Grid Control Center */}
        <View style={styles.controlCenterSection}>
          <View style={styles.controlGrid}>
            <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => setEditing(true)}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="user" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Info</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => router.push("/delivery/saved-addresses")}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="map-pin" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Places</Text>
            </TouchableOpacity>

  

            <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => router.push("/support")}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="help-circle" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Support</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.controlGrid, { marginTop: 10 }]}>
          <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => router.push("/favorites")}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="heart" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Favorites</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => setNotificationsVisible(true)}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="bell" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => setSecurityVisible(true)}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="shield" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Security</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerActionsSection}>
          <TouchableOpacity 
            style={[styles.actionButtonOutline, { borderColor: colors.primary }]}
            onPress={() => Alert.alert("Share App", "Share SwiftRadius Delivery with your friends!")}
            activeOpacity={0.8}
          >
            <Feather name="share" size={16} color={colors.primary} />
            <Text style={[styles.actionButtonOutlineText, { color: colors.primary }]}>Invite Friends</Text>
          </TouchableOpacity>

          {!user ? (
            <TouchableOpacity 
              style={[styles.actionButtonSolid, { backgroundColor: colors.primary }]} 
              onPress={() => router.replace("/login")}
              activeOpacity={0.8}
            >
              <Feather name="log-in" size={16} color="#fff" />
              <Text style={styles.actionButtonSolidText}>Sign In / Register</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButtonError, { backgroundColor: `${colors.error}15` }]} 
              onPress={handleLogout} 
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={16} color={colors.error} />
              <Text style={[styles.actionButtonErrorText, { color: colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={[styles.version, { color: colors.textMuted }]}>App Version 1.2.0 • Build 240405</Text>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editing} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBody, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Personal Details</Text>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
                  value={formData.name}
                  onChangeText={v => setFormData({...formData, name: v})}
                  placeholder="Your display name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
                  value={formData.username}
                  onChangeText={v => setFormData({...formData, username: v})}
                  placeholder="@handle"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>E-mail Address</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
                  value={formData.email}
                  onChangeText={v => setFormData({...formData, email: v})}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
                  value={formData.phone}
                  onChangeText={v => setFormData({...formData, phone: v})}
                  placeholder="+1..."
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }, loading && styles.saveBtnDisabled]} 
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Profile</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Bottom Sheet */}
      <Modal visible={notificationsVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBody, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary }]}>Receive real-time alerts about order status and delivery updates</Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: "#CBD5E1", true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Email Notifications</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary }]}>Receive bills, receipts, and order summary emails</Text>
                </View>
                <Switch
                  value={emailEnabled}
                  onValueChange={setEmailEnabled}
                  trackColor={{ false: "#CBD5E1", true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>SMS Updates</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary }]}>Get SMS alerts when driver is arriving or for security codes</Text>
                </View>
                <Switch
                  value={smsEnabled}
                  onValueChange={setSmsEnabled}
                  trackColor={{ false: "#CBD5E1", true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Promotional Updates</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary }]}>Offers, discounts, and regional promotions</Text>
                </View>
                <Switch
                  value={promoEnabled}
                  onValueChange={setPromoEnabled}
                  trackColor={{ false: "#CBD5E1", true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
              onPress={() => {
                Alert.alert("Success", "Notification preferences saved!");
                setNotificationsVisible(false);
              }}
            >
              <Text style={styles.saveBtnText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Security Bottom Sheet */}
      <Modal visible={securityVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBody, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Change Password</Text>
              <TouchableOpacity onPress={() => {
                setSecurityVisible(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }, changingPassword && styles.saveBtnDisabled]} 
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  scrollContainer: { 
    paddingHorizontal: 24,
  },
  asymmetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    padding: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  avatarPlaceholder: {
    backgroundColor: '#0061a5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfoWrapper: {
    flex: 1,
  },
  userHeadline: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    lineHeight: 28,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  neobrutalistGrid: {
    marginBottom: 32,
    gap: 12,
  },
  neobrutalistRow: {
    flexDirection: 'row',
    gap: 12,
  },
  neoCard: {
    flex: 1,
    height: 96,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#191c1e',
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 8,
    // Neobrutalist shadow
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  neoCardIcon: {
    marginBottom: 4,
  },
  neoCardValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 20,
  },
  neoCardLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  controlCenterSection: {
    marginBottom: 32,
  },
  controlGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  softCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  softCardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softCardLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  footerActionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  actionButtonOutline: {
    width: '100%',
    height: 52,
    borderWidth: 2,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonOutlineText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionButtonSolid: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonSolidText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#ffffff',
  },
  actionButtonError: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonErrorText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  modalBody: { 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '90%',
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { 
    fontSize: 22, 
    fontFamily: 'Inter_700Bold',
  },
  modalScroll: { 
    marginBottom: 20,
  },
  inputGroup: { 
    gap: 8, 
    marginBottom: 20,
  },
  inputLabel: { 
    fontSize: 14, 
    fontFamily: 'Inter_600SemiBold', 
    marginLeft: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { 
    backgroundColor: '#74777f',
  },
  saveBtnText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontFamily: 'Inter_700Bold',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  settingSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 14,
  },
});
