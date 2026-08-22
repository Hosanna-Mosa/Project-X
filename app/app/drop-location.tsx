import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDeliveryStore } from "@/contexts/deliveryStore";

type RecentPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const RECENT_LOCATIONS_KEY = "recent_locations";
const recentLocationsKeyFor = (userId?: string | number | null) =>
  userId ? `${RECENT_LOCATIONS_KEY}:${userId}` : `${RECENT_LOCATIONS_KEY}:guest`;

const toRecentPlace = (place: Partial<RecentPlace> & { description?: string }) => ({
  id: String(place.id || place.address || place.description || Date.now()),
  name: place.name || place.description?.split(",")[0]?.trim() || place.address?.split(",")[0]?.trim() || "Recent place",
  address: place.address || place.description || place.name || "",
  lat: Number(place.lat),
  lng: Number(place.lng),
});

export default function LocationSelectionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    serviceId: string;
    name: string;
    pickupName?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropName?: string;
    dropLat?: string;
    dropLng?: string;
    stops?: string; // JSON string
    triggerAddStop?: string;
  }>();
  const { serviceId, name } = params;

  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.ride;
  const styles = React.useMemo(() => createStyles(tokens, accent), [theme]);
  const { user } = useAuthStore();
  const setServiceType = useDeliveryStore((state) => state.setServiceType);

  useEffect(() => {
    if (serviceId) {
      setServiceType(serviceId);
    }
  }, [serviceId, setServiceType]);

  const [pickup, setPickup] = useState<any>(null);
  const [drop, setDrop] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [showBookingForSheet, setShowBookingForSheet] = useState(false);
  const [bookingFor, setBookingFor] = useState<"myself" | "someone_else">("myself");
  const [someoneContact, setSomeoneContact] = useState("");
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [savingPreference, setSavingPreference] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setIsNavigating(false);
    }, [])
  );

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const profile = await customFetch<any>("/api/v1/users/profile");
        if (profile?.bookingPreference?.type) {
          setBookingFor(profile.bookingPreference.type);
          if (profile.bookingPreference.contactNumber) {
            setSomeoneContact(profile.bookingPreference.contactNumber);
          }
        }
      } catch {
        // Profile preference is optional
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    customFetch<any[]>("/api/v1/users/addresses")
      .then((data) => setSavedAddresses(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    const loadRecentPlaces = async () => {
      try {
        const accountKey = recentLocationsKeyFor(user?.id);
        const stored = await AsyncStorage.getItem(accountKey);
        const legacyStored = user?.id && !stored ? await AsyncStorage.getItem(RECENT_LOCATIONS_KEY) : null;
        const parsed = JSON.parse(stored || legacyStored || "[]");

        if (mounted && Array.isArray(parsed)) {
          setRecentPlaces(
            parsed
              .map(toRecentPlace)
              .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
              .slice(0, 8)
          );
        }
      } catch (error) {
        console.error("Failed to load recent places:", error);
      }
    };

    loadRecentPlaces();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    // Handle initial state from params
    if (params.pickupName && params.pickupLat) {
      setPickup({
        name: params.pickupName,
        lat: parseFloat(params.pickupLat),
        lng: parseFloat(params.pickupLng || "0"),
      });
      pickupRef.current?.setAddressText(params.pickupName);
    }
    if (params.dropName && params.dropLat) {
      setDrop({
        name: params.dropName,
        lat: parseFloat(params.dropLat),
        lng: parseFloat(params.dropLng || "0"),
      });
      dropRef.current?.setAddressText(params.dropName);
    }
    if (params.stops) {
      try {
        const parsedStops = JSON.parse(params.stops);
        setStops(parsedStops);
      } catch (e) {
        console.error("Error parsing stops:", e);
      }
    }

    if (params.triggerAddStop === "true") {
      handleAddStop();
      // Clear the trigger by setting params to empty would be ideal,
      // but since params are reactive, we just rely on state.
    }

    // Auto-navigation only if both pickup and drop are set AND not in adding stop mode
    if (params.pickupName && params.pickupLat && params.dropName && params.dropLat && params.triggerAddStop !== "true") {
      router.push({
        pathname: "/ride-confirmation",
        params: {
          serviceId,
          pickupName: params.pickupName,
          dropName: params.dropName,
          pickupLat: params.pickupLat,
          pickupLng: params.pickupLng,
          dropLat: params.dropLat,
          dropLng: params.dropLng,
          stops: params.stops,
          bookingForType: bookingFor,
          riderContact: someoneContact,
        }
      });
    }
  }, [params.pickupName, params.pickupLat, params.dropName, params.dropLat, params.stops]);

  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchError, setSearchError] = useState("");
  const [focusedInput, setFocusedInput] = useState<{ type: 'pickup' | 'drop' | 'stop', id?: string } | null>(null);

  const pickupRef = useRef<any>(null);
  const dropRef = useRef<any>(null);
  const searchRequestIdRef = useRef(0);

  const saveRecentPlace = async (placeInput: Partial<RecentPlace> & { description?: string }) => {
    const place = toRecentPlace(placeInput);
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || !place.address) return;

    setRecentPlaces((current) => {
      const updated = [
        place,
        ...current.filter((item) => item.address !== place.address && item.id !== place.id),
      ].slice(0, 8);

      AsyncStorage.setItem(recentLocationsKeyFor(user?.id), JSON.stringify(updated)).catch((error) => {
        console.error("Failed to save recent place:", error);
      });

      return updated;
    });
  };

  const handleSearch = async (text: string, type: 'pickup' | 'drop' | 'stop', id?: string) => {
    setFocusedInput({ type, id });
    setSearchText(text);
    setSearchError("");
    if (!text || text.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchLoading(false);
      return;
    }
    const requestId = ++searchRequestIdRef.current;
    setIsSearching(true);
    setSearchLoading(true);
    try {
      const locationQuery = pickup?.lat && pickup?.lng
        ? `&lat=${encodeURIComponent(String(pickup.lat))}&lng=${encodeURIComponent(String(pickup.lng))}`
        : "";
      const data = await customFetch<any[]>(
        `/api/v1/places/autocomplete?input=${encodeURIComponent(text)}${locationQuery}`,
        { responseType: "json" },
      );
      if (requestId === searchRequestIdRef.current) {
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Search error:", e);
      if (requestId === searchRequestIdRef.current) {
        setSearchResults([]);
        setSearchError("Could not load places. Check your connection and try again.");
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setSearchLoading(false);
      }
    }
  };

  const selectResult = async (result: any) => {
    try {
      const details = Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lng))
        ? { lat: Number(result.lat), lng: Number(result.lng) }
        : await customFetch<{ lat: number, lng: number }>(`/api/v1/places/details/${result.id}`);
      const completeData = {
        description: result.address,
        lat: details.lat,
        lng: details.lng,
        name: result.name
      };

      if (focusedInput?.type === 'pickup') {
        pickupRef.current?.setAddressText(result.address);
        handleSelection('pickup', completeData, null);
      } else if (focusedInput?.type === 'drop') {
        dropRef.current?.setAddressText(result.address);
        handleSelection('drop', completeData, null);
      } else if (focusedInput?.type === 'stop' && focusedInput.id) {
        handleStopSelection(focusedInput.id, completeData, null);
      }

      setSearchResults([]);
      setIsSearching(false);
      setSearchLoading(false);
      setSearchText("");
    } catch (e) {
      console.error("Selection error:", e);
    }
  };

  const handleSelection = async (type: 'pickup' | 'drop', data: any, details: any = null) => {
    const lat = details?.geometry?.location?.lat || data.lat;
    const lng = details?.geometry?.location?.lng || data.lng;
    const addrName = data.description || data.name;
    const placeId = data.place_id || data.id || details?.place_id;
    const placeName = data.structured_formatting?.main_text || data.name || addrName?.split(",")?.[0]?.trim();

    if (lat && lng) {
      try {
        const checkRes = await customFetch<any>(`/api/v1/zones/check?lat=${lat}&lng=${lng}`);
        if (!checkRes || !checkRes.inZone) {
          Alert.alert("No Service", `No service at current ${type} location.`);
          if (type === 'pickup') {
            pickupRef.current?.setAddressText("");
            setPickup(null);
          } else {
            dropRef.current?.setAddressText("");
            setDrop(null);
          }
          return;
        }
      } catch (err) {
        console.error("Zone check failed:", err);
      }
    }

    saveRecentPlace({
      id: placeId || addrName,
      name: placeName,
      address: addrName,
      lat,
      lng,
    });

    if (type === 'pickup') {
      setPickup({ name: addrName, lat, lng });
    } else {
      setDrop({ name: addrName, lat, lng });
    }

    const currentPickup = type === 'pickup' ? { name: addrName, lat, lng } : pickup;
    const currentDrop = type === 'drop' ? { name: addrName, lat, lng } : drop;

    if (currentPickup && currentDrop && currentPickup.lat && currentDrop.lat) {
        setIsNavigating(true);
        router.push({
            pathname: "/ride-confirmation",
            params: {
                serviceId,
                pickupName: currentPickup.name,
                dropName: currentDrop.name,
                pickupLat: currentPickup.lat.toString(),
                pickupLng: currentPickup.lng.toString(),
                dropLat: currentDrop.lat.toString(),
                dropLng: currentDrop.lng.toString(),
                stops: JSON.stringify(stops),
                bookingForType: bookingFor,
                riderContact: someoneContact,
            }
        });
    }
  };

  const handleAddStop = () => {
    setStops([...stops, { id: Date.now().toString(), name: "", lat: 0, lng: 0 }]);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const handleStopSelection = (id: string, data: any, details: any = null) => {
    const lat = details?.geometry?.location?.lat || data.lat;
    const lng = details?.geometry?.location?.lng || data.lng;
    const addrName = data.description || data.name;
    const placeId = data.place_id || data.id || details?.place_id;
    const placeName = data.structured_formatting?.main_text || data.name || addrName?.split(",")?.[0]?.trim();

    saveRecentPlace({
      id: placeId || addrName,
      name: placeName,
      address: addrName,
      lat,
      lng,
    });

    setStops(prev => prev.map(s => s.id === id ? { ...s, name: addrName, lat, lng } : s));
  };

  const selectSavedAddress = (addr: any) => {
    const lat = addr.coordinates?.lat ?? addr.location?.coordinates?.[1];
    const lng = addr.coordinates?.lng ?? addr.location?.coordinates?.[0];
    if (lat == null || lng == null) return;
    const data = { id: addr._id, name: addr.label, description: addr.addressLine, lat, lng };
    if (!pickup) {
      pickupRef.current?.setAddressText(addr.addressLine);
      handleSelection('pickup', data, null);
    } else {
      dropRef.current?.setAddressText(addr.addressLine);
      handleSelection('drop', data, null);
    }
  };

  const handleCurrentLocation = async () => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setFetchingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // Check zone for current location
      try {
        const checkRes = await customFetch<any>(`/api/v1/zones/check?lat=${location.coords.latitude}&lng=${location.coords.longitude}`);
        if (!checkRes || !checkRes.inZone) {
          Alert.alert("No Service", "No service at current pickup location.");
          pickupRef.current?.setAddressText("");
          setPickup(null);
          return;
        }
      } catch (err) {
        console.error("Zone check failed:", err);
      }

      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const addr = geocode[0];
        const displayAddr = `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}`.trim();
        pickupRef.current?.setAddressText(displayAddr);
        const newPickup = {
          name: displayAddr,
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
        setPickup(newPickup);

        if (drop) {
          router.push({
            pathname: "/ride-confirmation",
            params: {
              serviceId,
              pickupName: displayAddr,
              dropName: drop.name,
              pickupLat: newPickup.lat.toString(),
              pickupLng: newPickup.lng.toString(),
              dropLat: drop.lat.toString(),
              dropLng: drop.lng.toString(),
              stops: JSON.stringify(stops),
              bookingForType: bookingFor,
              riderContact: someoneContact,
            }
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setFetchingLocation(false);
    }
  };

  return (
    <>
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Where to?</Text>
        <TouchableOpacity style={styles.forMeSelector} onPress={() => setShowBookingForSheet(true)}>
          <Text style={styles.forMeText}>{bookingFor === "myself" ? "For me" : "Someone else"}</Text>
          <Ionicons name="chevron-down" size={14} color={tokens.sec} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputCard}>
        <View style={styles.dotsContainer}>
          <View style={styles.pickupDot} />
          <View style={styles.dashLine} />
          {stops.map((stop) => (
             <React.Fragment key={stop.id}>
                <View style={styles.markerSlot}>
                   <View style={styles.stopDiamond} />
                </View>
                <View style={styles.dashLine} />
             </React.Fragment>
          ))}
          <View style={styles.dropSquare} />
        </View>

        <View style={styles.inputsContainer}>
          <View style={styles.fieldSlot}>
            <Text style={styles.fieldLabel}>Pickup</Text>
            <GooglePlacesAutocomplete
              ref={pickupRef}
              placeholder="Pickup location"
              onPress={(data, details = null) => handleSelection('pickup', data, details)}
              fetchDetails={true}
              query={{ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, language: "en" }}
              textInputProps={{
                onChangeText: (text) => handleSearch(text, 'pickup'),
                onFocus: () => setFocusedInput({ type: 'pickup' }),
                placeholderTextColor: tokens.muted,
              }}
              styles={{ container: { flex: 0, zIndex: 2000 }, textInput: styles.locationInput, listView: { display: 'none' } }}
              enablePoweredByContainer={false}
              debounce={200}
              renderRightButton={() => (
                <TouchableOpacity style={styles.currentLocBtn} onPress={handleCurrentLocation} disabled={fetchingLocation}>
                   {fetchingLocation ? (
                     <ActivityIndicator size="small" color={accent.accent} />
                   ) : (
                     <MaterialCommunityIcons name="crosshairs-gps" size={18} color={accent.accent} />
                   )}
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={styles.divider} />

          {stops.map((stop, index) => (
            <View key={stop.id}>
              <View style={styles.stopInputRow}>
                <GooglePlacesAutocomplete
                  placeholder="Add stop"
                  onPress={(data, details = null) => handleStopSelection(stop.id, data, details)}
                  fetchDetails={true}
                  query={{ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, language: "en" }}
                  predefinedPlaces={stop.name ? [{
                    description: stop.name,
                    geometry: { location: { lat: stop.lat, lng: stop.lng, latitude: stop.lat, longitude: stop.lng } },
                  }] : []}
                  textInputProps={{
                    onChangeText: (text) => handleSearch(text, 'stop', stop.id),
                    onFocus: () => setFocusedInput({ type: 'stop', id: stop.id }),
                    placeholderTextColor: tokens.muted,
                  }}
                  styles={{ container: { flex: 1, zIndex: 1500 - index }, textInput: styles.locationInput, listView: { display: 'none' } }}
                  enablePoweredByContainer={false}
                  debounce={200}
                />
                <View style={styles.stopActions}>
                  <TouchableOpacity style={styles.dragBtn}>
                    <Ionicons name="reorder-two-outline" size={18} color={tokens.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveStop(stop.id)}>
                    <Ionicons name="close-outline" size={18} color={tokens.muted} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.divider} />
            </View>
          ))}

          <View style={styles.fieldSlot}>
            <Text style={[styles.fieldLabel, { color: accent.accent }]}>Drop</Text>
            <GooglePlacesAutocomplete
              ref={dropRef}
              placeholder="Search destination"
              onPress={(data, details = null) => handleSelection('drop', data, details)}
              fetchDetails={true}
              query={{ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, language: "en" }}
              textInputProps={{
                onChangeText: (text) => handleSearch(text, 'drop'),
                onFocus: () => setFocusedInput({ type: 'drop' }),
                placeholderTextColor: tokens.muted,
              }}
              styles={{ container: { flex: 0 }, textInput: styles.locationInput, listView: { display: 'none' } }}
              enablePoweredByContainer={false}
              debounce={200}
            />
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleAddStop}
        >
          <Text style={styles.actionBtnText}>+ Add stop</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({
            pathname: "/map-picker",
            params: {
              serviceId,
              type: !pickup ? 'pickup' : 'drop',
              pickupName: pickup?.name,
              pickupLat: pickup?.lat,
              pickupLng: pickup?.lng,
              dropName: drop?.name,
              dropLat: drop?.lat,
              dropLng: drop?.lng,
            }
          })}
        >
          <Ionicons name="locate-outline" size={15} color={tokens.sec} />
          <Text style={styles.actionBtnText}>Select on map</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.placesScroll} keyboardShouldPersistTaps="handled">
        {!isSearching && savedAddresses.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.sectionTitle}>Saved places</Text>
            <View style={styles.savedCard}>
              {savedAddresses.map((addr, idx) => (
                <TouchableOpacity
                  key={addr._id}
                  style={[styles.savedRow, idx < savedAddresses.length - 1 && styles.savedRowDivider]}
                  onPress={() => selectSavedAddress(addr)}
                >
                  <View style={styles.savedAvatar}>
                    <Text style={styles.savedAvatarText}>{(addr.label || "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.savedLabel}>{addr.label || "Address"}</Text>
                    <Text style={styles.savedAddress} numberOfLines={1}>{addr.addressLine}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {isSearching ? "Search results" : "Recent"}
        </Text>

        {isSearching && searchText.trim().length >= 2 && searchResults.length === 0 ? (
          <View style={styles.emptyRecents}>
            <Text style={styles.emptyRecentsText}>
              {searchLoading ? "Searching places..." : searchError || "No matching places found."}
            </Text>
          </View>
        ) : null}

        {!isSearching && recentPlaces.length === 0 ? (
          <View style={styles.emptyRecents}>
            <Text style={styles.emptyRecentsText}>Your searched places will appear here.</Text>
          </View>
        ) : (isSearching ? searchResults : recentPlaces).map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.placeItem}
            onPress={() => {
              if (isSearching) {
                selectResult(place);
              } else {
                if (!pickup) {
                  pickupRef.current?.setAddressText(place.address || place.name);
                  handleSelection('pickup', { id: place.id, name: place.name, description: place.address || place.name, lat: place.lat, lng: place.lng }, null);
                } else {
                  dropRef.current?.setAddressText(place.address || place.name);
                  handleSelection('drop', { id: place.id, name: place.name, description: place.address || place.name, lat: place.lat, lng: place.lng }, null);
                }
              }
            }}
          >
            <View style={styles.placeIconBox}>
              <Ionicons
                name={isSearching ? "search" : "time-outline"}
                size={17}
                color={tokens.sec}
              />
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isNavigating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={accent.accent} />
            <Text style={styles.loadingText}>Fetching route & calculating fare...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>

    <Modal
      visible={showBookingForSheet}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBookingForSheet(false)}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheetScrim}
          onPress={() => setShowBookingForSheet(false)}
        />
        <View style={[styles.bookingSheet, { paddingBottom: Math.max(insets.bottom, 18) + 6 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Booking ride for</Text>

          <TouchableOpacity style={styles.bookingOption} onPress={() => setBookingFor("myself")} activeOpacity={0.85}>
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="account-circle-outline" size={22} color={tokens.text} />
              <Text style={styles.optionText}>Myself</Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: accent.accent }]}>
              {bookingFor === "myself" && <View style={[styles.radioInner, { backgroundColor: accent.accent }]} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bookingOption} onPress={() => setBookingFor("someone_else")} activeOpacity={0.85}>
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="account-plus" size={22} color={tokens.text} />
              <Text style={styles.optionText}>Someone else</Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: accent.accent }]}>
              {bookingFor === "someone_else" && <View style={[styles.radioInner, { backgroundColor: accent.accent }]} />}
            </View>
          </TouchableOpacity>

          {bookingFor === "someone_else" && (
            <View style={styles.contactInputWrap}>
              <Text style={styles.contactInputLabel}>Contact number</Text>
              <TextInput
                style={styles.contactInput}
                value={someoneContact}
                onChangeText={(value) => setSomeoneContact(value.replace(/[^0-9+]/g, ""))}
                keyboardType="phone-pad"
                placeholder="Enter rider contact number"
                placeholderTextColor={tokens.muted}
              />
            </View>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={tokens.sec} />
            <Text style={styles.infoText}>Contact name won't be shared with driver</Text>
          </View>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: accent.accent }, savingPreference && { opacity: 0.7 }]}
            onPress={async () => {
              if (bookingFor === "someone_else" && someoneContact.trim().length < 10) {
                Alert.alert("Contact required", "Please enter a valid contact number for the rider.");
                return;
              }
              if (user?.id) {
                try {
                  setSavingPreference(true);
                  await customFetch("/api/v1/users/booking-preference", {
                    method: "PATCH",
                    body: JSON.stringify({
                      type: bookingFor,
                      contactNumber: bookingFor === "someone_else" ? someoneContact.trim() : undefined,
                    }),
                  });
                } catch (error: any) {
                  Alert.alert("Save failed", error.message || "Could not save booking preference.");
                  return;
                } finally {
                  setSavingPreference(false);
                }
              }
              setShowBookingForSheet(false);
            }}
            disabled={savingPreference}
            activeOpacity={0.9}
          >
            {savingPreference ? (
              <ActivityIndicator size="small" color={accent.on} />
            ) : (
              <Text style={[styles.doneButtonText, { color: accent.on }]}>Done</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["ride"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
    backBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitle: { flex: 1, fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    forMeSelector: {
      flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 999, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.surface,
    },
    forMeText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.text },

    inputCard: {
      flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 14, padding: 14,
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, zIndex: 100,
    },
    dotsContainer: { alignItems: "center", width: 14, paddingTop: 14 },
    pickupDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: accent.accent },
    dropSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: tokens.text },
    markerSlot: { alignItems: "center", justifyContent: "center" },
    stopDiamond: { width: 10, height: 10, backgroundColor: tokens.text, transform: [{ rotate: "45deg" }] },
    dashLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: tokens.borderStrong, marginVertical: 4 },

    inputsContainer: { flex: 1, minWidth: 0, gap: 2 },
    fieldSlot: { minHeight: 44, justifyContent: "center" },
    fieldLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    divider: { height: 1, backgroundColor: tokens.border, marginVertical: 4 },
    locationInput: {
      flex: 1, width: "100%", height: moderateScale(28), fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15),
      color: tokens.text, backgroundColor: "transparent", paddingHorizontal: 0, marginTop: 2,
    },
    currentLocBtn: { justifyContent: "center", paddingLeft: 8 },

    actionRow: { flexDirection: "row", paddingHorizontal: 16, marginTop: 12, gap: 8 },
    actionBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: tokens.borderStrong,
      backgroundColor: tokens.surface, minHeight: 44,
    },
    actionBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.sec },

    stopInputRow: { flexDirection: "row", alignItems: "center" },
    stopActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    dragBtn: { padding: 4 },
    removeBtn: { padding: 4 },

    placesScroll: { flex: 1, marginTop: 22 },
    sectionTitle: {
      fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase",
      color: tokens.muted, paddingHorizontal: 16, marginBottom: 10,
    },
    savedSection: { marginBottom: 18 },
    savedCard: { marginHorizontal: 16, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, overflow: "hidden" },
    savedRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, minHeight: 56 },
    savedRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.border },
    savedAvatar: { width: 36, height: 36, borderRadius: 11, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    savedAvatarText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: accent.accent },
    savedLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    savedAddress: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },

    placeItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, gap: 12, borderBottomWidth: 1, borderBottomColor: tokens.border },
    placeIconBox: { width: moderateScale(36), height: moderateScale(36), borderRadius: moderateScale(18), backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center" },
    placeInfo: { flex: 1, minWidth: 0 },
    placeName: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    placeAddress: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    emptyRecents: { paddingHorizontal: 16, paddingVertical: 14 },
    emptyRecentsText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec },

    sheetOverlay: { flex: 1, justifyContent: "flex-end" },
    sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    bookingSheet: {
      backgroundColor: tokens.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, minHeight: 382,
    },
    sheetHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: tokens.borderStrong, marginBottom: 20 },
    sheetTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(19), letterSpacing: -0.2, color: tokens.text, marginBottom: 18 },
    bookingOption: { minHeight: moderateScale(44), flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    optionLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    optionText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(16), color: tokens.text },
    radioOuter: { width: moderateScale(22), height: moderateScale(22), borderRadius: moderateScale(11), borderWidth: 2, alignItems: "center", justifyContent: "center" },
    radioInner: { width: moderateScale(12), height: moderateScale(12), borderRadius: moderateScale(6) },
    contactInputWrap: { marginBottom: 12, gap: 7, marginTop: 6 },
    contactInputLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 0.5, textTransform: "uppercase", color: tokens.muted },
    contactInput: {
      height: moderateScale(46), borderRadius: 12, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.surface,
      paddingHorizontal: 14, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text,
    },
    infoBox: {
      minHeight: 56, borderRadius: 13, backgroundColor: tokens.sunken, flexDirection: "row", alignItems: "flex-start", gap: 10,
      paddingHorizontal: 13, paddingVertical: 13, marginTop: 4, marginBottom: 20,
    },
    infoText: { flex: 1, fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec },
    doneButton: { minHeight: moderateScale(50), borderRadius: 14, alignItems: "center", justifyContent: "center" },
    doneButtonText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15) },

    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", zIndex: 99999 },
    loadingCard: {
      backgroundColor: tokens.surface, paddingHorizontal: 26, paddingVertical: 20, borderRadius: 16, alignItems: "center", gap: 12,
      borderWidth: 1, borderColor: tokens.border,
    },
    loadingText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
  });
