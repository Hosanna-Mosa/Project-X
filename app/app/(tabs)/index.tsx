import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { MapType } from "react-native-maps";
import Colors from "@/constants/colors";
import { MapBackground } from "@/components/MapBackground";
import { ServiceCategory } from "@/components/ServiceCategory";
import { FoodCard } from "@/components/FoodCard";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { customFetch } from "@/utils/api/custom-fetch";
import * as Location from "expo-location";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState<MapType>("standard");

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  useEffect(() => {
    fetchNearbyRestaurants();
  }, []);

  const fetchNearbyRestaurants = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const data = await customFetch<any[]>(`/api/places/nearby?lat=${location.coords.latitude}&lng=${location.coords.longitude}&radius=5000&keyword=restaurant`);
      if (data) setRestaurants(data);
    } catch (err) {
      console.error("Fetch restaurants error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <MapBackground style={StyleSheet.absoluteFill} mapType={mapType} />

      <View style={[styles.mapActions, { top: topPadding + 130 }]}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => setMapType(m => m === 'standard' ? 'satellite' : 'standard')}
        >
          <Feather name={mapType === 'satellite' ? "map" : "layers"} size={18} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.flushHeader, { paddingTop: topPadding + 8 }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.locationInfoBox}>
              <View style={styles.deliveryTitleRow}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#06B6D4" style={{marginRight: 6}} />
                <Text style={styles.deliveryTitle}>Delivery to</Text>
              </View>
              <TouchableOpacity 
                style={styles.addressSelector} 
                activeOpacity={0.7}
                onPress={() => setIsLocationSheetOpen(true)}
              >
                {selectedAddress ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', flexShrink: 1}}>
                    <Text style={{fontWeight: '800', color: '#111827', marginRight: 6, fontSize: 14}}>
                      {selectedAddress.label === "Home" || selectedAddress.label === "Work" 
                        ? selectedAddress.label 
                        : (selectedAddress.receiverName || (selectedAddress.label !== "Other" ? selectedAddress.label : "Other"))}
                    </Text>
                    <Text style={[styles.addressText, {flexShrink: 1}]} numberOfLines={1}>
                      {selectedAddress.addressLine}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.addressText, { color: "#06B6D4", fontWeight: "800", fontSize: 14 }]} numberOfLines={1}>
                    Add address
                  </Text>
                )}
                <Feather name="chevron-down" size={18} color="#4B5563" style={{marginLeft: 6}} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.avatarBtnCircle}>
                <Feather name="user" size={18} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#06B6D4" />
            <TextInput
              style={styles.searchInput}
              placeholder='Search "milk", "eggs", "bread"'
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
            />
            <View style={styles.micBtnDivider} />
            <TouchableOpacity hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Feather name="mic" size={18} color="#06B6D4" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <LocationPickerSheet 
        isOpen={isLocationSheetOpen} 
        onClose={() => setIsLocationSheetOpen(false)} 
        onSelectAddress={(address) => setSelectedAddress(address)}
      />

      <BottomSheet style={styles.bottomSheet}>
        <View style={styles.sheetContent}>
          <View style={styles.categoriesRow}>
            <ServiceCategory
              icon="car"
              label="Ride"
              color="#0EA5E9"
              onPress={() => router.push({ pathname: "/service-selection", params: { label: "Ride" } })}
            />
            <ServiceCategory
              icon="utensils"
              label="Food"
              color="#0EA5E9"
              onPress={() => router.push({ pathname: "/service-selection", params: { label: "Food" } })}
            />
            <ServiceCategory
              icon="shopping-basket"
              label="Grocery"
              color="#0EA5E9"
              onPress={() => router.push({ pathname: "/service-selection", params: { label: "Grocery" } })}
            />
            <ServiceCategory
              icon="medkit"
              label="Meds"
              color="#0EA5E9"
              onPress={() => router.push({ pathname: "/service-selection", params: { label: "Meds" } })}
            />
          </View>

          <TouchableOpacity
            style={styles.promoBanner}
            onPress={() => router.push("/delivery/entry")}
            activeOpacity={0.9}
          >
            <View style={styles.promoIconContainer}>
              <Feather name="box" size={18} color="#0EA5E9" />
            </View>
            <View style={styles.promoTextGroup}>
              <Text style={styles.promoTitle}>Multi–Stop Delivery</Text>
              <Text style={styles.promoSubtitle}>Ship multiple items in one route</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#0EA5E9" />
          </TouchableOpacity>

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitleText}>Nearby Restaurants</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#0EA5E9" />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollList}
            >
              {restaurants.map((item) => (
                <FoodCard
                  key={item.id}
                  name={item.name}
                  time="15-20 min"
                  rating={item.rating || 4.5}
                  category="Restaurant"
                  image={{ uri: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop` }}
                />
              ))}
            </ScrollView>
          )}
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
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scrollView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "75%",
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  flushHeader: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  locationInfoBox: {
    flex: 1,
    marginRight: 12,
  },
  deliveryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  deliveryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.1,
  },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#4B5563",
    maxWidth: "85%",
  },
  avatarBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.text,
    marginLeft: 8,
  },
  micBtnDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  bottomSheet: {
    paddingHorizontal: 16,
  },
  sheetContent: {
    gap: 16,
    paddingBottom: 40,
  },
  categoriesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#0EA5E920",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#F0F9FF50",
  },
  promoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0EA5E915",
    alignItems: "center",
    justifyContent: "center",
  },
  promoTextGroup: {
    flex: 1,
    gap: 1,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.text,
  },
  promoSubtitle: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  seeAllButton: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0EA5E9",
  },
  horizontalScrollList: {
    paddingBottom: 4,
  },
  mapActions: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    gap: 12,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
