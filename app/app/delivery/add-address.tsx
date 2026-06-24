import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import * as Location from "expo-location";
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, MapStyleElement } from "react-native-maps";

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
  secondaryContainer: "#d2e4ff",
  onSecondaryContainer: "#004578",
  error: "#ba1a1a",
  background: "#f7f9fb",
};

// Desaturated minimalist map style from MapBackground
const MAP_STYLE: MapStyleElement[] = [
  { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#7c93a3" }] },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#ffffff" }, { weight: 2 }, { gamma: 0.84 }],
  },
  { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "road.local", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
];

export default function AddAddressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const searchInputRef = useRef<TextInput>(null);

  const { user, setUser } = useAuthStore();
  const isEditMode = !!(params.editId && String(params.editId).length > 0);

  // Form States
  const [selectedChip, setSelectedChip] = useState<"Home" | "Work" | "Other">("Home");
  const [label, setLabel] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  
  // Internal helper states
  const [phone, setPhone] = useState(String(params.phone || ""));
  const [receiverName, setReceiverName] = useState(String(params.receiverName || ""));
  const [shortAddress, setShortAddress] = useState("Select location");
  const [cityOrCountry, setCityOrCountry] = useState("");
  const [loading, setLoading] = useState(false);

  // Step state (step 1 = interactive map picker, step 2 = details form)
  const [step, setStep] = useState(params.step === "1" ? 1 : 2);
  const [region, setRegion] = useState({
    latitude: 27.1751,
    longitude: 78.0421,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  // Autocomplete Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const isMapReady = useRef(false);

  // Pre-populate if in edit mode or coordinates are passed
  const fetchAddressForCoords = async (lat: number, lng: number) => {
    try {
      setIsResolvingAddress(true);
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const fullAddress = [place.name, place.streetNumber, place.street, place.city, place.region]
          .filter(Boolean)
          .join(", ");
        setAddressLine(fullAddress);
        setShortAddress(place.name || place.street || place.city || "Selected Location");
        setCityOrCountry([place.city, place.region].filter(Boolean).join(", ") || "India");
      }
    } catch (error) {
      console.log("Reverse geocode failed", error);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      await fetchAddressForCoords(latitude, longitude);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Pre-populate if in edit mode or coordinates are passed
  useEffect(() => {
    if (params.lat && params.lng) {
      const pLat = Number(params.lat);
      const pLng = Number(params.lng);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        setRegion({
          latitude: pLat,
          longitude: pLng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    }

    if (isEditMode) {
      // Pre-populate label chip
      const lbl = String(params.label || "");
      if (lbl === "Home" || lbl === "Work") {
        setSelectedChip(lbl);
      } else {
        setSelectedChip("Other");
        setLabel(lbl);
      }

      const fullAddr = String(params.addressLine || "");
      
      // 1. Extract Instructions
      const matchInst = fullAddr.match(/\(Instructions: (.*?)\)/);
      if (matchInst) {
        setInstructions(matchInst[1]);
      }
      const cleanedFromInst = fullAddr.replace(/\s*\(Instructions:.*?\)/, "").trim();

      // 2. Extract Apartment using robust [Apt: ...] pattern, fall back to comma splitting for backward compatibility
      const matchApt = cleanedFromInst.match(/\[Apt: (.*?)\]/);
      if (matchApt) {
        setCompleteAddress(matchApt[1]);
        const street = cleanedFromInst.replace(/\s*\[Apt:.*?\]/, "").trim();
        setAddressLine(street);
      } else {
        const commaIndex = cleanedFromInst.indexOf(",");
        if (commaIndex !== -1 && commaIndex < 15) {
          setCompleteAddress(cleanedFromInst.substring(0, commaIndex).trim());
          setAddressLine(cleanedFromInst.substring(commaIndex + 1).trim());
        } else {
          setAddressLine(cleanedFromInst);
        }
      }
    } else if (!params.lat) {
      // Locate user automatically on mount if creating a new address
      handleUseCurrentLocation();
    }
  }, []);

  useEffect(() => {
    // Quietly detect user coords for search prioritization
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (e) {}
    })();
  }, []);

  const onRegionChangeComplete = async (r: any) => {
    setRegion(r);
    // Ignore initial mount region change in edit mode so original address text is not overwritten
    if (isEditMode && !isMapReady.current) {
      isMapReady.current = true;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        if (place) {
          setShortAddress(place.name || place.street || place.city || "Selected Location");
          setCityOrCountry([place.city, place.region].filter(Boolean).join(", ") || "India");
        }
      } catch (e) {}
      return;
    }
    await fetchAddressForCoords(r.latitude, r.longitude);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      setSearching(true);
      try {
        const locQuery = userCoords ? `&lat=${userCoords.lat}&lng=${userCoords.lng}&radius=50000` : "";
        const results = await customFetch<any[]>(
          `/api/v1/places/autocomplete?input=${encodeURIComponent(text)}${locQuery}`
        );
        setSearchResults(results || []);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = async (item: any) => {
    try {
      const details = await customFetch<any>(`/api/v1/places/details/${item.id}`);
      const newRegion = {
        ...region,
        latitude: details.lat,
        longitude: details.lng,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setSearchQuery("");
      setSearchResults([]);
      await fetchAddressForCoords(details.lat, details.lng);
    } catch (error) {
      console.error("Select place error:", error);
    }
  };

  const handleSave = async () => {
    if (!addressLine.trim()) {
      Alert.alert("Missing information", "Street Address is required.");
      return;
    }

    try {
      setLoading(true);

      // Save Apartment details using structured [Apt: ...] pattern
      let finalAddress = addressLine.trim();
      if (completeAddress.trim()) {
        finalAddress += ` [Apt: ${completeAddress.trim()}]`;
      }

      // Append delivery instructions
      if (instructions.trim()) {
        finalAddress += ` (Instructions: ${instructions.trim()})`;
      }

      // Determine label
      const finalLabel = selectedChip === "Other" ? label.trim() || "Other" : selectedChip;

      // Fallback details from user profile
      const finalPhone = phone || user?.phone || "0000000000";
      const finalReceiver = receiverName || user?.name || "User";

      let updatedAddresses: any[];
      if (isEditMode) {
        // PATCH /api/v1/users/addresses/:id (Backend routes use PATCH for updating addresses)
        updatedAddresses = await customFetch<any[]>(`/api/v1/users/addresses/${params.editId}`, {
          method: "PATCH",
          body: JSON.stringify({
            label: finalLabel,
            addressLine: finalAddress,
            phone: finalPhone,
            receiverName: finalReceiver,
            coordinates: {
              lat: region.latitude,
              lng: region.longitude,
            },
          }),
        });
      } else {
        // POST /api/v1/users/addresses
        updatedAddresses = await customFetch<any[]>("/api/v1/users/addresses", {
          method: "POST",
          body: JSON.stringify({
            label: finalLabel,
            addressLine: finalAddress,
            phone: finalPhone,
            receiverName: finalReceiver,
            coordinates: {
              lat: region.latitude,
              lng: region.longitude,
            },
          }),
        });
      }

      if (user) {
        setUser({ ...user, addresses: updatedAddresses });
      }

      Alert.alert("Success", isEditMode ? "Address updated successfully!" : "Address saved successfully!");
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Centered Header matching screen.png */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => {
            step === 1 ? setStep(2) : router.back();
          }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {step === 1 ? "Confirm map pin location" : isEditMode ? "Edit Address" : "Add Address"}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {step === 1 ? (
        // STEP 1: Fullscreen Interactive Map Picker
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={false}
            customMapStyle={MAP_STYLE}
          />

          <View style={styles.searchOverlayWrapper}>
            <View style={styles.searchOverlay}>
              <Feather name="search" size={20} color={COLORS.outline} style={{ marginRight: 10 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search for a new area, locality..."
                placeholderTextColor={COLORS.onSurfaceVariant}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searching && <ActivityIndicator size="small" color={COLORS.secondary} />}
            </View>

            {searchResults.length > 0 && (
              <ScrollView style={styles.searchResultsBox} keyboardShouldPersistTaps="handled">
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchItemRow}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <Text style={styles.searchItemName}>{item.name}</Text>
                    <Text style={styles.searchItemAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Central Map Pin Marker */}
          <View style={styles.centerMarkerContainer} pointerEvents="none">
            <View style={styles.tooltipBubble}>
              <Text style={styles.tooltipText}>Move the pin to adjust your location</Text>
            </View>
            <View style={styles.tooltipTriangle} />
            <View style={styles.markerIcon}>
              <View style={styles.markerDot} />
            </View>
            <View style={styles.markerPin} />
            <View style={styles.markerShadow} />
          </View>

          <View style={styles.bottomOverlay}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity style={styles.useCurrentLocBtn} onPress={handleUseCurrentLocation}>
                <Feather name="crosshair" size={16} color={COLORS.primary} />
                <Text style={styles.useCurrentLocText}>Use current location</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.cardHeader}>Delivering your order to</Text>

              <View style={styles.addressSummaryBox}>
                <View style={styles.addressIconWrap}>
                  <Feather name="map-pin" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.addressTextWrap}>
                  <Text style={styles.shortAddress}>{shortAddress}</Text>
                  <Text style={styles.cityCountry}>{cityOrCountry}</Text>
                </View>
                <TouchableOpacity style={styles.changeBtn} onPress={() => searchInputRef.current?.focus()}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.stepOneNextBtn} onPress={() => setStep(2)}>
                <Text style={styles.stepOneNextBtnText}>Add more address details ▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // STEP 2: Redesigned Address Details Form
        <View style={styles.detailsContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.detailsScroll, { paddingBottom: insets.bottom + 120 }]}
          >
            {/* Map Preview Card (Tapping returns to Step 1 Map Picker) */}
            <TouchableOpacity
              style={styles.mapCard}
              activeOpacity={0.9}
              onPress={() => setStep(1)}
            >
              <MapView
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                style={StyleSheet.absoluteFill}
                region={region}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                customMapStyle={MAP_STYLE}
              />
              <View style={styles.mapCardPinContainer}>
                <View style={styles.mapCardPin}>
                  <Feather name="map-pin" size={20} color={COLORS.onPrimary} />
                </View>
              </View>
              <View style={styles.mapCardPill}>
                <Text style={styles.mapCardPillText} numberOfLines={1}>
                  {isResolvingAddress ? "Confirming Location..." : shortAddress || "Location Confirmed"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* SAVE AS SECTION */}
            <View style={styles.formSection}>
              <Text style={styles.sectionHeader}>SAVE AS</Text>
              <View style={styles.chipsRow}>
                {(["Home", "Work", "Other"] as const).map((chip) => {
                  const iconName = chip === "Home" ? "home" : chip === "Work" ? "briefcase" : "map-pin";
                  const isActive = selectedChip === chip;
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setSelectedChip(chip)}
                    >
                      <Feather
                        name={iconName}
                        size={16}
                        color={isActive ? COLORS.secondary : COLORS.onSurfaceVariant}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom label input if Other is selected */}
              {selectedChip === "Other" && (
                <TextInput
                  style={styles.customLabelInput}
                  placeholder="Specify Custom Label (e.g. Friend's House)"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  value={label}
                  onChangeText={setLabel}
                />
              )}
            </View>

            {/* INPUT FIELDS SECTION */}
            <View style={styles.formSection}>
              {/* Street Address Underline Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.underlineInput}
                    placeholder="Street Address"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                    value={addressLine}
                    onChangeText={setAddressLine}
                  />
                  <TouchableOpacity onPress={handleUseCurrentLocation} style={styles.inputIconBtn}>
                    <Feather name="crosshair" size={18} color={COLORS.outline} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Apartment details Underline Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.underlineInput}
                    placeholder="Apartment / Suite / Floor (Optional)"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                    value={completeAddress}
                    onChangeText={setCompleteAddress}
                  />
                </View>
              </View>
            </View>

            {/* DELIVERY INSTRUCTIONS SECTION */}
            <View style={styles.formSection}>
              <Text style={styles.sectionHeader}>DELIVERY INSTRUCTIONS</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  placeholder="e.g. Leave by the front gate, code is 1234..."
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  multiline
                  maxLength={200}
                  value={instructions}
                  onChangeText={setInstructions}
                />
                <Text style={styles.charCounter}>{instructions.length} / 200</Text>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Bottom Save Button */}
          <View style={[styles.fixedBottomBox, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>
                    {isEditMode ? "Update Address" : "Save Address"}
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={COLORS.primary}
                    style={{ marginLeft: 8 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
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
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  searchOverlayWrapper: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchOverlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchResultsBox: {
    backgroundColor: COLORS.surfaceContainerLowest,
    marginTop: 8,
    borderRadius: 8,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchItemRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.onSurface,
    marginBottom: 4,
  },
  searchItemAddress: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.onSurface,
  },
  centerMarkerContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -100 }, { translateY: -100 }],
    alignItems: "center",
    justifyContent: "center",
    width: 200,
    height: 200,
  },
  tooltipBubble: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tooltipText: {
    color: COLORS.onPrimary,
    fontSize: 10,
    fontWeight: "600",
  },
  tooltipTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.primary,
    marginBottom: 4,
  },
  markerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.onPrimary,
    zIndex: 2,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.onPrimary,
  },
  markerPin: {
    width: 4,
    height: 12,
    backgroundColor: COLORS.primary,
    marginTop: -2,
    zIndex: 1,
  },
  markerShadow: {
    width: 24,
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    opacity: 0.4,
    marginTop: -4,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  useCurrentLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  useCurrentLocText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 11,
  },
  bottomCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 10,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.onSurface,
    marginBottom: 16,
  },
  addressSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  addressIconWrap: {
    marginRight: 12,
  },
  addressTextWrap: {
    flex: 1,
  },
  shortAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.onSurface,
    marginBottom: 2,
  },
  cityCountry: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  changeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  changeBtnText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stepOneNextBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  stepOneNextBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailsScroll: {
    padding: 24,
  },
  mapCard: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    position: "relative",
    marginBottom: 24,
  },
  mapCardPinContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCardPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.onPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  mapCardPill: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: "80%",
  },
  mapCardPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    height: 48,
  },
  chipActive: {
    borderColor: COLORS.secondary,
    backgroundColor: "rgba(0, 97, 165, 0.08)",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.onSurfaceVariant,
  },
  chipTextActive: {
    color: COLORS.secondary,
    fontWeight: "700",
  },
  customLabelInput: {
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
    fontSize: 13,
    color: COLORS.onSurface,
    marginTop: 12,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  inputContainer: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.onSurfaceVariant,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  underlineInput: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.outlineVariant,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.onSurface,
    fontWeight: "600",
  },
  inputIconBtn: {
    position: "absolute",
    right: 0,
    padding: 6,
  },
  textAreaContainer: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: 12,
    height: 120,
    position: "relative",
  },
  textArea: {
    flex: 1,
    fontSize: 14,
    color: COLORS.onSurface,
    textAlignVertical: "top",
  },
  charCounter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    fontSize: 11,
    color: COLORS.outline,
    fontWeight: "500",
  },
  fixedBottomBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.background,
  },
  saveBtn: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: 12,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },
});
