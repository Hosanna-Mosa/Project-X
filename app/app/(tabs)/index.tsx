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
  const [selectedAddress, setSelectedAddress] = useState("221B Baker Street, London");

  return (
    <View style={styles.root}>
      <MapBackground style={StyleSheet.absoluteFill} />

      <View style={[styles.overlay, { paddingTop: topPadding }]} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.locationBar} 
          activeOpacity={0.9}
          onPress={() => setIsLocationSheetOpen(true)}
        >
          <View style={styles.locationIconBox}>
            <Feather name="map-pin" size={20} color="#0EA5E9" />
          </View>
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>DELIVERING TO</Text>
            <Text style={styles.locationValue} numberOfLines={1}>{selectedAddress}</Text>
          </View>
          <Feather name="chevron-down" size={20} color={Colors.light.textSecondary} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={Colors.light.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for places or items"
            placeholderTextColor={Colors.light.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <LocationPickerSheet 
        isOpen={isLocationSheetOpen} 
        onClose={() => setIsLocationSheetOpen(false)} 
        onSelectAddress={(address) => setSelectedAddress(address.addressLine)}
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
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  scrollView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "75%", // Limits the scrollview so it doesn't block the top map area
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 35,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  locationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.light.textMuted,
    letterSpacing: 1,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.text,
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
