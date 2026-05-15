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
import { Feather, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors, theme), [theme]);

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
      const data = await customFetch<any>("/api/users/profile");
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

      const data = await customFetch<any>("/api/users/profile-pic", {
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
      const data = await customFetch<any>("/api/users/profile", {
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

  return (
    <View style={styles.root}>
      {/* Header - Matching Image 1 */}
      <LinearGradient 
        colors={theme === 'dark' ? ["#0F172A", "#1E293B"] : ["#1E293B", "#0F172A"]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>My Profile</Text>
          {loading && <ActivityIndicator size="small" color="#fff" />}
        </View>
        
        <View style={styles.profileInfoRow}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarContainer}>
            {user?.profilePic ? (
              <Image source={{ uri: user.profilePic }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{user?.name?.charAt(0) || "U"}</Text>
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Feather name="camera" size={10} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.userNameContainer}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || "User Name"}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email || "No email added"}</Text>
          </View>
          
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Feather name="edit-2" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Grid Section - Matching Image 2 */}
        <View style={styles.gridContainer}>
          <GridItem 
            icon={<Ionicons name="heart-outline" size={24} color={colors.text} />} 
            label="Favourites" 
            onPress={() => {}} 
            colors={colors}
          />
          <GridItem 
            icon={<MaterialCommunityIcons name="wallet-outline" size={24} color={colors.text} />} 
            label="Wallet" 
            onPress={() => router.push("/delivery/wallet")} 
            colors={colors}
          />
          <GridItem 
            icon={<MaterialCommunityIcons name="file-document-outline" size={24} color={colors.text} />} 
            label="Orders" 
            onPress={() => router.push("/orders")} 
            colors={colors}
          />
        </View>

        {/* ACCOUNT INFORMATION - Matching Image 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT INFORMATION</Text>
          <View style={styles.infoCard}>
            <InfoItem 
              icon={<Feather name="user" size={20} color={colors.textSecondary} />} 
              label="USERNAME" 
              value={user?.username || "sunand"} 
              colors={colors}
            />
            <View style={styles.separator} />
            <InfoItem 
              icon={<Feather name="mail" size={20} color={colors.textSecondary} />} 
              label="E-MAIL" 
              value={user?.email || "vema...nd@gmail.com"} 
              colors={colors}
            />
            <View style={styles.separator} />
            <InfoItem 
              icon={<Feather name="phone" size={20} color={colors.textSecondary} />} 
              label="PHONE" 
              value={user?.phone || "9704726252"} 
              colors={colors}
            />
          </View>
        </View>

        {/* PREFERENCES - Matching Image 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <MenuButton 
            icon={<Ionicons name="location-outline" size={22} color="#8B5CF6" />} 
            label="Saved Addresses" 
            count={user?.addresses?.length || 1}
            onPress={() => router.push("/delivery/saved-addresses")}
            colors={colors}
            iconBg="#F5F3FF"
          />
          <MenuButton 
            icon={<Ionicons name="notifications-outline" size={22} color="#F59E0B" />} 
            label="Notifications" 
            onPress={() => {}}
            colors={colors}
            iconBg="#FFFBEB"
          />
          <MenuButton 
            icon={<Ionicons name="shield-checkmark-outline" size={22} color="#10B981" />} 
            label="Security" 
            onPress={() => {}}
            colors={colors}
            iconBg="#F0FDF4"
          />
        </View>

        {/* MORE OPTIONS - Matching Image 2 */}
        <View style={[styles.section, { marginTop: 10 }]}>
          <ListItem 
            icon={<Feather name="users" size={20} color={colors.text} />} 
            title="Family and teenagers" 
            subtitle="Teenager and adult accounts"
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="list" size={20} color={colors.text} />} 
            title="Lists" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<MaterialCommunityIcons name="car-outline" size={20} color={colors.text} />} 
            title="Rides" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="tag" size={20} color={colors.text} />} 
            title="Promotions" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="gift" size={20} color={colors.text} />} 
            title="Send a gift" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="help-circle" size={20} color={colors.text} />} 
            title="Help" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="mic" size={20} color={colors.text} />} 
            title="Voice settings" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="user-check" size={20} color={colors.text} />} 
            title="Manager account" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="info" size={20} color={colors.text} />} 
            title="About" 
            onPress={() => {}}
            colors={colors}
          />
          <ListItem 
            icon={<Feather name="share-2" size={20} color={colors.text} />} 
            title="Invite friends" 
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.version}>App Version 1.2.0 • Build 240405</Text>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Details</Text>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput 
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={v => setFormData({...formData, name: v})}
                  placeholder="Your display name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput 
                  style={styles.textInput}
                  value={formData.username}
                  onChangeText={v => setFormData({...formData, username: v})}
                  placeholder="@handle"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-mail Address</Text>
                <TextInput 
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={v => setFormData({...formData, email: v})}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput 
                  style={styles.textInput}
                  value={formData.phone}
                  onChangeText={v => setFormData({...formData, phone: v})}
                  placeholder="+1..."
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
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

function GridItem({ icon, label, onPress, colors }: any) {
  return (
    <TouchableOpacity style={[stylesGrid.gridItem, { backgroundColor: colors.surfaceSecondary }]} onPress={onPress}>
      <View style={stylesGrid.gridIcon}>{icon}</View>
      <Text style={[stylesGrid.gridLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoItem({ icon, label, value, colors }: any) {
  return (
    <View style={stylesInfo.infoItem}>
      <View style={[stylesInfo.infoIconContainer, { backgroundColor: colors.surfaceSecondary }]}>
        {icon}
      </View>
      <View style={stylesInfo.infoContent}>
        <Text style={[stylesInfo.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[stylesInfo.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function MenuButton({ icon, label, count, onPress, colors, iconBg }: any) {
  return (
    <TouchableOpacity style={[stylesMenu.menuButton, { backgroundColor: colors.surface }]} onPress={onPress}>
      <View style={[stylesMenu.iconContainer, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={[stylesMenu.label, { color: colors.text }]}>{label}</Text>
      <View style={stylesMenu.rightContainer}>
        {count !== undefined && (
          <View style={[stylesMenu.badge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[stylesMenu.badgeText, { color: colors.text }]}>{count}</Text>
          </View>
        )}
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function ListItem({ icon, title, subtitle, onPress, colors }: any) {
  return (
    <TouchableOpacity style={stylesList.listItem} onPress={onPress}>
      <View style={stylesList.listIcon}>{icon}</View>
      <View style={stylesList.listContent}>
        <Text style={[stylesList.listTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[stylesList.listSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const stylesGrid = StyleSheet.create({
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  gridIcon: { marginBottom: 10 },
  gridLabel: { fontSize: 13, fontWeight: '600' },
});

const stylesInfo = StyleSheet.create({
  infoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600' },
});

const stylesMenu = StyleSheet.create({
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  rightContainer: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginRight: 10 },
  badgeText: { fontSize: 13, fontWeight: '700' },
});

const stylesList = StyleSheet.create({
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 0 },
  listIcon: { width: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  listContent: { flex: 1 },
  listTitle: { fontSize: 17, fontWeight: '500' },
  listSubtitle: { fontSize: 14, marginTop: 4 },
});

const createStyles = (colors: typeof Colors.light, theme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 25,
    paddingBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarPlaceholder: {
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  userNameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  
  container: { padding: 20 },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginHorizontal: -8,
  },
  section: { marginBottom: 25 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 15,
    marginLeft: 5,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 10,
  },
  
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.error },
  version: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBody: { 
    backgroundColor: colors.surface, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  modalScroll: { marginBottom: 20 },
  inputGroup: { gap: 8, marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginLeft: 4 },
  textInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnDisabled: { backgroundColor: colors.textSecondary },
  saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '800' },
});

