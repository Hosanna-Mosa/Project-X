import React, { useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useHomeStore } from "@/contexts/homeStore";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";

const RECENT_LOCATIONS_KEY = "recent_locations";

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  // Same reasoning as add-address.tsx: this screen only serves food/meat
  // delivery addresses today, so it should use the food accent rather than
  // the unrelated package-delivery service color.
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const { user, setUser } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [currentLocLoading, setCurrentLocLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
      loadRecentLocations();
    }, [])
  );

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any[]>("/api/v1/users/addresses");
      setAddresses(data || []);
      if (user) setUser({ ...user, addresses: data || [] });
    } catch (err) {
      console.error("Fetch addresses error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentLocations = async () => {
    try {
      setRecentLoading(true);
      const data = await customFetch<any[]>("/api/v1/users/recent-locations");
      if (Array.isArray(data) && data.length > 0) {
        setRecentLocations(data);
        await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(data));
        return;
      }
    } catch (err) {
      console.warn("Failed to fetch recent locations from server, trying cache:", err);
    }
    try {
      const stored = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentLocations(parsed);
      }
    } catch (err) {
      console.error("Failed to load recent locations from storage:", err);
    } finally {
      setRecentLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (currentLocLoading || selectingId) return;
    try {
      setCurrentLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Please enable location services to use current location.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const addressLine = place
        ? [place.name, place.streetNumber, place.street, place.city, place.region].filter(Boolean).join(", ")
        : "Current location";
      router.push({ pathname: "/delivery/add-address", params: { step: "2", addressLine, lat: String(loc.coords.latitude), lng: String(loc.coords.longitude) } });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to determine current location.");
    } finally {
      setCurrentLocLoading(false);
    }
  };

  const handleSelectRecentLocation = (item: any) => {
    if (selectingId || deletingId) return;
    const fullAddress = item.fullAddress || (item.name && item.address ? `${item.name}, ${item.address}` : item.address || item.name);
    router.push({ pathname: "/delivery/add-address", params: { step: "2", addressLine: fullAddress, lat: String(item.lat), lng: String(item.lng) } });
  };

  const handleSelectAddress = async (addr: any) => {
    if (selectingId || deletingId) return;
    const addressWithCoords = { ...addr };
    const lat = addr.coordinates?.lat ?? addr.location?.coordinates?.[1] ?? 17.4447;
    const lng = addr.coordinates?.lng ?? addr.location?.coordinates?.[0] ?? 78.3498;
    addressWithCoords.coordinates = { lat, lng };
    addressWithCoords.location = { type: "Point", coordinates: [lng, lat] };

    try {
      setSelectingId(addr._id);
      useDeliveryStore.getState().setCurrentCoords({ lat, lng });
      useDeliveryStore.getState().setCurrentLocation(addr.addressLine || addr.label || "");
      const activeService = useHomeStore.getState().activeService;
      await useHomeStore.getState().fetchHomeData(lat, lng, activeService);
      await AsyncStorage.setItem("active_address", JSON.stringify(addressWithCoords));
      router.back();
    } catch (e) {
      console.error("Failed to save active address:", e);
    } finally {
      setSelectingId(null);
    }
  };

  const handleEditAddress = (item: any) => {
    if (selectingId || deletingId) return;
    const lat = item.location?.coordinates?.[1] ?? item.coordinates?.lat ?? "";
    const lng = item.location?.coordinates?.[0] ?? item.coordinates?.lng ?? "";
    const qs = `editId=${encodeURIComponent(item._id || "")}&label=${encodeURIComponent(item.label || "")}&addressLine=${encodeURIComponent(item.addressLine || "")}&phone=${encodeURIComponent(item.phone || "")}&receiverName=${encodeURIComponent(item.receiverName || "")}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
    router.push(`/delivery/add-address?${qs}`);
  };

  const handleDeleteAddress = (id: string) => {
    if (selectingId || deletingId) return;
    Alert.alert("Delete address", "Are you sure you want to remove this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(id);
            const updatedAddresses = await customFetch<any[]>(`/api/v1/users/addresses/${id}`, { method: "DELETE" });
            setAddresses(updatedAddresses || []);
            if (user) setUser({ ...user, addresses: updatedAddresses || [] });
          } catch (err: any) {
            console.error("Delete error:", err);
            Alert.alert("Error", err.message || "Failed to delete address");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleMoreOptions = (addr: any) => {
    Alert.alert(addr.label || "Address", undefined, [
      { text: "Edit", onPress: () => handleEditAddress(addr) },
      { text: "Delete", style: "destructive", onPress: () => handleDeleteAddress(addr._id) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const parseInstructions = (addressLine: string) => {
    const match = addressLine?.match(/\(Instructions: (.*?)\)/);
    return match ? match[1] : null;
  };
  const stripMeta = (addressLine: string) => (addressLine || "").replace(/\s*\[Apt:.*?\]/, "").replace(/\s*\(Instructions:.*?\)/, "").trim();

  const isEmpty = !loading && addresses.length === 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} disabled={selectingId !== null}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Places</Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="location" size={moderateScale(28)} color={accent.accent} />
          </View>
          <Text style={styles.emptyTitle}>No saved places</Text>
          <Text style={styles.emptySubtitle}>
            Save the addresses you use often — home, work, your parents' place — and every flow in Flavour gets one tap shorter.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/delivery/add-address")}>
            <Text style={styles.primaryBtnText}>Add your first address</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleUseCurrentLocation} disabled={currentLocLoading}>
            {currentLocLoading ? <ActivityIndicator size="small" color={accent.accent} /> : <Text style={styles.secondaryBtnText}>Use current location</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={styles.section}>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/delivery/add-address")} disabled={selectingId !== null}>
              <Text style={styles.addBtnText}>+ Add new address</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.currentLocRow} onPress={handleUseCurrentLocation} disabled={selectingId !== null || currentLocLoading}>
              {currentLocLoading ? <ActivityIndicator size="small" color={accent.accent} /> : <Ionicons name="locate" size={15} color={accent.accent} />}
              <Text style={styles.currentLocText}>{currentLocLoading ? "Fetching location…" : "Use current location"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Saved</Text>
            {loading && addresses.length === 0 ? (
              <ActivityIndicator color={accent.accent} style={{ paddingVertical: 20 }} />
            ) : (
              <View style={styles.card}>
                {addresses.map((addr, idx) => {
                  const isSelecting = selectingId === addr._id;
                  const instructions = parseInstructions(addr.addressLine);
                  return (
                    <TouchableOpacity
                      key={addr._id}
                      style={[styles.addressRow, idx < addresses.length - 1 && styles.addressRowDivider, isSelecting && { opacity: 0.6 }]}
                      onPress={() => handleSelectAddress(addr)}
                      disabled={selectingId !== null}
                    >
                      <View style={[styles.avatar, addr.label === "Home" && { backgroundColor: accent.skin }]}>
                        {isSelecting ? <ActivityIndicator size="small" color={accent.accent} /> : <Text style={[styles.avatarText, addr.label === "Home" && { color: accent.accent }]}>{(addr.label || "?")[0].toUpperCase()}</Text>}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.addrLabel}>{addr.label}</Text>
                        <Text style={styles.addrLine} numberOfLines={1}>{stripMeta(addr.addressLine)}</Text>
                        {instructions && <Text style={styles.addrInstructions} numberOfLines={1}>{instructions}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => handleMoreOptions(addr)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={selectingId !== null || deletingId !== null}>
                        {deletingId === addr._id ? <ActivityIndicator size="small" color={tokens.error} /> : <Ionicons name="ellipsis-horizontal" size={18} color={tokens.muted} />}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {(recentLoading || recentLocations.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Recent</Text>
              {recentLoading && recentLocations.length === 0 ? (
                <ActivityIndicator color={accent.accent} style={{ paddingVertical: 16 }} />
              ) : (
                recentLocations.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={[styles.recentRow, idx < recentLocations.length - 1 && styles.recentRowDivider]}
                    onPress={() => handleSelectRecentLocation(item)}
                    disabled={selectingId !== null}
                  >
                    <View style={styles.recentIcon}><Ionicons name="time-outline" size={16} color={tokens.sec} /></View>
                    <Text style={styles.recentName} numberOfLines={1}>{item.name}{item.address ? `, ${item.address}` : ""}</Text>
                    <Text style={styles.recentSave}>Save</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["delivery"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 12 },

    addBtn: { backgroundColor: tokens.surface, borderWidth: 1, borderStyle: "dashed", borderColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    addBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: accent.accent },
    currentLocRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 12, paddingVertical: 6 },
    currentLocText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: accent.accent },

    card: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, overflow: "hidden" },
    addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
    addressRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.border },
    avatar: { width: 36, height: 36, borderRadius: 11, backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: tokens.sec },
    addrLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    addrLine: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 3 },
    addrInstructions: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(12), color: tokens.sec, marginTop: 5 },

    recentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, minHeight: 52 },
    recentRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.border },
    recentIcon: { width: 36, height: 36, borderRadius: 999, backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    recentName: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    recentSave: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: accent.accent },

    emptyWrap: { alignItems: "center", paddingTop: 76, paddingHorizontal: 32 },
    emptyIconCircle: { width: 76, height: 76, borderRadius: 24, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", marginBottom: 20 },
    emptyTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.2, color: tokens.text, textAlign: "center" },
    emptySubtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, textAlign: "center", marginTop: 10, marginBottom: 22 },
    primaryBtn: { width: "100%", backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    primaryBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    secondaryBtn: { width: "100%", marginTop: 10, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    secondaryBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: accent.accent },
  });
