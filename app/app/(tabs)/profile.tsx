import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
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
    } catch (err) {
      console.error("Fetch profile error:", err);
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

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
          await logout();
          router.replace("/");
      }},
    ]);
  };

  // Name formatting helper for the split asymmetrical header layout
  const nameParts = (user?.name || "Alex Johnson").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top App Bar - Matching code.html */}
      <View style={[styles.appBar, { paddingTop: insets.top, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={styles.barButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          }}
        >
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.appBarTitle, { color: colors.primary }]}>Account</Text>
        <TouchableOpacity
          style={styles.barButton}
          onPress={() => Alert.alert("Settings", "Settings screen coming soon!")}
        >
          <Feather name="settings" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 40 }]}
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

        {/* Dashboard 2x2 Neobrutalist Grid */}
        <View style={styles.neobrutalistGrid}>
          <View style={styles.neobrutalistRow}>
            {/* Total Orders Card */}
            <TouchableOpacity 
              style={[styles.neoCard, { shadowColor: colors.text }]} 
              activeOpacity={0.9}
              onPress={() => router.push("/(tabs)/orders")}
            >
              <Feather name="folder" size={24} color={colors.teal} style={styles.neoCardIcon} />
              <View>
                <Text style={[styles.neoCardValue, { color: colors.primary }]}>24</Text>
                <Text style={[styles.neoCardLabel, { color: colors.textSecondary }]}>TOTAL ORDERS</Text>
              </View>
            </TouchableOpacity>

            {/* Wallet Card */}
            <TouchableOpacity 
              style={[styles.neoCard, { shadowColor: colors.text }]} 
              activeOpacity={0.9}
              onPress={() => router.push("/delivery/wallet" as any)}
            >
              <MaterialCommunityIcons name="wallet-outline" size={26} color={colors.teal} style={styles.neoCardIcon} />
              <View>
                <Text style={[styles.neoCardValue, { color: colors.primary }]}>$45.00</Text>
                <Text style={[styles.neoCardLabel, { color: colors.textSecondary }]}>WALLET BALANCE</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.neobrutalistRow}>
            {/* Favourites Card */}
            <TouchableOpacity 
              style={[styles.neoCard, { shadowColor: colors.text }]} 
              activeOpacity={0.9}
              onPress={() => Alert.alert("Favourites", "Your Favourites list")}
            >
              <Ionicons name="heart-outline" size={26} color={colors.teal} style={styles.neoCardIcon} />
              <View>
                <Text style={[styles.neoCardValue, { color: colors.primary }]}>8 Items</Text>
                <Text style={[styles.neoCardLabel, { color: colors.textSecondary }]}>FAVOURITES</Text>
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
                  {user?.addresses?.length || 3} Places
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
              onPress={() => Alert.alert("Support", "How can we help you today?")}
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
              onPress={() => Alert.alert("Favorites", "Manage your favorite items.")}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="heart" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => Alert.alert("Notifications", "Notification Settings")}
            >
              <View style={[styles.softCardIconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="bell" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.softCardLabel, { color: colors.text }]}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.softCard, { borderColor: colors.borderLight }]}
              onPress={() => Alert.alert("Security", "Account security options")}
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
              onPress={() => router.replace("/")}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
  },
  appBar: {
    height: Platform.OS === 'ios' ? 96 : 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    backgroundColor: '#ffffff',
  },
  appBarTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  barButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: { 
    paddingHorizontal: 24,
    paddingTop: 24,
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
});
