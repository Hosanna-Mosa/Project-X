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
import { router, useLocalSearchParams } from "expo-router";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import * as Location from "expo-location";
import { Alert } from "react-native";
import Colors from "@/constants/colors";
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
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);
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
  const [savingPreference, setSavingPreference] = useState(false);

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
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Drop</Text>
        </View>
        <TouchableOpacity style={styles.forMeSelector} onPress={() => setShowBookingForSheet(true)}>
          <Text style={styles.forMeText}>{bookingFor === "myself" ? "For me" : "Someone else"}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: "#16A34A" }]} />
          <View style={styles.dashLine} />
          {stops.map((stop, index) => (
             <React.Fragment key={stop.id}>
                <View style={styles.stopDiamond}>
                   <Text style={styles.stopDiamondText}>{index + 1}</Text>
                </View>
                <View style={styles.dashLine} />
             </React.Fragment>
          ))}
          <View style={[styles.dot, { backgroundColor: "#EA580C" }]} />
        </View>
        
        <View style={styles.inputsContainer}>
          <GooglePlacesAutocomplete
            ref={pickupRef}
            placeholder="Pickup location"
            onPress={(data, details = null) => handleSelection('pickup', data, details)}
            fetchDetails={true}
            query={{
              key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
              language: "en",
            }}
            textInputProps={{
              onChangeText: (text) => handleSearch(text, 'pickup'),
              onFocus: () => setFocusedInput({ type: 'pickup' }),
              placeholderTextColor: colors.textSecondary,
            }}
            styles={{
              container: { flex: 0, zIndex: 2000 },
              textInput: styles.locationInput,
              listView: { display: 'none' }, // Hide default list
            }}
            enablePoweredByContainer={false}
            debounce={200}
            renderRightButton={() => (
              <TouchableOpacity style={styles.currentLocBtn} onPress={handleCurrentLocation} disabled={fetchingLocation}>
                 {fetchingLocation ? (
                   <ActivityIndicator size="small" color={colors.primary} />
                 ) : (
                   <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
                 )}
              </TouchableOpacity>
            )}
          />
          
          <View style={styles.divider} />

          {stops.map((stop, index) => (
            <View key={stop.id}>
              <View style={styles.stopInputRow}>
                <GooglePlacesAutocomplete
                  placeholder="Add Stop"
                  onPress={(data, details = null) => handleStopSelection(stop.id, data, details)}
                  fetchDetails={true}
                  query={{
                    key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
                    language: "en",
                  }}
                  predefinedPlaces={stop.name ? [{
                    description: stop.name,
                    geometry: { location: { lat: stop.lat, lng: stop.lng, latitude: stop.lat, longitude: stop.lng } },
                  }] : []}
                  textInputProps={{
                    onChangeText: (text) => handleSearch(text, 'stop', stop.id),
                    onFocus: () => setFocusedInput({ type: 'stop', id: stop.id }),
                    placeholderTextColor: colors.textSecondary,
                  }}
                  styles={{
                    container: { flex: 1, zIndex: 1500 - index },
                    textInput: styles.locationInput,
                    listView: { display: 'none' },
                  }}
                  enablePoweredByContainer={false}
                  debounce={200}
                />
                <View style={styles.stopActions}>
                  <TouchableOpacity style={styles.dragBtn}>
                    <Ionicons name="reorder-two-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveStop(stop.id)}>
                    <Ionicons name="close-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.divider} />
            </View>
          ))}
          
          <GooglePlacesAutocomplete
            ref={dropRef}
            placeholder="Drop location"
            onPress={(data, details = null) => handleSelection('drop', data, details)}
            fetchDetails={true}
            query={{
              key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
              language: "en",
            }}
            textInputProps={{
              onChangeText: (text) => handleSearch(text, 'drop'),
              onFocus: () => setFocusedInput({ type: 'drop' }),
              placeholderTextColor: colors.textSecondary,
            }}
            styles={{
              container: { flex: 0, zIndex: 1000 },
              textInput: styles.locationInput,
              listView: { display: 'none' },
            }}
            enablePoweredByContainer={false}
            debounce={200}
          />
        </View>
      </View>

      <View style={styles.actionRow}>
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
          <Ionicons name="location-outline" size={20} color={colors.text} />
          <Text style={styles.actionBtnText}>Select on map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleAddStop}>
          <Ionicons name="add-circle-outline" size={20} color={colors.text} />
          <Text style={styles.actionBtnText}>Add stops</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.placesScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>
          {isSearching ? "Search Results" : "Recent Places"}
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
              <MaterialCommunityIcons 
                name={isSearching ? "magnify" : "history"} 
                size={22} 
                color={colors.textSecondary} 
              />
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
            </View>
            
          </TouchableOpacity>
        ))}
      </ScrollView>
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
        <TouchableOpacity
          style={styles.sheetBackButton}
          onPress={() => setShowBookingForSheet(false)}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={[styles.bookingSheet, { paddingBottom: Math.max(insets.bottom, 18) + 6 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Booking ride for</Text>

            <TouchableOpacity style={styles.bookingOption} onPress={() => setBookingFor("myself")} activeOpacity={0.85}>
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons name="account-circle-outline" size={23} color="#0F172A" />
                <Text style={styles.optionText}>Myself</Text>
              </View>
              <View style={styles.radioOuter}>
                {bookingFor === "myself" && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

          <TouchableOpacity style={styles.bookingOption} onPress={() => setBookingFor("someone_else")} activeOpacity={0.85}>
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="account-plus" size={24} color="#0F172A" />
              <Text style={styles.optionText}>Someone else</Text>
            </View>
            <View style={styles.radioOuter}>
              {bookingFor === "someone_else" && <View style={styles.radioInner} />}
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
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#64748B" />
            <Text style={styles.infoText}>Contact name won't be shared with captain</Text>
          </View>

          <TouchableOpacity
            style={[styles.doneButton, savingPreference && { opacity: 0.7 }]}
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
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.doneButtonText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
    },
    forMeSelector: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    forMeText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    locationContainer: {
      marginHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      flexDirection: "row",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 10,
      zIndex: 100,
    },
    dotsContainer: {
      alignItems: "center",
      width: 20,
      paddingTop: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dashLine: {
      width: 1,
      height: 25,
      backgroundColor: colors.border,
      marginVertical: 2,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderRadius: 1,
    },
    stopDiamond: {
      width: 14,
      height: 14,
      backgroundColor: "#000",
      transform: [{ rotate: "45deg" }],
      alignItems: "center",
      justifyContent: "center",
    },
    stopDiamondText: {
      color: "#fff",
      fontSize: 8,
      fontWeight: "bold",
      transform: [{ rotate: "-45deg" }],
    },
    inputsContainer: {
      flex: 1,
      marginLeft: 12,
      gap: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: 2,
    },
    locationInput: {
      flex: 1,
      width: "100%",
      height: 40,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      backgroundColor: "transparent",
      paddingHorizontal: 0,
    },
    currentLocBtn: {
      justifyContent: 'center',
      paddingLeft: 8,
    },
    resultsList: {
      position: "absolute",
      top: 45,
      left: -40,
      right: -20,
      backgroundColor: colors.surface,
      zIndex: 5000,
      borderRadius: 10,
      elevation: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      marginTop: 20,
      gap: 12,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    stopInputRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    stopActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    dragBtn: {
      padding: 4,
    },
    removeBtn: {
      padding: 4,
    },
    placesScroll: {
      flex: 1,
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    placeItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    placeIconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 15,
    },
    placeInfo: {
      flex: 1,
    },
    placeName: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    placeAddress: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
      marginTop: 2,
    },
    emptyRecents: {
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    emptyRecentsText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.68)",
    },
    sheetBackButton: {
      position: "absolute",
      left: 18,
      bottom: 410,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    bookingSheet: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 11,
      paddingHorizontal: 19,
      minHeight: 382,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 16,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 46,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#E2E8F0",
      marginBottom: 25,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: "#0F172A",
      marginBottom: 20,
    },
    bookingOption: {
      height: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 11,
    },
    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    optionText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#0F172A",
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: "#0057A8",
      alignItems: "center",
      justifyContent: "center",
    },
    radioInner: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#0057A8",
    },
    contactInputWrap: {
      marginBottom: 14,
      gap: 7,
    },
    contactInputLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: "#475569",
    },
    contactInput: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#F8FAFC",
      paddingHorizontal: 12,
      fontSize: 15,
      fontWeight: "700",
      color: "#0F172A",
    },
    addRiderOption: {
      height: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: 17,
      marginBottom: 16,
    },
    addRiderText: {
      fontSize: 17,
      fontWeight: "700",
      color: "#0057B8",
      textDecorationLine: "underline",
    },
    infoBox: {
      minHeight: 64,
      borderRadius: 13,
      backgroundColor: "#F8FAFC",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: 13,
      paddingVertical: 14,
      marginBottom: 38,
    },
    infoText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: "500",
      color: "#334155",
    },
    doneButton: {
      height: 45,
      borderRadius: 23,
      backgroundColor: "#000000",
      alignItems: "center",
      justifyContent: "center",
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });









