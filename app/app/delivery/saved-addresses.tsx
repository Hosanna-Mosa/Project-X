import React, { useEffect, useState, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";

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

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Recent Locations
  const [recentLocations, setRecentLocations] = useState<any[]>([
    { id: "mock-1", name: "Coffee Collective", address: "42 Market Street, San Francisco", lat: 37.7939, lng: -122.3965 },
    { id: "mock-2", name: "Equinox Gym", address: "747 Howard St, San Francisco", lat: 37.7849, lng: -122.4019 },
  ]);

  // Map States
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    fetchAddresses();
    loadRecentLocations();
    detectUserCoords();
  }, []);

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
      const stored = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          setRecentLocations(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load recent locations:", err);
    }
  };

  const detectUserCoords = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch (e) {
      console.warn("Could not determine user location dynamically:", e);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 2) {
      setSearching(true);
      try {
        const url = `/api/v1/places/autocomplete?input=${encodeURIComponent(text)}${
          userCoords ? `&lat=${userCoords.latitude}&lng=${userCoords.longitude}` : ""
        }`;
        const results = await customFetch<any[]>(url);
        setSearchResults(results || []);
      } catch (error) {
        console.error("Autocomplete search error:", error);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = async (item: any) => {
    try {
      setSearching(true);
      const details = await customFetch<any>(`/api/v1/places/details/${item.id}`);
      setSearchQuery("");
      setSearchResults([]);

      // Save to Recents
      const newRecentItem = {
        id: item.id || String(Date.now()),
        name: item.name || item.description?.split(",")[0] || "Searched Area",
        address: item.address || item.description || "",
        lat: details.lat,
        lng: details.lng,
      };

      const updatedRecents = [newRecentItem, ...recentLocations.filter((r) => r.address !== newRecentItem.address)].slice(0, 5);
      setRecentLocations(updatedRecents);
      await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updatedRecents));

      router.push({
        pathname: "/delivery/add-address",
        params: {
          step: "2",
          addressLine: newRecentItem.address,
          lat: String(details.lat),
          lng: String(details.lng),
        },
      });
    } catch (err) {
      console.error("Failed to resolve place details:", err);
      Alert.alert("Error", "Failed to load address details.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRecentLocation = (item: any) => {
    router.push({
      pathname: "/delivery/add-address",
      params: {
        step: "2",
        addressLine: item.address,
        lat: String(item.lat),
        lng: String(item.lng),
      },
    });
  };

  const handleSelectAddress = async (addr: any) => {
    const addressWithCoords = { ...addr };
    const lat = addr.coordinates?.lat ?? addr.location?.coordinates?.[1] ?? 17.4447;
    const lng = addr.coordinates?.lng ?? addr.location?.coordinates?.[0] ?? 78.3498;
    
    addressWithCoords.coordinates = { lat, lng };
    addressWithCoords.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
    
    try {
      await AsyncStorage.setItem("active_address", JSON.stringify(addressWithCoords));
      router.back();
    } catch (e) {
      console.error("Failed to save active address:", e);
    }
  };

  const handleEditAddress = (item: any) => {
    const lat = item.location?.coordinates?.[1] ?? item.coordinates?.lat ?? "";
    const lng = item.location?.coordinates?.[0] ?? item.coordinates?.lng ?? "";
    const qs = `editId=${encodeURIComponent(item._id || "")}&label=${encodeURIComponent(item.label || "")}&addressLine=${encodeURIComponent(item.addressLine || "")}&phone=${encodeURIComponent(item.phone || "")}&receiverName=${encodeURIComponent(item.receiverName || "")}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
    router.push(`/delivery/add-address?${qs}`);
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert("Delete Address", "Are you sure you want to remove this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const updatedAddresses = await customFetch<any[]>(`/api/v1/users/addresses/${id}`, {
              method: "DELETE",
            });
            setAddresses(updatedAddresses || []);
            if (user) setUser({ ...user, addresses: updatedAddresses || [] });
          } catch (err: any) {
            console.error("Delete error:", err);
            Alert.alert("Error", err.message || "Failed to delete address");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };



  const isSearchingActive = searchQuery.length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      {/* Header matching screen.png */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Select Address</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Persistent Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="map-pin" size={20} color={COLORS.secondary} style={styles.searchBarIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for area, street or landmark"
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity onPress={handleUseCurrentLocation} style={styles.gpsIconBtn}>
            <Feather name="crosshair" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isSearchingActive ? (
        // Autocomplete Search Results Screen
        <View style={styles.searchResultsContainer}>
          {searching && <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 16 }} />}
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchResults.length === 0 && !searching ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No matches found</Text>
              </View>
            ) : (
              searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchItem}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <View style={styles.searchItemIconBox}>
                    <Feather name="map-pin" size={18} color={COLORS.secondary} />
                  </View>
                  <View style={styles.searchItemContent}>
                    <Text style={styles.searchItemName} numberOfLines={1}>
                      {item.name || item.description?.split(",")[0]}
                    </Text>
                    <Text style={styles.searchItemAddress} numberOfLines={1}>
                      {item.address || item.description}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={COLORS.outline} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        // Default Redesigned Content
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
        >
          {/* Current Location GPS Button */}
          <TouchableOpacity style={styles.currentLocRow} onPress={handleUseCurrentLocation}>
            <View style={styles.currentLocIconBox}>
              <Feather name="navigation" size={20} color={COLORS.onPrimary} />
            </View>
            <View style={styles.currentLocTextCol}>
              <Text style={styles.currentLocTitle}>Current Location</Text>
              <Text style={styles.currentLocSubtitle}>Using GPS to find your location</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.outline} />
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
                addresses.map((addr) => (
                  <View key={addr._id} style={styles.addressCard}>
                    <TouchableOpacity
                      style={styles.addressCardTouchable}
                      onPress={() => handleSelectAddress(addr)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addressIconBox}>
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
                      </View>
                      <View style={styles.addressInfo}>
                        <Text style={styles.addressLabel}>{addr.label}</Text>
                        <Text style={styles.addressLine} numberOfLines={1}>
                          {addr.addressLine}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.addressActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditAddress(addr)}>
                        <Feather name="edit-2" size={16} color={COLORS.outline} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteAddress(addr._id)}>
                        <Feather name="trash-2" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Recent Locations Section */}
          <Text style={styles.sectionTitle}>Recent Locations</Text>
          <View style={styles.recentList}>
            {recentLocations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentRow}
                onPress={() => handleSelectRecentLocation(item)}
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
        </ScrollView>
      )}

      {/* Sticky Bottom Add Address Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "ios" ? 10 : 16) }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/delivery/add-address")}
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
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.onSurface,
  },
  headerSpacer: {
    width: 32,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 46,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchBarIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.onSurface,
    fontWeight: "500",
  },
  gpsIconBtn: {
    padding: 6,
    marginLeft: 8,
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
  searchResultsContainer: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: 24,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "500",
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  searchItemContent: {
    flex: 1,
    marginLeft: 14,
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.onSurface,
  },
  searchItemAddress: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
});
