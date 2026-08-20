import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import * as Location from "expo-location";
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";

export default function AddAddressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const searchInputRef = useRef<TextInput>(null);

  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.delivery;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const { user, setUser } = useAuthStore();
  const isEditMode = !!(params.editId && String(params.editId).length > 0);

  const [selectedChip, setSelectedChip] = useState<"Home" | "Work" | "Other">("Home");
  const [label, setLabel] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [instructions, setInstructions] = useState("");

  const [phone, setPhone] = useState(String(params.phone || ""));
  const [receiverName, setReceiverName] = useState(String(params.receiverName || ""));
  const [shortAddress, setShortAddress] = useState("Select location");
  const [cityOrCountry, setCityOrCountry] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(params.step === "1" ? 1 : 2);
  const [region, setRegion] = useState({ latitude: 17.4447, longitude: 78.3498, latitudeDelta: 0.005, longitudeDelta: 0.005 });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const isMapReady = useRef(false);

  const fetchAddressForCoords = async (lat: number, lng: number) => {
    try {
      setIsResolvingAddress(true);
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const fullAddress = [place.name, place.streetNumber, place.street, place.city, place.region].filter(Boolean).join(", ");
        setAddressLine(fullAddress);
        setShortAddress(place.name || place.street || place.city || "Selected location");
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      const newRegion = { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      await fetchAddressForCoords(latitude, longitude);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.lat && params.lng) {
      const pLat = Number(params.lat);
      const pLng = Number(params.lng);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        setRegion({ latitude: pLat, longitude: pLng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
      }
    }

    if (isEditMode) {
      const lbl = String(params.label || "");
      if (lbl === "Home" || lbl === "Work") {
        setSelectedChip(lbl);
      } else {
        setSelectedChip("Other");
        setLabel(lbl);
      }

      const fullAddr = String(params.addressLine || "");
      const matchInst = fullAddr.match(/\(Instructions: (.*?)\)/);
      if (matchInst) setInstructions(matchInst[1]);
      const cleanedFromInst = fullAddr.replace(/\s*\(Instructions:.*?\)/, "").trim();

      const matchApt = cleanedFromInst.match(/\[Apt: (.*?)\]/);
      if (matchApt) {
        setCompleteAddress(matchApt[1]);
        setAddressLine(cleanedFromInst.replace(/\s*\[Apt:.*?\]/, "").trim());
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
      handleUseCurrentLocation();
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {}
    })();
  }, []);

  const onRegionChangeComplete = async (r: any) => {
    setRegion(r);
    setIsResolvingAddress(true);
    if (isEditMode && !isMapReady.current) {
      isMapReady.current = true;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        if (place) {
          setShortAddress(place.name || place.street || place.city || "Selected location");
          setCityOrCountry([place.city, place.region].filter(Boolean).join(", ") || "India");
        }
      } catch {} finally {
        setIsResolvingAddress(false);
      }
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
        const results = await customFetch<any[]>(`/api/v1/places/autocomplete?input=${encodeURIComponent(text)}${locQuery}`);
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
      const details = Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))
        ? { lat: Number(item.lat), lng: Number(item.lng) }
        : await customFetch<any>(`/api/v1/places/details/${item.id}`);
      const newRegion = { ...region, latitude: details.lat, longitude: details.lng };
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
      Alert.alert("Missing information", "Street address is required.");
      return;
    }
    try {
      setLoading(true);
      let finalAddress = addressLine.trim();
      if (completeAddress.trim()) finalAddress += ` [Apt: ${completeAddress.trim()}]`;
      if (instructions.trim()) finalAddress += ` (Instructions: ${instructions.trim()})`;
      const finalLabel = selectedChip === "Other" ? label.trim() || "Other" : selectedChip;
      const finalPhone = phone || user?.phone || "0000000000";
      const finalReceiver = receiverName || user?.name || "User";

      const payload = {
        label: finalLabel,
        addressLine: finalAddress,
        phone: finalPhone,
        receiverName: finalReceiver,
        coordinates: { lat: region.latitude, lng: region.longitude },
      };

      const updatedAddresses = isEditMode
        ? await customFetch<any[]>(`/api/v1/users/addresses/${params.editId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await customFetch<any[]>("/api/v1/users/addresses", { method: "POST", body: JSON.stringify(payload) });

      if (user) setUser({ ...user, addresses: updatedAddresses });
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      {step === 1 ? (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
          />

          <View style={[styles.searchRow, { top: insets.top + 10 }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
            </TouchableOpacity>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={tokens.sec} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search for a new area, locality…"
                placeholderTextColor={tokens.muted}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searching && <ActivityIndicator size="small" color={accent.accent} />}
            </View>
          </View>

          {searchResults.length > 0 && (
            <ScrollView style={[styles.searchResults, { top: insets.top + 62 }]} keyboardShouldPersistTaps="handled">
              {searchResults.map((item) => (
                <TouchableOpacity key={item.id} style={styles.searchResultRow} onPress={() => handleSelectSearchResult(item)}>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultAddr} numberOfLines={1}>{item.address}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.useCurrentWrap}>
            <TouchableOpacity style={styles.useCurrentBtn} onPress={handleUseCurrentLocation}>
              <Ionicons name="locate" size={15} color={accent.accent} />
              <Text style={styles.useCurrentText}>Use current location</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.centerMarker} pointerEvents="none">
            <View style={styles.dragHint}>
              {isResolvingAddress ? (
                <ActivityIndicator size="small" color={tokens.bg} />
              ) : (
                <Text style={styles.dragHintText}>Move the pin to adjust</Text>
              )}
            </View>
            <View style={styles.dragHintStem} />
            <View style={styles.pinHead}><View style={styles.pinDot} /></View>
            <View style={styles.pinStem} />
            <View style={styles.pinShadow} />
          </View>

          <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.addressCard}>
              <View style={styles.addressIcon}>
                {isResolvingAddress ? <ActivityIndicator size="small" color={accent.accent} /> : <Ionicons name="location" size={17} color={accent.accent} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.addressMain} numberOfLines={1}>{isResolvingAddress ? "Fetching location…" : shortAddress}</Text>
                <Text style={styles.addressSub} numberOfLines={1}>{isResolvingAddress ? "Updating address for pin…" : cityOrCountry}</Text>
              </View>
              <TouchableOpacity onPress={() => searchInputRef.current?.focus()}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.nextBtn, isResolvingAddress && { opacity: 0.6 }]} onPress={() => setStep(2)} disabled={isResolvingAddress}>
              <Text style={styles.nextBtnText}>Add more address details</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditMode ? "Edit address" : "Add address"}</Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.mapPreview} activeOpacity={0.9} onPress={() => setStep(1)}>
              <MapView provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT} style={StyleSheet.absoluteFill} region={region} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} />
              <View style={styles.mapPreviewPin}><Ionicons name="location" size={18} color="#fff" /></View>
              <View style={styles.mapPreviewPill}><Text style={styles.mapPreviewPillText} numberOfLines={1}>{isResolvingAddress ? "Confirming location…" : shortAddress || "Location confirmed"}</Text></View>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Save as</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["Home", "Work", "Other"] as const).map((chip) => {
                  const isActive = selectedChip === chip;
                  return (
                    <TouchableOpacity key={chip} style={[styles.chip, isActive && { backgroundColor: accent.skin, borderColor: accent.accent }]} onPress={() => setSelectedChip(chip)}>
                      <Text style={[styles.chipText, isActive && { color: accent.accent }]}>{chip}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedChip === "Other" && (
                <TextInput style={styles.customLabelInput} placeholder="Custom label (e.g. Friend's house)" placeholderTextColor={tokens.muted} value={label} onChangeText={setLabel} />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Street address</Text>
              <View style={styles.fieldRow}>
                <TextInput style={styles.fieldInput} placeholder="Street address" placeholderTextColor={tokens.muted} value={addressLine} onChangeText={setAddressLine} />
                <TouchableOpacity onPress={handleUseCurrentLocation}><Ionicons name="locate-outline" size={17} color={tokens.sec} /></TouchableOpacity>
              </View>
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Apartment / suite / floor · optional</Text>
              <View style={styles.fieldRow}>
                <TextInput style={styles.fieldInput} placeholder="Apartment / suite / floor" placeholderTextColor={tokens.muted} value={completeAddress} onChangeText={setCompleteAddress} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Delivery instructions</Text>
              <View style={styles.instructionsBox}>
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="Gate 2, ask the guard for tower B…"
                  placeholderTextColor={tokens.muted}
                  multiline
                  maxLength={200}
                  value={instructions}
                  onChangeText={setInstructions}
                />
              </View>
              <Text style={styles.charCounter}>{instructions.length} / 200</Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={accent.on} /> : <Text style={styles.saveBtnText}>{isEditMode ? "Update address" : "Save address"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["delivery"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },

    searchRow: { position: "absolute", left: 16, right: 16, zIndex: 10, flexDirection: "row", gap: 10 },
    searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, paddingHorizontal: 14, minHeight: moderateScale(40) },
    searchInput: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },
    searchResults: { position: "absolute", left: 66, right: 16, maxHeight: 250, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, zIndex: 9 },
    searchResultRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: tokens.border },
    searchResultName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.text },
    searchResultAddr: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(11), color: tokens.sec, marginTop: 2 },

    useCurrentWrap: { position: "absolute", left: 16, top: "40%" },
    useCurrentBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    useCurrentText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: accent.accent },

    centerMarker: { position: "absolute", top: "38%", left: "50%", marginLeft: -moderateScale(17), marginTop: -moderateScale(80), alignItems: "center" },
    dragHint: { backgroundColor: tokens.text, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7 },
    dragHintText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: tokens.bg },
    dragHintStem: { width: 2, height: 10, backgroundColor: tokens.text },
    pinHead: { width: moderateScale(34), height: moderateScale(34), borderRadius: moderateScale(17), backgroundColor: accent.accent, borderWidth: 3, borderColor: tokens.surface, alignItems: "center", justifyContent: "center" },
    pinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: accent.on },
    pinStem: { width: 2, height: 18, backgroundColor: accent.accent },
    pinShadow: { width: 12, height: 5, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.28)" },

    bottomCard: {
      position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: tokens.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderColor: tokens.border,
    },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: tokens.borderStrong, alignSelf: "center", marginBottom: 14 },
    addressCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 14, marginBottom: 14 },
    addressIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    addressMain: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    addressSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    changeLink: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), letterSpacing: 0.5, textTransform: "uppercase", color: accent.accent },
    nextBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    nextBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },

    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    mapPreview: { height: 160, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: tokens.border, marginHorizontal: 16, marginTop: 4, position: "relative" },
    mapPreviewPin: { position: "absolute", top: "50%", left: "50%", marginLeft: -18, marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: accent.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
    mapPreviewPill: { position: "absolute", bottom: 10, alignSelf: "center", backgroundColor: tokens.surface, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: tokens.border, maxWidth: "82%" },
    mapPreviewPillText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: tokens.text },

    section: { paddingHorizontal: 16, paddingTop: 20 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },
    chip: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, minHeight: moderateScale(44) },
    chipText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.sec },
    customLabelInput: {
      marginTop: 12, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 10, paddingHorizontal: 14, height: moderateScale(44),
      fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text, backgroundColor: tokens.surface,
    },
    fieldLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 6 },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1.5, borderBottomColor: tokens.borderStrong, paddingBottom: 8 },
    fieldInput: { flex: 1, fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    instructionsBox: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, padding: 13, minHeight: 72 },
    instructionsInput: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), color: tokens.text, minHeight: 44 },
    charCounter: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: tokens.muted, textAlign: "right", marginTop: 6 },

    footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.border, backgroundColor: tokens.surface },
    saveBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    saveBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  });
