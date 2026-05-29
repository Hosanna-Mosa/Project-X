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
import { useThemeStore } from "@/contexts/themeStore";
import * as Location from "expo-location";
import { customFetch } from "@/utils/api/custom-fetch";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress?: (address: any) => void;
}

export function LocationPickerSheet({ isOpen, onClose, onSelectAddress }: Props) {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

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
      const data = (await customFetch("/api/v1/users/addresses")) as any;
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
        const results = await customFetch<any[]>(`/api/v1/places/autocomplete?input=${encodeURIComponent(text)}`);
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

  const handleUseCurrentLocation = () => {
    onClose();
    router.push("/delivery/add-address?step=1");
  };

  const handleSaveLocation = async () => {
    if (!detectedLocation) {
      Alert.alert("Error", "No location detected to save.");
      return;
    }
    
    try {
      setSavingLocation(true);
      console.log("Attempting to save location:", detectedLocation);
      
      const updatedData = await customFetch<any[]>("/api/v1/users/addresses", {
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






  const handleEditAddress = (item: any) => {
    onClose();
    const lat = item.location?.coordinates?.[1] ?? item.coordinates?.lat ?? "";
    const lng = item.location?.coordinates?.[0] ?? item.coordinates?.lng ?? "";
    const qs = `step=2&editId=${encodeURIComponent(item._id || '')}&label=${encodeURIComponent(item.label || '')}&addressLine=${encodeURIComponent(item.addressLine || '')}&phone=${encodeURIComponent(item.phone || '')}&receiverName=${encodeURIComponent(item.receiverName || '')}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
    router.push(`/delivery/add-address?${qs}`);
  };

  const renderAddressItem = ({ item }: { item: any }) => (
    <View style={styles.addressCard}>
      <TouchableOpacity 
        style={styles.addressMainTouchable}
        onPress={() => {
          const addressWithCoords = { ...item };
          if (!addressWithCoords.coordinates && item.location?.coordinates) {
            addressWithCoords.coordinates = {
              lng: item.location.coordinates[0],
              lat: item.location.coordinates[1],
            };
          }
          onSelectAddress?.(addressWithCoords);
          onClose();
        }}
      >
        <View style={styles.addressIconWrap}>
          <Feather 
            name={item.label === "Home" ? "home" : item.label === "Work" ? "briefcase" : "map-pin"} 
            size={20} 
            color="#06B6D4" 
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
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.editAddressBtn}
        onPress={() => handleEditAddress(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="edit-2" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={async () => {
        try {
          const details = await customFetch<any>(`/api/v1/places/details/${item.id}`);
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
      <Feather name="map-pin" size={16} color={colors.textMuted} />
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
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Select a location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchRow}>
            <Feather name="search" size={20} color="#06B6D4" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search for area, street name..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={handleSearch}
            />
            {searching && <ActivityIndicator size="small" color="#F87171" />}
          </View>

          {search.length > 2 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              style={styles.searchResultsContainer}
            />
          ) : (
            <View style={{ flexShrink: 1 }}>
              <TouchableOpacity style={styles.blinkitActionRow} onPress={handleUseCurrentLocation}>
                <View style={styles.actionIconLeft}>
                  <Feather name="crosshair" size={22} color="#06B6D4" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Use current location</Text>
                  <Text style={styles.actionSubtitle}>Using GPS</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#D1D5DB" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity 
                style={styles.blinkitActionRow}
                onPress={() => {
                  onClose();
                  router.push("/delivery/add-address?step=2");
                }}
              >
                <View style={styles.actionIconLeft}>
                  <Feather name="plus" size={22} color="#06B6D4" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Add new address</Text>
                  <Text style={styles.actionSubtitle}>Enter location details manually</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#D1D5DB" />
              </TouchableOpacity>

              <View style={styles.dividerFull} />

              {detectedLocation && (
                <View style={styles.detectedBox}>
                  <Text style={styles.detectedTitle}>Detected Location</Text>
                  <Text style={styles.addressText}>{detectedLocation.addressLine}</Text>
                  <TouchableOpacity 
                    style={[styles.saveActionBtn, savingLocation && { opacity: 0.7 }]}
                    onPress={handleSaveLocation}
                    disabled={savingLocation}
                  >
                    {savingLocation ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveActionText}>Save & Proceed</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.sectionText}>Saved Addresses</Text>

              {loading ? (
                <ActivityIndicator size="large" color="#E11D48" style={{ marginTop: 20 }} />
              ) : (
                <FlatList
                  data={savedAddresses}
                  renderItem={renderAddressItem}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No saved addresses found.</Text>
                  }
                  contentContainerStyle={{ paddingBottom: 24 }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  overlay: {
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: "flex-end", 
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.04 : 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  blinkitActionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionIconLeft: {
    width: 24,
    alignItems: "center",
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#06B6D4",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
  dividerFull: {
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressMainTouchable: {
    flexDirection: "row",
    flex: 1,
  },
  editAddressBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  addressIconWrap: {
    width: 24,
    alignItems: "center",
    marginRight: 16,
    marginTop: 2,
  },
  addressContent: {
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  addressType: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary, 
    lineHeight: 18,
  },
  addressPhone: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 20,
    fontSize: 14,
  },
  detectedBox: {
    backgroundColor: colors.surfaceSecondary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detectedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#BE123C",
    marginBottom: 8,
  },
  saveActionBtn: {
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  saveActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});


