import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Animated,
  Easing,
  Modal,
  KeyboardAvoidingView,
  PanResponder,
  Dimensions,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { ServiceCategory } from "@/components/ServiceCategory";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { RestaurantListItem } from "@/components/RestaurantListItem";

import { useAuthStore } from "@/contexts/authStore";
import { useCartStore } from "@/contexts/cartStore";

const FESTIVALS: { [key: string]: string } = {
  "01-01": "New Year's Day",
  "01-14": "Pongal",
  "01-15": "Makar Sankranti",
  "01-26": "Republic Day",
  "03-08": "Holi",
  "06-05": "World Environment Day",
  "08-15": "Independence Day",
  "10-02": "Gandhi Jayanti",
  "10-24": "Dussehra",
  "11-12": "Diwali",
  "12-25": "Christmas",
};

const getGreeting = (name: string) => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  const key = `${month}-${date}`;
  
  let greetingPrefix = "";
  if (FESTIVALS[key]) {
    greetingPrefix = `Happy ${FESTIVALS[key]}`;
  } else {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[today.getDay()];
    greetingPrefix = `Happy ${dayName}`;
  }
  
  return `${greetingPrefix}, ${name}!`;
};

interface Dish {
  id: number;
  name: string;
  icon: string;
  color: string;
}

const GET_FAMOUS_DISHES = (dayIndex: number): Dish[] => {
  switch (dayIndex) {
    case 0: // Sunday
      return [
        { id: 1, name: "South Indian Feast", icon: "restaurant", color: "#10B981" },
        { id: 2, name: "Pancakes", icon: "cafe", color: "#F59E0B" },
        { id: 3, name: "Mutton Curry", icon: "flame", color: "#EF4444" },
        { id: 4, name: "Alloo Paratha", icon: "leaf", color: "#8B5CF6" },
        { id: 5, name: "Chaats", icon: "fast-food", color: "#D97706" },
      ];
    case 1: // Monday
      return [
        { id: 1, name: "Idli Sambar", icon: "leaf", color: "#16A34A" },
        { id: 2, name: "Salad Bowl", icon: "nutrition", color: "#22C55E" },
        { id: 3, name: "Smoothies", icon: "wine", color: "#EC4899" },
        { id: 4, name: "Oatmeal", icon: "restaurant", color: "#6B7280" },
        { id: 5, name: "Green Tea", icon: "cafe", color: "#14B8A6" },
      ];
    case 2: // Tuesday
      return [
        { id: 1, name: "Masala Dosa", icon: "restaurant", color: "#F59E0B" },
        { id: 2, name: "Chole Bhature", icon: "fast-food", color: "#EF4444" },
        { id: 3, name: "Paneer Wrap", icon: "leaf", color: "#10B981" },
        { id: 4, name: "Samosa Chaat", icon: "flame", color: "#D97706" },
        { id: 5, name: "Lassi", icon: "wine", color: "#3B82F6" },
      ];
    case 3: // Wednesday
      return [
        { id: 1, name: "Burger", icon: "fast-food", color: "#F59E0B" },
        { id: 2, name: "Hakka Noodles", icon: "restaurant", color: "#EC4899" },
        { id: 3, name: "Momos", icon: "leaf", color: "#10B981" },
        { id: 4, name: "Pasta Carbonara", icon: "pizza", color: "#EF4444" },
        { id: 5, name: "Cold Coffee", icon: "cafe", color: "#6B7280" },
      ];
    case 4: // Thursday
      return [
        { id: 1, name: "Poori Curry", icon: "restaurant", color: "#D97706" },
        { id: 2, name: "Veg Biryani", icon: "leaf", color: "#16A34A" },
        { id: 3, name: "Sandwich", icon: "cut", color: "#3B82F6" },
        { id: 4, name: "Vada Pav", icon: "fast-food", color: "#F59E0B" },
        { id: 5, name: "Lemon Soda", icon: "wine", color: "#000000" },
      ];
    case 5: // Friday
      return [
        { id: 1, name: "Pizza", icon: "pizza", color: "#EF4444" },
        { id: 2, name: "Biryani Feast", icon: "restaurant", color: "#D97706" },
        { id: 3, name: "French Fries", icon: "fast-food", color: "#F59E0B" },
        { id: 4, name: "Burgers", icon: "fast-food", color: "#10B981" },
        { id: 5, name: "Waffles", icon: "cafe", color: "#8B5CF6" },
        { id: 6, name: "Donuts", icon: "egg", color: "#EC4899" },
      ];
    case 6: // Saturday
      return [
        { id: 1, name: "Barbeque Wings", icon: "flame", color: "#EF4444" },
        { id: 2, name: "Paneer Butter", icon: "restaurant", color: "#F59E0B" },
        { id: 3, name: "Haleem", icon: "restaurant", color: "#D97706" },
        { id: 4, name: "Chocolate Cake", icon: "heart", color: "#EC4899" },
        { id: 5, name: "Mojitos", icon: "wine", color: "#10B981" },
      ];
    default:
      return [];
  }
};

const HOME_SKELETON_ITEMS = Array.from({ length: 4 }, (_, index) => ({ _id: `home-skeleton-${index}` }));

import * as Location from "expo-location";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { theme } = useThemeStore();
  const [scrollOffset, setScrollOffset] = useState(0);
  const categoriesScrollRef = useRef<ScrollView>(null);
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);
  const searchGlowSpin = useRef(new Animated.Value(0)).current;
  const searchGlowOpacity = useRef(new Animated.Value(0)).current;
  const searchGlowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const isHoveringSearch = useCartStore((s) => s.isHoveringSearch);
  const searchBarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(searchBarScale, {
      toValue: isHoveringSearch ? 1.06 : 1.0,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [isHoveringSearch]);

  const user = useAuthStore((s) => s.user);
  const userName = user?.name ? user.name.split(" ")[0] : "Uttej";

  const famousDishes = React.useMemo(() => {
    const today = new Date();
    return GET_FAMOUS_DISHES(today.getDay());
  }, []);

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [meatCenters, setMeatCenters] = useState<any[]>([]);
  const [activeService, setActiveService] = useState<'Food' | 'Meat'>('Food');
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [isDistanceSheetOpen, setIsDistanceSheetOpen] = useState(false);
  const [distanceOption, setDistanceOption] = useState<"3" | "5" | "7" | "custom">("5");
  const [customDistance, setCustomDistance] = useState("");
  const [appliedDistanceKm, setAppliedDistanceKm] = useState<number | null>(null);
  const [distanceRefreshKey, setDistanceRefreshKey] = useState(0);

  const startSearchGlow = useCallback(() => {
    searchGlowLoop.current?.stop();
    searchGlowSpin.setValue(0);
    searchGlowOpacity.setValue(0);

    Animated.timing(searchGlowOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    searchGlowLoop.current = Animated.loop(
      Animated.timing(searchGlowSpin, {
        toValue: 1,
        duration: 2600,
        useNativeDriver: true,
      })
    );
    searchGlowLoop.current.start();
  }, [searchGlowOpacity, searchGlowSpin]);

  useFocusEffect(
    useCallback(() => {
      startSearchGlow();
      return () => searchGlowLoop.current?.stop();
    }, [startSearchGlow])
  );

  const getCoords = async () => {
    if (selectedAddress?.location?.coordinates) {
      const [lng, lat] = selectedAddress.location.coordinates;
      useDeliveryStore.getState().setCurrentCoords({ lat, lng });
      if (selectedAddress.addressLine) {
        useDeliveryStore.getState().setCurrentLocation(selectedAddress.addressLine);
      } else if (selectedAddress.label) {
        useDeliveryStore.getState().setCurrentLocation(selectedAddress.label);
      }
      return { lat, lng };
    }
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      const defaultCoords = { lat: 17.4447, lng: 78.3498 };
      useDeliveryStore.getState().setCurrentCoords(defaultCoords);
      return defaultCoords;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    useDeliveryStore.getState().setCurrentCoords(coords);

    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng
      });
      if (address) {
        const formatted = [
          address.name,
          address.street,
          address.district || address.subregion,
          address.city,
          address.region,
          address.postalCode
        ].filter(Boolean).join(", ");
        useDeliveryStore.getState().setCurrentLocation(formatted);
      }
    } catch (e) {
      console.warn("Home Screen: Reverse geocoding failed:", e);
    }

    return coords;
  };

  const selectedDistanceKm = distanceOption === "custom"
    ? Math.max(1, Number(customDistance) || 5)
    : Number(distanceOption);

  const fetchVendors = async (lat: number, lng: number, pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
      const response = await fetch(`${baseUrl}/api/v1/vendors/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20${radiusParam}`);
      if (!response.ok) throw new Error(`Failed to fetch vendors: ${response.status}`);
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
      const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
      const response = await fetch(`${baseUrl}/api/v1/meat/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20${radiusParam}`);
      if (!response.ok) throw new Error(`Failed to fetch meat centers: ${response.status}`);
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
      setLoading(true);
      const { lat, lng } = await getCoords();
      if (activeService === 'Meat') fetchMeatCenters(lat, lng, 1);
      else fetchVendors(lat, lng, 1);
    })();
  }, [selectedAddress, activeService, appliedDistanceKm, distanceRefreshKey]);

  const loadMore = async () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      const { lat, lng } = await getCoords();
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

  const applyDistanceFilter = () => {
    setIsDistanceSheetOpen(false);
    setLoading(true);
    setAppliedDistanceKm(selectedDistanceKm);
    setDistanceRefreshKey((value) => value + 1);
  };

  const clearDistanceFilter = () => {
    setDistanceOption("5");
    setCustomDistance("");
    setAppliedDistanceKm(null);
    setLoading(true);
    setDistanceRefreshKey((value) => value + 1);
    setIsDistanceSheetOpen(false);
  };

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const renderHeader = () => (
    <>
      {activeService === 'Food' && (
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {getGreeting(userName)}
          </Text>
          <View style={styles.dishesGrid}>
            <TouchableOpacity 
              style={[
                styles.dishChip, 
                foodFilter === 'all' && styles.filterAllActive
              ]} 
              onPress={() => setFoodFilter('all')}
              activeOpacity={0.8}
            >
              <View style={[
                styles.dishIconCircle, 
                { backgroundColor: foodFilter === 'all' ? '#FFFFFF25' : '#64748B15' }
              ]}>
                <Ionicons 
                  name="grid" 
                  size={14} 
                  color={foodFilter === 'all' ? '#FFFFFF' : '#64748B'} 
                />
              </View>
              <Text style={[
                styles.dishChipText, 
                foodFilter === 'all' && styles.filterTextActive
              ]}>All Food</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.dishChip, 
                foodFilter === 'veg' && styles.filterVegActive
              ]} 
              onPress={() => setFoodFilter('veg')}
              activeOpacity={0.8}
            >
              <View style={[
                styles.dishIconCircle, 
                { backgroundColor: foodFilter === 'veg' ? '#FFFFFF25' : '#16A34A15' }
              ]}>
                <Ionicons 
                  name="leaf" 
                  size={14} 
                  color={foodFilter === 'veg' ? '#FFFFFF' : '#16A34A'} 
                />
              </View>
              <Text style={[
                styles.dishChipText, 
                foodFilter === 'veg' && styles.filterTextActive
              ]}>Pure Veg</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.dishChip, 
                foodFilter === 'nonveg' && styles.filterNonVegActive
              ]} 
              onPress={() => setFoodFilter('nonveg')}
              activeOpacity={0.8}
            >
              <View style={[
                styles.dishIconCircle, 
                { backgroundColor: foodFilter === 'nonveg' ? '#FFFFFF25' : '#E11D4815' }
              ]}>
                <Ionicons 
                  name="flame" 
                  size={14} 
                  color={foodFilter === 'nonveg' ? '#FFFFFF' : '#E11D48'} 
                />
              </View>
              <Text style={[
                styles.dishChipText, 
                foodFilter === 'nonveg' && styles.filterTextActive
              ]}>Non-Veg</Text>
            </TouchableOpacity>

            {famousDishes.map((dish) => (
              <TouchableOpacity key={dish.id} style={styles.dishChip} activeOpacity={0.8}>
                <View style={[styles.dishIconCircle, { backgroundColor: dish.color + '15' }]}>
                  <Ionicons name={dish.icon as any} size={16} color={dish.color} />
                </View>
                <Text style={styles.dishChipText}>{dish.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {activeService === 'Meat' && (
        <View style={styles.meatBannerRow}>
          <Text style={styles.meatBannerTitle}>🥩 Nearby Meat Centers</Text>
          <Text style={styles.meatBannerSubtitle}>Fresh meat delivered to your door</Text>
        </View>
      )}

     
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
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });

  const headerTopRowTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 60],
    extrapolate: 'clamp',
  });

  const searchGlowRotate = searchGlowSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const visibleItems = activeService === 'Meat'
    ? meatCenters
    : foodFilter === 'all'
      ? restaurants
      : restaurants.filter(r => foodFilter === 'veg' ? r.isPureVeg : !r.isPureVeg);
  const showHomeSkeleton = loading && !loadingMore;

  return (
    <View style={styles.root}>
      <Animated.FlatList
        data={showHomeSkeleton ? HOME_SKELETON_ITEMS : visibleItems}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => showHomeSkeleton ? <HomeSkeletonCard colors={colors} /> : <RestaurantListItem {...item} isMeat={activeService === 'Meat'} />}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() => (
          loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 120 }} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[styles.mainScrollContent, { paddingTop: topPadding + 160 }]}
        showsVerticalScrollIndicator={false}
        refreshing={false}
        onRefresh={async () => {
          startSearchGlow();
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
          <Animated.View style={[styles.headerTopRow, { opacity: topRowOpacity, transform: [{ translateY: headerTopRowTranslateY }] }]}>
            <View style={styles.locationInfoBox}>
              <View style={styles.deliveryTitleRow}>
                {/* <Ionicons name="location" size={14} color={colors.primary} style={{marginRight: 6}} />
                <Text style={styles.deliveryTitle}>Delivery</Text> */}
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
                    Address
                  </Text>
                )}
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} style={{marginLeft: 6}} />
              </TouchableOpacity>
            </View>
            <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
              <TouchableOpacity style={styles.avatarBtnCircle} onPress={() => setIsDistanceSheetOpen(true)}>
                  <Ionicons name="navigate-circle-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarBtnCircle} onPress={() => router.push("/(tabs)/profile")}>
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
                icon="clipboard-outline"
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
                onPress={() => router.push({
                  pathname: "/service-selection",
                  params: appliedDistanceKm ? { label: "Health", radiusKm: String(appliedDistanceKm) } : { label: "Health" },
                })}
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
                onPress={() => router.push({
                  pathname: "/service-selection",
                  params: appliedDistanceKm ? { label: "pets", radiusKm: String(appliedDistanceKm) } : { label: "pets" },
                })}
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

      <View style={[styles.bottomSearchOverlay, { bottom: insets.bottom + 18 }]} pointerEvents="box-none">
        {/* Search Bar Dropzone */}
        <Animated.View
          style={[
            styles.searchGlowShell,
            {
              transform: [{ scale: searchBarScale }],
              borderColor: isHoveringSearch ? (theme === 'light' ? '#0F172A' : '#FFFFFF') : colors.border,
              borderWidth: isHoveringSearch ? 2.5 : 2,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.searchGlowLayer,
              {
                opacity: isHoveringSearch ? 1 : searchGlowOpacity,
                transform: [{ rotate: searchGlowRotate }],
              },
            ]}
          >
            <LinearGradient
              colors={["#22D3EE", "#A855F7", "#F97316", "#10B981", "#22D3EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder='Search "milk", "eggs", "bread"'
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </Animated.View>
      </View>

      <LocationPickerSheet 
        isOpen={isLocationSheetOpen} 
        onClose={() => setIsLocationSheetOpen(false)} 
        onSelectAddress={(address) => setSelectedAddress(address)}
      />

      <Modal
        visible={isDistanceSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDistanceSheetOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.distanceModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <TouchableOpacity style={styles.distanceModalScrim} onPress={() => setIsDistanceSheetOpen(false)} />
          <View style={[styles.distanceSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.distanceSheetHandle} />
            <View style={styles.distanceSheetHeader}>
              <View>
                <Text style={styles.distanceTitle}>Customize distance</Text>
                <Text style={styles.distanceSubtitle}>
                  {appliedDistanceKm ? `Filtering within ${appliedDistanceKm} km` : "Showing all nearby options"}
                </Text>
              </View>
              <TouchableOpacity style={styles.distanceCloseBtn} onPress={() => setIsDistanceSheetOpen(false)}>
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {distanceOption === "custom" && (
              <View style={styles.distanceInputWrap}>
                <Ionicons name="navigate-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.distanceInput}
                  value={customDistance}
                  onChangeText={(value) => {
                    setDistanceOption("custom");
                    setCustomDistance(value.replace(/[^0-9.]/g, ""));
                  }}
                  placeholder="Enter distance"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.distanceInputUnit}>km</Text>
              </View>
            )}

            <View style={styles.distancePresetRow}>
              {(["3", "5", "7"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.distanceChip, distanceOption === option && styles.distanceChipActive]}
                  onPress={() => {
                    setDistanceOption(option);
                    setCustomDistance("");
                  }}
                >
                  <Text style={[styles.distanceChipText, distanceOption === option && styles.distanceChipTextActive]}>
                    {option} km
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.distanceChip, distanceOption === "custom" && styles.distanceChipActive]}
                onPress={() => setDistanceOption("custom")}
              >
                <Text style={[styles.distanceChipText, distanceOption === "custom" && styles.distanceChipTextActive]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.distanceApplyBtn} onPress={applyDistanceFilter}>
              <Text style={styles.distanceApplyText}>Apply distance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.distanceClearBtn} onPress={clearDistanceFilter}>
              <Text style={styles.distanceClearText}>Clear all filters</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SkeletonBlock({
  style,
  shimmer,
  shimmerHighlight,
}: {
  style: ViewStyle;
  shimmer: Animated.Value;
  shimmerHighlight: string;
}) {
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  return (
    <View style={[style, { overflow: "hidden" }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { width: 220, transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={["transparent", shimmerHighlight, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

function HomeSkeletonCard({ colors }: { colors: typeof Colors.light }) {
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const shimmer = useRef(new Animated.Value(0)).current;
  const shimmerHighlight = colors.background === Colors.light.background
    ? "rgba(255,255,255,0.72)"
    : "rgba(255,255,255,0.12)";

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return (
    <View style={styles.skeletonCard}>
      <SkeletonBlock style={styles.skeletonImage} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
      <SkeletonBlock style={styles.skeletonLineLarge} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
      <View style={styles.skeletonMetaRow}>
        <SkeletonBlock style={styles.skeletonLineSmall} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
        <View style={styles.skeletonDot} />
        <SkeletonBlock style={styles.skeletonLineSmall} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
      </View>
      <SkeletonBlock style={styles.skeletonOffer} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
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
    gap: 16,
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
    top: 10,
  },
  scrollButtonRight: {
    right: -14,
    top: 10,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  dishesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dishChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingLeft: 5,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1.5,
  },
  dishIconCircle: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },
  dishChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  filterAllActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterVegActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  filterNonVegActive: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  filterTextActive: {
    color: '#FFFFFF',
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
  skeletonCard: {
    marginHorizontal: 16,
    marginBottom: 18,
  },
  skeletonImage: {
    height: 220,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  skeletonLineLarge: {
    width: "82%",
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSecondary,
    marginTop: 14,
  },
  skeletonMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  skeletonLineSmall: {
    width: 84,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceSecondary,
  },
  skeletonDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  skeletonOffer: {
    width: "45%",
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    marginTop: 12,
  },
  bottomSearchOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  searchGlowShell: {
    width: "80%",
    maxWidth: 400,
    borderRadius: 32,
    padding: 2,
    overflow: "hidden",
    backgroundColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
  },
  searchGlowLayer: {
    position: "absolute",
    width: 560,
    height: 560,
    left: -120,
    top: -280,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 8,
    borderRadius: 30,
    width: "100%",
  },
  searchInput: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 13 : 11,
    fontWeight: "500",
    color: colors.text,
    marginLeft: 8,
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
  distanceModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  distanceModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  distanceSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 20,
  },
  distanceSheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  distanceSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  distanceTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
  },
  distanceSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 3,
  },
  distanceCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  distancePresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  distanceChip: {
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  distanceChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  distanceChipTextActive: {
    color: colors.background,
  },
  distanceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  distanceInput: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  distanceInputUnit: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  distanceApplyBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: colors.text,
  },
  distanceApplyText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "900",
  },
  distanceClearBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  distanceClearText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
});
