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
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuthStore();
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
      {/* Header with Linear Gradient for Premium Look */}
      <LinearGradient 
        colors={["#1E293B", "#0F172A"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 10) }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My Profile</Text>
          {loading && <ActivityIndicator size="small" color="#38BDF8" />}
        </View>
        
        <View style={styles.profileSummary}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarMain}>
              {user?.profilePic ? (
                <Image source={{ uri: user.profilePic }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitial}>{user?.name?.charAt(0) || "U"}</Text>
              )}
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryMeta}>
            <Text style={styles.summaryName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.summarySub} numberOfLines={1} ellipsizeMode="tail">{user?.email || "No email added"}</Text>
          </View>
          
          <TouchableOpacity style={styles.editPill} onPress={() => setEditing(true)}>
            <Feather name="edit-2" size={14} color="#fff" />
            <Text style={styles.editPillText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <InfoItem icon="user" label="Username" value={user?.username || "@username"} />
            <InfoItem icon="mail" label="E-mail" value={user?.email || "Not set"} />
            <InfoItem icon="phone" label="Phone" value={user?.phone || "Not set"} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuList}>
            <MenuBtn 
                icon="map-pin" 
                label="Saved Addresses" 
                count={user?.addresses?.length} 
                onPress={() => router.push("/delivery/saved-addresses")} 
                color="#8B5CF6" 
            />
            <MenuBtn icon="bell" label="Notifications" onPress={() => {}} color="#F59E0B" />
            <MenuBtn icon="shield" label="Security" onPress={() => {}} color="#10B981" />
          </View>
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
                <Feather name="x" size={24} color={Colors.light.text} />
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

function InfoItem({ icon, label, value }: any) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={18} color={Colors.light.textSecondary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
      </View>
    </View>
  );
}

function MenuBtn({ icon, label, count, onPress, color }: any) {
  return (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress}>
      <View style={[styles.menuBtnIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={styles.menuBtnLabel}>{label}</Text>
      {count !== undefined && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{count}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    backgroundColor: "#1E293B", // Dark sleek slate
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    padding: 2,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  avatarMain: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#38BDF8",
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitial: { fontSize: 24, fontWeight: '800', color: '#fff' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.primary,
    padding: 6,
    borderTopLeftRadius: 10,
  },
  summaryMeta: { flex: 1, gap: 1, marginRight: 12 },
  summaryName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  summarySub: { fontSize: 11, color: '#94A3B8' },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  
  container: { padding: 20, gap: 24 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  infoItem: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  infoIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1E293B', flexShrink: 1 },
  
  menuList: { gap: 12 },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
  },
  menuBtnIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuBtnLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  menuBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  menuBadgeText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    marginTop: 10,
  },
  logoutText: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  version: { textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 10 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBody: { 
    backgroundColor: '#fff', 
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
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  modalScroll: { marginBottom: 20 },
  inputGroup: { gap: 8, marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginLeft: 4 },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0EA5E9',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnDisabled: { backgroundColor: '#94A3B8' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

