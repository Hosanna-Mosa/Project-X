import React, { useEffect, useState, useRef } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { MapBackground, MapBackgroundRef } from "@/components/MapBackground";
import { BottomSheet } from "@/components/BottomSheet";
import { customFetch } from "@/utils/api/custom-fetch";

export default function ServiceSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { label } = useLocalSearchParams<{ label: string }>();
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [searchText, setSearchText] = useState("");
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapBackgroundRef>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        setLoading(true);
        const location = await Location.getCurrentPositionAsync({});
        const currentCoords = { lat: location.coords.latitude, lng: location.coords.longitude };
        setCoords(currentCoords);

        if (["Food", "Grocery", "Meds"].includes(label as string)) {
          let keyword = "food";
          if (label === "Grocery") keyword = "grocery supermarket";
          if (label === "Meds") keyword = "pharmacy medical shop";
          
          fetchNearby(currentCoords.lat, currentCoords.lng, keyword);
        }
      } catch (err) {
        console.error("Location/Fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [label]);

  const fetchNearby = async (lat: number, lng: number, keyword: string) => {
    try {
      const data = await customFetch<any[]>(`/api/places/nearby?lat=${lat}&lng=${lng}&radius=5000&keyword=${encodeURIComponent(keyword)}`);
      setNearbyPlaces(data);
      if (data.length > 0) {
        setTimeout(() => mapRef.current?.fitToMarkers(data), 1000);
      }
    } catch (err) {
      console.error("Fetch nearby error:", err);
    }
  };

  const handleMarkerPress = (place: any) => {
    setSelectedPlace(place);
    mapRef.current?.panTo(place.lat, place.lng, 0.005);
  };

  return (
    <View style={styles.root}>
      <MapBackground 
        ref={mapRef}
        style={StyleSheet.absoluteFill} 
        markers={nearbyPlaces}
        onMarkerPress={handleMarkerPress}
        mapType={mapType}
      />

      {/* Map Action Buttons */}
      <View style={[styles.mapActions, { top: insets.top + (Platform.OS === 'web' ? 70 : 10) + 70 }]}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => setMapType(m => m === 'standard' ? 'satellite' : 'standard')}
        >
          <Feather name="layers" size={20} color={mapType === 'satellite' ? Colors.light.primary : Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{label || "Select Location"}</Text>
        </View>
      </View>

      {/* Detail Card Overlay when place is selected */}
      {selectedPlace && (
        <View style={[styles.detailOverlay, { bottom: 340 }]}>
          <TouchableOpacity 
            style={styles.closeDetail}
            onPress={() => setSelectedPlace(null)}
          >
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.detailCard}>
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selectedPlace.name}</Text>
              <Text style={styles.detailAddress} numberOfLines={2}>{selectedPlace.address}</Text>
              <View style={styles.ratingRow}>
                <View style={styles.starBox}>
                  <Feather name="star" size={14} color="#EAB308" />
                  <Text style={styles.ratingText}>{selectedPlace.rating || 'N/A'}</Text>
                </View>
                <Text style={styles.userCount}>({selectedPlace.user_ratings_total || 0} reviews)</Text>
                {selectedPlace.open_now !== undefined && (
                  <View style={[styles.statusTag, { backgroundColor: selectedPlace.open_now ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Text style={[styles.statusText, { color: selectedPlace.open_now ? '#166534' : '#991B1B' }]}>
                      {selectedPlace.open_now ? 'OPEN' : 'CLOSED'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.orderBtn} onPress={() => router.push({ pathname: "/chat", params: { placeId: selectedPlace.id } })}>
              <Text style={styles.orderBtnText}>Order Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Sheet with Search Bar */}
      <BottomSheet style={styles.bottomSheet}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Where to?</Text>
          <Text style={styles.sheetSubtitle}>
            Search for a location to start your {label?.toLowerCase()} delivery
          </Text>

          <View style={styles.searchContainer}>
            {loading ? <ActivityIndicator size="small" color={Colors.light.primary} /> : <Feather name="search" size={20} color={Colors.light.textMuted} />}
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street name..."
              placeholderTextColor={Colors.light.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Location Suggestions (Mock) */}
          <View style={styles.suggestions}>
             {/* If we have nearby places, maybe show them in list too? */}
             {["Food", "Grocery", "Meds"].includes(label as string) && nearbyPlaces.length > 0 ? (
               nearbyPlaces.slice(0, 5).map((place) => (
                <TouchableOpacity 
                  key={place.id} 
                  style={styles.suggestionItem}
                  onPress={() => handleMarkerPress(place)}
                >
                  <View style={[styles.suggestionIconBox, { backgroundColor: label === 'Meds' ? '#FEF2F2' : label === 'Grocery' ? '#F0FDF4' : '#F0F9FF' }]}>
                    <Feather 
                      name={label === 'Meds' ? 'plus-square' : label === 'Grocery' ? 'shopping-cart' : 'shopping-bag'} 
                      size={18} 
                      color={label === 'Meds' ? '#EF4444' : label === 'Grocery' ? '#22C55E' : '#0EA5E9'} 
                    />
                  </View>
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionTitle}>{place.name}</Text>
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>{place.address}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
                </TouchableOpacity>
               ))
             ) : (
                <>
                  <TouchableOpacity style={styles.suggestionItem}>
                    <View style={styles.suggestionIconBox}>
                      <Feather name="map-pin" size={18} color={Colors.light.textSecondary} />
                    </View>
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionTitle}>Set location on map</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
                  </TouchableOpacity>
                  
                  <View style={styles.divider} />

                  <TouchableOpacity style={styles.suggestionItem}>
                    <View style={[styles.suggestionIconBox, { backgroundColor: '#F0F9FF' }]}>
                      <Feather name="home" size={18} color="#0EA5E9" />
                    </View>
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionTitle}>Home</Text>
                      <Text style={styles.suggestionSubtitle}>221B Baker Street, London</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
                  </TouchableOpacity>
                </>
             )}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  pinContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40, // Adjust for bottom sheet offset
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 12,
  },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  pinShadow: {
    width: 8,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 4,
    position: "absolute",
    bottom: -2,
    transform: [{ scaleX: 2 }],
  },
  bottomSheet: {
    paddingBottom: 40,
  },

  sheetContent: {
    gap: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.light.text,
    letterSpacing: -1,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: "500",
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  suggestions: {
    marginTop: 8,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  suggestionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  suggestionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 54,
  },
  detailOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 100,
  },
  closeDetail: {
    position: "absolute",
    top: -45,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  detailInfo: {
    flex: 1,
    gap: 4,
  },
  detailName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
  },
  detailAddress: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  starBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#854D0E",
  },
  userCount: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontWeight: "500",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  orderBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  orderBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  mapActions: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    gap: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
});
