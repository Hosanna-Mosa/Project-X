import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";
import { router } from "expo-router";
import { useDeliveryStore, DeliveryItem } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (meters: number) => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`);

export default function AddStopScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.delivery;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [address, setAddress] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [storeName, setStoreName] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [nearbySuggestions, setNearbySuggestions] = useState<any[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewDelta, setPreviewDelta] = useState<{ distanceKm: number; newTotal: number } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { addStop, currentCoords, stops, route, price } = useDeliveryStore();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentCoords) fetchNearbySuggestions(currentCoords.lat, currentCoords.lng);
  }, [currentCoords]);

  const fetchNearbySuggestions = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/places/nearby?lat=${lat}&lng=${lng}&radius=3000`);
      const data = await response.json();
      if (Array.isArray(data)) setNearbySuggestions(data.slice(0, 6));
    } catch (error) {
      console.error("Error fetching nearby suggestions:", error);
    }
  };

  const fetchAutocompleteSuggestions = useCallback((input: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!input.trim() || input.length < 2) {
      setAutocompleteSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const latParam = currentCoords ? `&lat=${currentCoords.lat}&lng=${currentCoords.lng}` : "";
        const response = await fetch(`${BACKEND_URL}/api/v1/places/autocomplete?input=${encodeURIComponent(input)}${latParam}&radius=10000`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setAutocompleteSuggestions(data.slice(0, 6));
          setShowDropdown(data.length > 0);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, [currentCoords]);

  const handleAddressInput = (text: string) => {
    setAddressInput(text);
    if (address && text !== address) { setAddress(""); setCoords(undefined); }
    fetchAutocompleteSuggestions(text);
  };

  const handleSelectSuggestion = async (item: any) => {
    const displayAddress = item.address || item.description || item.name;
    setAddress(displayAddress);
    setAddressInput(displayAddress);
    if (item.lat && item.lng) {
      setCoords({ lat: item.lat, lng: item.lng });
    } else if (item.id) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/places/details/${item.id}`);
        const data = await response.json();
        if (data.lat && data.lng) setCoords({ lat: data.lat, lng: data.lng });
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }
    if (!storeName && item.name) setStoreName(item.name);
    setAutocompleteSuggestions([]);
    setShowDropdown(false);
  };

  // Real fare-delta preview: asks the same routing endpoint what the trip
  // would look like with this stop included, before it's committed.
  useEffect(() => {
    if (!coords || !currentCoords) { setPreviewDelta(null); return; }
    let cancelled = false;
    setIsPreviewing(true);
    (async () => {
      try {
        const hypotheticalStops = [...stops, { id: "preview", address, lat: coords.lat, lng: coords.lng, type: "pickup" }];
        const response = await fetch(`${BACKEND_URL}/api/v1/routing/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: currentCoords, stops: hypotheticalStops }),
        });
        const data = await response.json();
        if (!cancelled && data.totalDistance != null) {
          const baseFee = 2.0;
          const distanceCost = Math.round(data.totalDistance * 0.6 * 100) / 100;
          const stopCharges = hypotheticalStops.length * 1.5;
          const newTotal = Math.round((baseFee + distanceCost + stopCharges) * 100) / 100;
          setPreviewDelta({ distanceKm: Math.round((data.totalDistance - (route?.totalDistance || 0)) * 10) / 10, newTotal });
        }
      } catch (error) {
        console.error("Preview route failed:", error);
      } finally {
        if (!cancelled) setIsPreviewing(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng]);

  const handleAddStop = () => {
    if (!address.trim()) {
      Alert.alert("Required", "Please provide an address for the pickup.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Items needed", "Please add at least one item to pick up at this location.");
      return;
    }
    addStop(address, storeName || undefined, items, coords?.lat, coords?.lng);
    router.back();
  };

  const addItemToLocal = () => {
    if (!newItemName.trim()) return;
    const item: DeliveryItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      quantity: 1,
      estimatedPrice: newItemPrice.trim() ? Number(newItemPrice) : undefined,
    };
    setItems([...items, item]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const removeItemFromLocal = (id: string) => setItems(items.filter((i) => i.id !== id));

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add stop {stops.length + 1}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Store name · optional</Text>
          <View style={styles.fieldBox}>
            <TextInput style={styles.fieldInput} placeholder="e.g. Karachi Bakery" placeholderTextColor={tokens.muted} value={storeName} onChangeText={setStoreName} />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Pickup address</Text>
          <View style={[styles.fieldBox, styles.fieldBoxFocused, showDropdown && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <TextInput
              style={styles.fieldInput}
              placeholder="Search nearby store or address"
              placeholderTextColor={tokens.muted}
              value={addressInput}
              onChangeText={handleAddressInput}
              onFocus={() => autocompleteSuggestions.length > 0 && setShowDropdown(true)}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color={accent.accent} />}
            {address && !isSearching && <Ionicons name="checkmark-circle" size={16} color={accent.accent} />}
          </View>
          {showDropdown && autocompleteSuggestions.length > 0 && (
            <View style={styles.dropdown}>
              {autocompleteSuggestions.map((item, idx) => (
                <TouchableOpacity key={item.id || idx} style={[styles.dropdownRow, idx < autocompleteSuggestions.length - 1 && styles.dropdownRowDivider]} onPress={() => handleSelectSuggestion(item)}>
                  <Ionicons name="location-outline" size={14} color={tokens.sec} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.dropdownMain} numberOfLines={1}>{item.name || item.main_text}</Text>
                    <Text style={styles.dropdownSub} numberOfLines={1}>{item.address || item.secondary_text}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.itemsHeadRow}>
            <Text style={styles.sectionLabel}>What to pick up?</Text>
            <Text style={styles.itemsCount}>{items.length} {items.length === 1 ? "item" : "items"}</Text>
          </View>
          <View style={styles.itemsCard}>
            {items.map((item, idx) => (
              <View key={item.id} style={[styles.itemRow, idx < items.length && styles.itemRowDivider]}>
                <View style={styles.itemQtyBadge}><Text style={styles.itemQtyBadgeText}>{item.quantity}</Text></View>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                {item.estimatedPrice != null && <Text style={styles.itemPrice}>₹{item.estimatedPrice}</Text>}
                <TouchableOpacity onPress={() => removeItemFromLocal(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={15} color={tokens.sec} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addItemRow}>
              <TextInput
                style={styles.addItemInput}
                placeholder="Item name"
                placeholderTextColor={tokens.muted}
                value={newItemName}
                onChangeText={setNewItemName}
                onSubmitEditing={addItemToLocal}
                returnKeyType="done"
              />
              <TextInput
                style={styles.addItemPriceInput}
                placeholder="₹ est."
                placeholderTextColor={tokens.muted}
                value={newItemPrice}
                onChangeText={setNewItemPrice}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={addItemToLocal} disabled={!newItemName.trim()}>
                <Ionicons name="add-circle" size={26} color={newItemName.trim() ? accent.accent : tokens.muted} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.itemsHint}>Prices are your estimate. The rider pays the real amount at the counter and you settle the difference at checkout.</Text>
        </View>

        {nearbySuggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Nearby suggestions</Text>
            <View style={{ gap: 8 }}>
              {nearbySuggestions.map((item, i) => (
                <TouchableOpacity key={i} style={styles.suggestionRow} onPress={() => handleSelectSuggestion(item)} activeOpacity={0.85}>
                  <View style={styles.suggestionThumb} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                    {currentCoords && item.lat != null && item.lng != null && (
                      <Text style={styles.suggestionMeta}>
                        {formatDistance(getDistanceMeters(currentCoords.lat, currentCoords.lng, item.lat, item.lng))} from your start point
                      </Text>
                    )}
                  </View>
                  <Ionicons name="add" size={18} color={accent.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {address && (isPreviewing || previewDelta) && (
          <View style={styles.previewBanner}>
            {isPreviewing ? (
              <Text style={styles.previewBannerText}>Calculating the fare impact of this stop…</Text>
            ) : previewDelta ? (
              <Text style={styles.previewBannerText}>
                Adding this stop: <Text style={styles.previewBannerBold}>{previewDelta.distanceKm >= 0 ? "+" : ""}{previewDelta.distanceKm} km</Text>, delivery goes ₹{price?.total ?? "—"} → ₹{previewDelta.newTotal}.
              </Text>
            ) : null}
          </View>
        )}
        <TouchableOpacity style={[styles.addBtn, (!address || items.length === 0) && { opacity: 0.5 }]} onPress={handleAddStop} disabled={!address || items.length === 0}>
          <Text style={styles.addBtnText}>Add stop to route</Text>
        </TouchableOpacity>
      </View>
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

    section: { paddingHorizontal: 16, paddingTop: 20 },
    fieldLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 6 },
    fieldBox: { borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, backgroundColor: tokens.surface, paddingHorizontal: 14, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 },
    fieldBoxFocused: { borderWidth: 2, borderColor: accent.accent },
    fieldInput: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },

    dropdown: { backgroundColor: tokens.surface, borderWidth: 2, borderTopWidth: 0, borderColor: accent.accent, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: "hidden" },
    dropdownRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    dropdownRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.border },
    dropdownMain: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.text },
    dropdownSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(11), color: tokens.sec, marginTop: 1 },

    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    itemsHeadRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
    itemsCount: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
    itemsCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, paddingHorizontal: 14 },
    itemRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    itemRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.border },
    itemQtyBadge: { width: 26, height: 26, borderRadius: 8, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    itemQtyBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), color: accent.accent },
    itemName: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    itemPrice: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec },
    addItemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
    addItemInput: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    addItemPriceInput: { width: 64, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text, textAlign: "right" },
    itemsHint: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 10 },

    suggestionRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 12, minHeight: 56 },
    suggestionThumb: { width: 34, height: 34, borderRadius: 11, backgroundColor: tokens.sunken, flexShrink: 0 },
    suggestionName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    suggestionMeta: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

    footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.border, backgroundColor: tokens.surface },
    previewBanner: { backgroundColor: tokens.warningSkin, borderRadius: 12, padding: 11, marginBottom: 10 },
    previewBannerText: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec },
    previewBannerBold: { fontFamily: fontFamilies.body.bold, color: tokens.text },
    addBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    addBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  });
