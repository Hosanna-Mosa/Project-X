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
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { ServiceCategory } from "@/components/ServiceCategory";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { RestaurantListItem } from "@/components/RestaurantListItem";

const FOOD_CATEGORIES = [
  { id: 1, name: "Corner", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200" },
  { id: 2, name: "South Indian", image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200" },
  { id: 3, name: "Dosa", image: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=200" },
  { id: 4, name: "Vada", image: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=200" },
  { id: 5, name: "Poori", image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=200" },
  { id: 6, name: "Burgers", image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200" },
];

const MOCK_RESTAURANTS = [
  {
    id: 1,
    name: "McDonald's",
    rating: 4.3,
    reviews: "652",
    time: "55-65 mins",
    distance: "13.3 km",
    categories: "Burgers, Beverages, Cafe, ...",
    location: "Tilak Road, Baba...",
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500",
    offer: "FLAT DEAL ₹166 OFF ABOVE ₹649",
    bestIn: "Burger",
  },
  {
    id: 2,
    name: "Raju Tiffin Center",
    rating: 4.8,
    reviews: "646",
    time: "50-60 mins",
    distance: "8.4 km",
    categories: "South Indian",
    location: "Rajahmundry",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500",
    offer: "60% OFF UPTO ₹120",
    isPureVeg: true,
  },
  {
    id: 3,
    name: "The Dessert Heaven",
    rating: 4.5,
    reviews: "1.7K+",
    time: "40-50 mins",
    distance: "12 km",
    categories: "Bakery, Desserts, ...",
    location: "Tilak Road",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500",
    offer: "70% OFF UPTO ₹130",
    isPureVeg: true,
  },
  {
    id: 4,
    name: "KFC - Kentucky Fried Chicken",
    rating: 4.1,
    reviews: "2.1K+",
    time: "30-40 mins",
    distance: "10.5 km",
    categories: "Fast Food, Fried Chicken",
    location: "Main Street",
    image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=500",
    offer: "GET ₹100 OFF ON ₹499",
    bestIn: "Fried Chicken",
  },
  {
    id: 5,
    name: "Biryani House",
    rating: 4.7,
    reviews: "3.4K+",
    time: "45-55 mins",
    distance: "9.2 km",
    categories: "North Indian, Biryani",
    location: "Downtown",
    image: "https://images.unsplash.com/photo-1563379091339-03b11adbc936?w=500",
    offer: "BUY 1 GET 1 FREE",
    bestIn: "Biryani",
  },
  {
    id: 6,
    name: "Pizza Hut",
    rating: 4.2,
    reviews: "1.2K+",
    time: "35-45 mins",
    distance: "11.1 km",
    categories: "Pizza, Italian",
    location: "Skyline Mall",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500",
    offer: "FLAT 50% OFF",
    bestIn: "Pizza",
  },
  {
    id: 7,
    name: "Starbucks Coffee",
    rating: 4.6,
    reviews: "890",
    time: "15-25 mins",
    distance: "5.4 km",
    categories: "Beverages, Cafe",
    location: "Airport Road",
    image: "https://images.unsplash.com/photo-1544787210-22bbdcd0bfdc?w=500",
    offer: "FREE COOKIE ON ₹300+",
  },
  {
    id: 8,
    name: "Subway",
    rating: 4.0,
    reviews: "560",
    time: "20-30 mins",
    distance: "7.8 km",
    categories: "Healthy Food, Salads",
    location: "Tech Park",
    image: "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=500",
    offer: "COMBO DEALS FROM ₹199",
    isPureVeg: false,
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  return (
    <View style={styles.root}>
      <ScrollView 
        style={styles.mainScrollView}
        contentContainerStyle={[styles.mainScrollContent, { paddingTop: topPadding + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.foodCategoriesContainer}
        >
          {FOOD_CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoryCircleWrapper}>
              <View style={styles.categoryCircle}>
                <Image source={{ uri: cat.image }} style={styles.categoryImage} />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Filter</Text>
            <Ionicons name="options-outline" size={14} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Sort by</Text>
            <Ionicons name="chevron-down" size={14} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>99 Store</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Offers</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.restaurantList}>
          {MOCK_RESTAURANTS.map((item) => (
            <RestaurantListItem key={item.id} {...item} />
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.flushHeader, { paddingTop: topPadding + 8 }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.locationInfoBox}>
              <View style={styles.deliveryTitleRow}>
                <Ionicons name="location" size={14} color={colors.primary} style={{marginRight: 6}} />
                <Text style={styles.deliveryTitle}>Delivery to</Text>
              </View>
              <TouchableOpacity 
                style={styles.addressSelector} 
                activeOpacity={0.7}
                onPress={() => setIsLocationSheetOpen(true)}
              >
                {selectedAddress ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', flexShrink: 1}}>
                    <Text style={{fontWeight: '800', color: colors.text, marginRight: 6, fontSize: 14}}>
                      {selectedAddress.label === "Home" || selectedAddress.label === "Work" 
                        ? selectedAddress.label 
                        : (selectedAddress.receiverName || (selectedAddress.label !== "Other" ? selectedAddress.label : "Other"))}
                    </Text>
                    <Text style={[styles.addressText, {flexShrink: 1}]} numberOfLines={1}>
                      {selectedAddress.addressLine}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.addressText, { color: colors.primary, fontWeight: "800", fontSize: 14 }]} numberOfLines={1}>
                    Add address
                  </Text>
                )}
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} style={{marginLeft: 6}} />
              </TouchableOpacity>
            </View>
            <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
              <TouchableOpacity style={styles.avatarBtnCircle} onPress={toggleTheme}>
                  <Ionicons name={theme === 'dark' ? 'sunny' : 'moon'} size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarBtnCircle}>
                  <Ionicons name="person-outline" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.categoriesRow}>
            <ServiceCategory
              icon="list"
              label="Task"
              color={colors.primary}
              onPress={() => router.push({ pathname: "/service-selection", params: { label: "Task" } })}
            />
            <ServiceCategory
              icon="car"
              label="Rides"
              color={colors.primary}
              onPress={() => router.push({ pathname: "/all-services" })}
            />
            <ServiceCategory
              icon="fitness"
              label="Health"
              color={colors.primary}
              onPress={() => router.push({ pathname: "/service-selection", params: { label: "Health" } })}
            />
            <ServiceCategory
              icon="restaurant"
              label="Meat"
              color={colors.primary}
              onPress={() => router.push({ pathname: "/service-selection", params: { label: "Meat" } })}
            />
          </View>
        </View>
      </View>

      <View style={[styles.bottomSearchOverlay, { bottom: insets.bottom + 75 }]}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder='Search "milk", "eggs", "bread"'
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            <View style={styles.micBtnDivider} />
            <TouchableOpacity hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Ionicons name="mic" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
      </View>

      <LocationPickerSheet 
        isOpen={isLocationSheetOpen} 
        onClose={() => setIsLocationSheetOpen(false)} 
        onSelectAddress={(address) => setSelectedAddress(address)}
      />
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 100,
  },
  flushHeader: {
    backgroundColor: colors.surface,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.05 : 0.3,
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
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textSecondary,
    maxWidth: "85%",
  },
  avatarBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingBottom: 5,
  },
  foodCategoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  categoryCircleWrapper: {
    alignItems: "center",
    gap: 8,
    width: 65,
  },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  restaurantList: {
    paddingHorizontal: 16,
  },
  bottomSearchOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    color: colors.text,
    marginLeft: 8,
  },
  micBtnDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
});
