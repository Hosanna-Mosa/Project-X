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
  useWindowDimensions,
  Animated,
} from "react-native";
import { useRef } from "react";
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

import * as Location from "expo-location";
import { FlatList } from "react-native";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { theme, toggleTheme } = useThemeStore();
  const [scrollOffset, setScrollOffset] = useState(0);
  const categoriesScrollRef = useRef<ScrollView>(null);
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [meatCenters, setMeatCenters] = useState<any[]>([]);
  const [activeService, setActiveService] = useState<'Food' | 'Meat'>('Food');
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  const getCoords = async () => {
    if (selectedAddress?.location?.coordinates) {
      const [lng, lat] = selectedAddress.location.coordinates;
      return { lat, lng };
    }
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { lat: 17.4447, lng: 78.3498 };
    const loc = await Location.getCurrentPositionAsync({});
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  };

  const fetchVendors = async (lat: number, lng: number, pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${baseUrl}/api/v1/vendors/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20`);
      const data = await response.json();
      if (Array.isArray(data)) {
        if (data.length < 20) setHasMore(false); else setHasMore(true);
        if (pageNum === 1) setRestaurants(data);
        else setRestaurants(prev => [...prev, ...data]);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchMeatCenters = async (lat: number, lng: number, pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${baseUrl}/api/v1/meat/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20`);
      const data = await response.json();
      if (Array.isArray(data)) {
        if (data.length < 20) setHasMore(false); else setHasMore(true);
        if (pageNum === 1) setMeatCenters(data);
        else setMeatCenters(prev => [...prev, ...data]);
      }
    } catch (error) {
      console.error("Error fetching meat centers:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    (async () => {
      setPage(1);
      setHasMore(true);
      const { lat, lng } = await getCoords();
      if (activeService === 'Meat') fetchMeatCenters(lat, lng, 1);
      else fetchVendors(lat, lng, 1);
    })();
  }, [selectedAddress, activeService]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      const lat = 17.4447, lng = 78.3498;
      if (activeService === 'Meat') fetchMeatCenters(lat, lng, nextPage);
      else fetchVendors(lat, lng, nextPage);
    }
  };

  const handleServiceSwitch = (service: 'Food' | 'Meat') => {
    if (activeService === service) return;
    setPage(1);
    setHasMore(true);
    setActiveService(service);
  };

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const renderHeader = () => (
    <>
      {activeService === 'Food' && (
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
      )}

      {activeService === 'Meat' && (
        <View style={styles.meatBannerRow}>
          <Text style={styles.meatBannerTitle}>🥩 Nearby Meat Centers</Text>
          <Text style={styles.meatBannerSubtitle}>Fresh meat delivered to your door</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Filter</Text>
          <Ionicons name="options-outline" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Sort by</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text} />
        </TouchableOpacity>
        {activeService === 'Food' && (
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>99 Store</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Offers</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });

  const topRowOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const categoriesTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      <Animated.FlatList
        data={activeService === 'Meat' ? meatCenters : restaurants}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <RestaurantListItem {...item} isMeat={activeService === 'Meat'} />}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() => (
          loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 120 }} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[styles.mainScrollContent, { paddingTop: topPadding + 160 }]}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={async () => {
          setPage(1);
          setHasMore(true);
          const { lat, lng } = await getCoords();
          if (activeService === 'Meat') fetchMeatCenters(lat, lng, 1);
          else fetchVendors(lat, lng, 1);
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[
          styles.flushHeader, 
          { 
            paddingTop: topPadding + 8,
            transform: [{ translateY: headerTranslateY }] 
          }
        ]}>
          <Animated.View style={[styles.headerTopRow, { opacity: topRowOpacity }]}>
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
          </Animated.View>

          <Animated.View style={[
            styles.categoriesContainer,
            { transform: [{ translateY: categoriesTranslateY }] }
          ]}>
            {scrollOffset > 0 && (
              <TouchableOpacity 
                style={[styles.scrollButton, styles.scrollButtonLeft]} 
                onPress={() => categoriesScrollRef.current?.scrollTo({ x: scrollOffset - 200, animated: true })}
              >
                <Ionicons name="chevron-back" size={16} color={colors.text} />
              </TouchableOpacity>
            )}
            
            <ScrollView
              ref={categoriesScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
              onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
            >
              <ServiceCategory
                icon="list"
                label="Task"
                onPress={() => router.push({ pathname: "/service-selection", params: { label: "Task" } })}
              />
              <ServiceCategory
                icon="car"
                label="Rides"
                onPress={() => router.push({ pathname: "/all-services" })}
              />
              <ServiceCategory
                icon="fast-food"
                label="Food"
                active={activeService === 'Food'}
                onPress={() => handleServiceSwitch('Food')}
              />
              <ServiceCategory
                icon="fitness"
                label="Health"
                onPress={() => router.push({ pathname: "/service-selection", params: { label: "Health" } })}
              />
              <ServiceCategory
                icon="restaurant"
                label="Meat"
                active={activeService === 'Meat'}
                onPress={() => handleServiceSwitch('Meat')}
              />
              <ServiceCategory
                icon="paw"
                label="pets"
                onPress={() => router.push({ pathname: "/service-selection", params: { label: "pets" } })}
              />
            
            </ScrollView>

            <TouchableOpacity 
              style={[styles.scrollButton, styles.scrollButtonRight]} 
              onPress={() => categoriesScrollRef.current?.scrollTo({ x: scrollOffset + 200, animated: true })}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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
  categoriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingBottom: 5,
  },
  categoriesScrollContent: {
    paddingRight: 40,
    gap: 12,
  },
  scrollButton: {
    position: "absolute",
    backgroundColor: colors.surface,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 20,
    opacity: 0.9,
  },
  scrollButtonLeft: {
    left: -14,
    top: 6,
  },
  scrollButtonRight: {
    right: -14,
    top: 6,
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
    alignItems: "center",
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 8,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
    width: "80%",
    maxWidth: 400,
  },
  searchInput: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 13 : 11,
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
  meatBannerRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  meatBannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  meatBannerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 3,
  },
});
