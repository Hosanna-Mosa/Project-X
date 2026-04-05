import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import * as Location from "expo-location";
import { customFetch } from "@/utils/api/custom-fetch";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress?: (address: any) => void;
}

export function LocationPickerSheet({ isOpen, onClose, onSelectAddress }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSavedAddresses();
    }
  }, [isOpen]);

  const fetchSavedAddresses = async () => {
    try {
      setLoading(true);
      const data = (await customFetch("/api/users/addresses")) as any;
      console.log("Raw addresses from server:", data);
      if (Array.isArray(data)) {
        const validAddresses = data.filter(
          (addr: any) => addr && (addr.addressLine || addr.formattedAddress) && addr.label
        );
        console.log("Filtered valid addresses:", validAddresses);
        setSavedAddresses(validAddresses);
      } else {
        setSavedAddresses([]);
      }
    } catch (error) {
      console.error("Fetch addresses error:", error);
      setSavedAddresses([]);
    } finally {
      setLoading(false);
    }
  };


  const [locationLoading, setLocationLoading] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<any | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);


  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length > 2) {
      setSearching(true);
      try {
        const results = await customFetch<any[]>(`/api/places/autocomplete?input=${encodeURIComponent(text)}`);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setDetectedLocation(null);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Allow location access to use this feature.");
        return;
      }

      console.log("Fetching current position...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // Increased for better accuracy
      });
      const { latitude, longitude } = location.coords;
      console.log(`Current coords: ${latitude}, ${longitude}`);
      
      const response = (await customFetch(`/api/places/reverse-geocode?lat=${latitude}&lng=${longitude}`)) as any[];
      console.log("Raw response from geocode:", JSON.stringify(response[0], null, 2));
      
      if (response && response.length > 0) {
        // Fallback chain for address property
        const addressLine = response[0].address || response[0].formatted_address || "Unnamed location";
        console.log("Resolved address line:", addressLine);
        
        setDetectedLocation({
          addressLine: addressLine,
          coordinates: { lat: latitude, lng: longitude },
          label: "Current Location",
          phone: "0000000000"
        });
      } else {
        console.warn("No geocoding results found for these coordinates.");
        Alert.alert("Location Found", "We found your coordinates, but couldn't get a clear address. Please use 'Add new address' to pick manually.");
      }
    } catch (error: any) {
      console.error("Location detection failed:", error);
      Alert.alert("Error", error.message || "Could not get your location. Please ensure GPS is enabled.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!detectedLocation) {
      Alert.alert("Error", "No location detected to save.");
      return;
    }
    
    try {
      setSavingLocation(true);
      console.log("Attempting to save location:", detectedLocation);
      
      const updatedData = await customFetch<any[]>("/api/users/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: detectedLocation.label,
          addressLine: detectedLocation.addressLine,
          phone: detectedLocation.phone,
          coordinates: detectedLocation.coordinates,
        }),
      });
      
      console.log("Save successful. Updated list:", updatedData);
      
      if (Array.isArray(updatedData)) {
        const valid = updatedData.filter(a => a && a.addressLine && a.label);
        setSavedAddresses(valid);
      } else {
        await fetchSavedAddresses();
      }
      
      Alert.alert("Saved!", "Your current location has been added to saved addresses.");
      onSelectAddress?.(detectedLocation);
      setDetectedLocation(null);
      onClose();
    } catch (error: any) {
      console.error("Save location error:", error);
      Alert.alert("Save Failed", error.message || "An error occurred while saving the address.");
    } finally {
      setSavingLocation(false);
    }
  };






  const renderAddressItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.addressCard}
      onPress={() => {
        onSelectAddress?.(item);
        onClose();
      }}
    >
      <View style={styles.addressMain}>
        <View style={styles.addressIconWrap}>
          <Feather 
            name={item.label === "Home" ? "home" : item.label === "Work" ? "briefcase" : "map-pin"} 
            size={20} 
            color="#F59E0B" 
          />
        </View>
        <View style={styles.addressContent}>
          <View style={styles.addressTitleRow}>
            <Text style={styles.addressType}>{item.label}</Text>
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {item.addressLine}
          </Text>
          {item.phone && <Text style={styles.addressPhone}>Phone: {item.phone}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={async () => {
        try {
          const details = await customFetch<any>(`/api/places/details/${item.id}`);
          onSelectAddress?.({
            addressLine: item.address,
            coordinates: { lat: details.lat, lng: details.lng },
            label: item.name,
          });
          onClose();
        } catch (error) {
          console.error("Select place error:", error);
        }
      }}
    >
      <Feather name="map-pin" size={16} color={Colors.light.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultAddress} numberOfLines={1}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <View style={styles.sheet}>
          <TouchableOpacity 
            style={styles.floatingCloseBtn}
            onPress={onClose}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.title}>Select delivery location</Text>
          
          <View style={styles.searchRow}>
            <Feather name="search" size={18} color={Colors.light.textMuted} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search for area, street name..."
              placeholderTextColor={Colors.light.textMuted}
              value={search}
              onChangeText={handleSearch}
            />
            {searching && <ActivityIndicator size="small" color={Colors.light.tint} />}
          </View>

          {search.length > 2 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              style={styles.searchResultsContainer}
            />
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.quickActionBox}>
                <TouchableOpacity style={styles.actionRow} onPress={handleUseCurrentLocation} disabled={locationLoading}>
                  <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                    {locationLoading ? (
                      <ActivityIndicator size="small" color="#166534" />
                    ) : (
                      <FontAwesome5 name="crosshairs" size={16} color="#166534" />
                    )}
                  </View>
                  <Text style={[styles.actionText, { color: '#166534' }]}>
                    {locationLoading ? "Finding location..." : "Use current location"}
                  </Text>
                  {!locationLoading && <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />}
                </TouchableOpacity>

                
                <View style={styles.divider} />

                <TouchableOpacity 
                  style={styles.actionRow}
                  onPress={() => {
                    onClose();
                    router.push("/delivery/add-address");
                  }}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Feather name="plus" size={18} color="#166534" />
                  </View>
                  <Text style={[styles.actionText, { color: '#166534' }]}>Add new address</Text>
                  <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
                </TouchableOpacity>
              </View>

              {detectedLocation && (
                <View style={styles.detectedBox}>
                  <View style={styles.addressMain}>
                    <View style={styles.addressIconWrap}>
                      <FontAwesome5 name="map-marker-alt" size={20} color="#059669" />
                    </View>
                    <View style={styles.addressContent}>
                      <Text style={styles.detectedTitle}>Detected Location</Text>
                      <Text style={styles.addressText}>{detectedLocation.addressLine}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.saveActionBtn, savingLocation && { opacity: 0.7 }]}
                    onPress={handleSaveLocation}
                    disabled={savingLocation}
                  >
                    {savingLocation ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="save" size={16} color="#FFFFFF" />
                        <Text style={styles.saveActionText}>Save to profile</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.sectionHeader}>

                <Text style={styles.sectionText}>Your saved addresses</Text>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginTop: 20 }} />
              ) : (
                <FlatList
                  data={savedAddresses}
                  renderItem={renderAddressItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No saved addresses found.</Text>
                  }
                  contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1, // Full screen for Modal
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: "flex-end", // Align sheet to bottom
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingBottom: 50,
    gap: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 30,
  },
  floatingCloseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -68,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  quickActionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 74,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    padding: 16, // Reduced from 20
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  addressMain: {
    flexDirection: "row",
    gap: 14, // Reduced from 18
  },
  addressIconWrap: {
    width: 40, // Reduced from 48
    height: 40, // Reduced from 48
    borderRadius: 12, // Reduced from 16
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  addressContent: {
    flex: 1,
    gap: 2, // Reduced from 6
  },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressType: {
    fontSize: 16, // Reduced from 18
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  addressDistance: {
    fontSize: 10, // Reduced from 12
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  addressText: {
    fontSize: 13, // Reduced from 14
    color: "#64748B", 
    lineHeight: 18,
    fontWeight: "500",
  },
  addressPhone: {
    fontSize: 12, // Reduced from 13
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "600",
  },
  addressActions: {
    flexDirection: "row",
    gap: 10, // Reduced from 14
    marginTop: 8, // Reduced from 12
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  searchResultsContainer: {
    flex: 1,
    marginTop: 8,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  searchResultAddress: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 40,
    fontSize: 14,
    fontWeight: "600",
  },
  detectedBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#10B98120",
    gap: 16,
    marginTop: -4,
  },
  detectedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  saveActionBtn: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  saveActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});


