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
import { moderateScale } from "react-native-size-matters";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { LinearGradient } from "expo-linear-gradient";

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
      {/* Header bar */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          }}
          style={styles.headerButton}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarOuterRing}>
            <View style={styles.avatarContainer}>
              {user?.profilePic ? (
                <Image source={{ uri: user.profilePic }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{firstName.charAt(0) || "D"}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.avatarTextContainer}>
            <Text style={styles.userName}>{user?.name || "Dhanush"}</Text>
            <View style={styles.premiumBadge}>
              <MaterialCommunityIcons name="rhombus-medium" size={12} color="#6366F1" />
              <Text style={styles.premiumText}>PREMIUM MEMBER</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => router.push("/(tabs)/orders")}>
            <View style={[styles.menuIconBg, { backgroundColor: '#F3E8FF' }]}>
              <Feather name="shopping-bag" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuTitle}>Orders</Text>
              <Text style={styles.menuSubtitle}>View your order history</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => setEditing(true)}>
            <View style={[styles.menuIconBg, { backgroundColor: '#F3E8FF' }]}>
              <Feather name="user" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuTitle}>Info</Text>
              <Text style={styles.menuSubtitle}>Manage your profile information</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => router.push("/delivery/saved-addresses")}>
            <View style={[styles.menuIconBg, { backgroundColor: '#F3E8FF' }]}>
              <Feather name="map-pin" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuTitle}>Places</Text>
              <Text style={styles.menuSubtitle}>Your saved addresses</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => router.push("/support")}>
            <View style={[styles.menuIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="headphones" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuTitle}>Support</Text>
              <Text style={styles.menuSubtitle}>Help & support centre</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => router.push("/favorites")}>
            <View style={[styles.menuIconBg, { backgroundColor: '#FCE7F3' }]}>
              <Feather name="heart" size={20} color="#EC4899" />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuTitle}>Favorites</Text>
              <Text style={styles.menuSubtitle}>Your favorite restaurants & items</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => setNotificationsVisible(true)}>
            <View style={[styles.menuIconBg, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="bell" size={20} color="#22C55E" />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Manage your notification preferences</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => setSecurityVisible(true)}>
            <View style={[styles.menuIconBg, { backgroundColor: '#E0F2FE' }]}>
              <Feather name="shield" size={20} color="#0EA5E9" />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuTitle}>Security</Text>
              <Text style={styles.menuSubtitle}>Privacy & account security</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <>
              <Feather name="log-out" size={20} color="#6366F1" />
              <View>
                <Text style={styles.signOutBtnTitle}>Sign Out</Text>
                <Text style={styles.signOutBtnSub}>You will be logged out from your account</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editing} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBody, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Personal Details</Text>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Feather name="x" size={moderateScale(24)} color={colors.text} />
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
                <Feather name="x" size={moderateScale(24)} color={colors.text} />
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
                <Feather name="x" size={moderateScale(24)} color={colors.text} />
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    zIndex: 20,
  },
  headerButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  scrollContainer: { 
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  avatarOuterRing: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 8,
    borderColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: moderateScale(84),
    height: moderateScale(84),
    borderRadius: moderateScale(42),
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: moderateScale(36),
    fontWeight: '700',
    color: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#111',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  premiumText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#6366F1',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    paddingVertical: 20,
    marginBottom: 24,
  },
  statsItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  statsDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
  },
  statsIconBg: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsTextContainer: {
    alignItems: 'flex-start',
  },
  statsNumber: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: '#111',
  },
  statsLabel: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuContainer: {
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconBg: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#111',
  },
  menuSubtitle: {
    fontSize: moderateScale(12),
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#D1D5DB', // Darkened so it's visible on the screen background
    marginLeft: 72,
    marginRight: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFAFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 16,
    gap: 16,
    marginBottom: 12,
  },
  signOutBtnTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#6366F1',
  },
  signOutBtnSub: {
    fontSize: moderateScale(11),
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
  },
  versionText: {
    fontSize: moderateScale(11),
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  modalBody: { 
    borderTopLeftRadius: moderateScale(32), 
    borderTopRightRadius: moderateScale(32), 
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
    fontSize: moderateScale(22), 
    fontWeight: '700',
  },
  modalScroll: { 
    marginBottom: 20,
  },
  inputGroup: { 
    gap: 8, 
    marginBottom: 20,
  },
  inputLabel: { 
    fontSize: moderateScale(14), 
    fontWeight: '600', 
    marginLeft: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: moderateScale(12),
    padding: 14,
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  saveBtn: {
    padding: 16,
    borderRadius: moderateScale(12),
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
    fontSize: moderateScale(16), 
    fontWeight: '700',
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
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSub: {
    fontSize: moderateScale(11),
    fontWeight: '400',
    lineHeight: moderateScale(14),
  },
});
