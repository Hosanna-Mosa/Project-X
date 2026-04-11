import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { MapBackground } from "@/components/MapBackground";
import { ServiceCategory } from "@/components/ServiceCategory";
import { FoodCard } from "@/components/FoodCard";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";

const RESTAURANTS = [
  {
    id: "1",
    name: "The Green Kitchen",
    time: "15-20 min",
    category: "Healthy",
    rating: 4.8,
    image: require("@/assets/images/food-1.png"),
  },
  {
    id: "2",
    name: "Pizza Roma",
    time: "25-30 min",
    category: "Italian",
    rating: 4.6,
    image: require("@/assets/images/food-2.png"),
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  return (
    <View style={styles.root}>
      <MapBackground style={StyleSheet.absoluteFill} />

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
            <Feather name="search" size={20} color="#06B6D4" />
            <TextInput
              style={styles.searchInput}
              placeholder='Search "milk", "eggs", "bread"'
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
            />
            <View style={styles.micBtnDivider} />
            <TouchableOpacity hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Feather name="mic" size={20} color="#06B6D4" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <LocationPickerSheet 
        isOpen={isLocationSheetOpen} 
        onClose={() => setIsLocationSheetOpen(false)} 
        onSelectAddress={(address) => setSelectedAddress(address)}
      />


      <ScrollView
        style={styles.scrollView}
        pointerEvents="box-none"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 120, // Sit above the floating tab bar
            flexGrow: 1,
            justifyContent: 'flex-end',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View pointerEvents="auto">
          <View style={styles.contentCard}>
            <View style={styles.sheetHandle} />

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
                <Feather name="box" size={24} color="#0EA5E9" />
              </View>
              <View style={styles.promoTextGroup}>
                <Text style={styles.promoTitle}>Multi–Stop Delivery</Text>
                <Text style={styles.promoSubtitle}>Ship multiple items in one route</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#0EA5E9" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locationInfoBox: {
    flex: 1,
    marginRight: 16,
  },
  deliveryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  deliveryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.2,
  },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
    maxWidth: "85%",
  },
  avatarBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.text,
    marginLeft: 12,
  },
  micBtnDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  contentCard: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingBottom: 40,
    gap: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 20,
    width: '100%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    alignSelf: "center",
  },
  categoriesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "#0EA5E930",
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#F0F9FF50",
  },
  promoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0EA5E915",
    alignItems: "center",
    justifyContent: "center",
  },
  promoTextGroup: {
    flex: 1,
    gap: 2,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
  },
  promoSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleText: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  seeAllButton: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0EA5E9",
    letterSpacing: 0.5,
  },
  horizontalScrollList: {
    paddingBottom: 8,
  },
});
