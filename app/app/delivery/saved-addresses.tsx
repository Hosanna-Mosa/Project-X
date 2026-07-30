import React, { useEffect, useState, useCallback } from "react";
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
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useHomeStore } from "@/contexts/homeStore";

// Brand Colors matching DESIGN.md
const COLORS = {
  surface: "#f7f9fb",
  surfaceDim: "#d8dadc",
  surfaceBright: "#f7f9fb",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  surfaceContainerHigh: "#e6e8ea",
  surfaceContainerHighest: "#e0e3e5",
  onSurface: "#191c1e",
  onSurfaceVariant: "#43474e",
  inverseSurface: "#2d3133",
  inverseOnSurface: "#eff1f3",
  outline: "#74777f",
  outlineVariant: "#c4c6cf",
  primary: "#002045", // Deep Sea Dark Blue
  onPrimary: "#ffffff",
  primaryContainer: "#1b365c",
  secondary: "#0061a5", // Action Blue
  onSecondary: "#ffffff",
  secondaryContainer: "#d2e4ff", // Soft Blue for icons
  onSecondaryContainer: "#004578",
  error: "#ba1a1a",
  background: "#f7f9fb",
};

const RECENT_LOCATIONS_KEY = "recent_locations";

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Recent Locations
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

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
        if (Array.isArray(parsed)) {
          setRecentLocations(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load recent locations from storage:", err);
    } finally {
      setRecentLoading(false);
    }
  };

  const [currentLocLoading, setCurrentLocLoading] = useState(false);

  const handleUseCurrentLocation = async () => {
    if (currentLocLoading || selectingId) return;
    try {
      setCurrentLocLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please enable location services to use current location.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      let addressLine = "";
      if (place) {
        addressLine = [place.name, place.streetNumber, place.street, place.city, place.region]
          .filter(Boolean)
          .join(", ");
      } else {
        addressLine = "Current Location";
      }

      router.push({
        pathname: "/delivery/add-address",
        params: {
          step: "2",
          addressLine,
          lat: String(loc.coords.latitude),
          lng: String(loc.coords.longitude),
        },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to determine current location.");
    } finally {
      setCurrentLocLoading(false);
    }
  };

  const handleSelectRecentLocation = (item: any) => {
    if (selectingId || deletingId) return;
    const fullAddress = item.fullAddress || (item.name && item.address ? `${item.name}, ${item.address}` : item.address || item.name);
    router.push({
      pathname: "/delivery/add-address",
      params: {
        step: "2",
        addressLine: fullAddress,
        lat: String(item.lat),
        lng: String(item.lng),
      },
    });
  };

  const handleSelectAddress = async (addr: any) => {
    if (selectingId || deletingId) return;
    
    const addressWithCoords = { ...addr };
    const lat = addr.coordinates?.lat ?? addr.location?.coordinates?.[1] ?? 17.4447;
    const lng = addr.coordinates?.lng ?? addr.location?.coordinates?.[0] ?? 78.3498;
    
    addressWithCoords.coordinates = { lat, lng };
    addressWithCoords.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
    
    try {
      setSelectingId(addr._id);
      
      // Update global coords and address in deliveryStore
      useDeliveryStore.getState().setCurrentCoords({ lat, lng });
      useDeliveryStore.getState().setCurrentLocation(addr.addressLine || addr.label || "");

      // Get active service from homeStore
      const activeService = useHomeStore.getState().activeService;

      // Trigger the background fetches and await them to complete!
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
    Alert.alert("Delete Address", "Are you sure you want to remove this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(id);
            const updatedAddresses = await customFetch<any[]>(`/api/v1/users/addresses/${id}`, {
              method: "DELETE",
            });
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      {/* Header matching screen.png */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={selectingId !== null}>
          <Feather name="arrow-left" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Select Address</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}
      >
          {/* Current Location GPS Button */}
          <TouchableOpacity
            style={[styles.currentLocRow, currentLocLoading && { opacity: 0.8 }]}
            onPress={handleUseCurrentLocation}
            disabled={selectingId !== null || currentLocLoading}
          >
            <View style={styles.currentLocIconBox}>
              {currentLocLoading ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <Feather name="navigation" size={20} color={COLORS.onPrimary} />
              )}
            </View>
            <View style={styles.currentLocTextCol}>
              <Text style={styles.currentLocTitle}>
                {currentLocLoading ? "Fetching Location..." : "Current Location"}
              </Text>
              <Text style={styles.currentLocSubtitle}>
                {currentLocLoading ? "Finding your GPS coordinates..." : "Using GPS to find your location"}
              </Text>
            </View>
            {currentLocLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Feather name="chevron-right" size={20} color={COLORS.outline} />
            )}
          </TouchableOpacity>

          {/* Saved Addresses Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
          </View>

          {loading && addresses.length === 0 ? (
            <ActivityIndicator color={COLORS.secondary} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={styles.cardList}>
              {addresses.length === 0 ? (
                <View style={styles.emptySectionCard}>
                  <Text style={styles.emptyText}>No saved addresses yet</Text>
                </View>
              ) : (
                addresses.map((addr) => {
                  const isSelecting = selectingId === addr._id;
                  return (
                    <View key={addr._id} style={[styles.addressCard, isSelecting && { opacity: 0.6 }]}>
                      <TouchableOpacity
                        style={styles.addressCardTouchable}
                        onPress={() => handleSelectAddress(addr)}
                        activeOpacity={0.7}
                        disabled={selectingId !== null}
                      >
                        <View style={styles.addressIconBox}>
                          {isSelecting ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                          ) : (
                            <Feather
                              name={
                                addr.label?.toLowerCase() === "home"
                                  ? "home"
                                  : addr.label?.toLowerCase() === "office" || addr.label?.toLowerCase() === "work"
                                  ? "briefcase"
                                  : "map-pin"
                              }
                              size={20}
                              color={COLORS.primary}
                            />
                          )}
                        </View>
                        <View style={styles.addressInfo}>
                          <Text style={styles.addressLabel}>{addr.label}</Text>
                          <Text style={styles.addressLine} numberOfLines={1}>
                            {addr.addressLine}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.addressActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditAddress(addr)} disabled={selectingId !== null || deletingId !== null}>
                          <Feather name="edit-2" size={16} color={COLORS.outline} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteAddress(addr._id)} disabled={selectingId !== null || deletingId !== null}>
                          {deletingId === addr._id ? (
                            <ActivityIndicator size="small" color={COLORS.error} />
                          ) : (
                            <Feather name="trash-2" size={16} color={COLORS.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Recent Locations Section */}
          <Text style={styles.sectionTitle}>Recent Locations</Text>
          {recentLoading && recentLocations.length === 0 ? (
            <ActivityIndicator color={COLORS.secondary} style={{ paddingVertical: 16 }} />
          ) : recentLocations.length === 0 ? (
            <View style={styles.emptySectionCard}>
              <Text style={styles.emptyText}>No recent locations found</Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recentLocations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentRow}
                  onPress={() => handleSelectRecentLocation(item)}
                  disabled={selectingId !== null}
                >
                  <View style={styles.recentIconBox}>
                    <Feather name="clock" size={18} color={COLORS.onSurfaceVariant} />
                  </View>
                  <View style={styles.recentTextCol}>
                    <Text style={styles.recentName}>{item.name}</Text>
                    <Text style={styles.recentAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
      </ScrollView>

      {/* Sticky Bottom Add Address Button */}
      <View style={[styles.footer, { paddingBottom: 12 }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/delivery/add-address")}
          disabled={selectingId !== null}
        >
          <Feather name="plus" size={18} color={COLORS.onPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 4,
    width: 32,
    alignItems: "flex-start",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.onSurface,
  },
  headerSpacer: {
    width: 32,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  currentLocRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  currentLocIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  currentLocTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  currentLocSubtitle: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.onSurface,
    marginTop: 10,
    marginBottom: 6,
  },
  cardList: {
    gap: 8,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  addressCardTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  addressIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  addressInfo: {
    flex: 1,
    marginLeft: 14,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.onSurface,
  },
  addressLine: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  addressActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySectionCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 24,
    alignItems: "center",
  },
  recentList: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    overflow: "hidden",
    marginBottom: 10,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  recentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  recentTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.onSurface,
  },
  recentAddress: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    marginTop: 1,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "500",
  },
});
