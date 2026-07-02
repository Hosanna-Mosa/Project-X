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
  Keyboard,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { ServiceCategory } from "@/components/ServiceCategory";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { RestaurantListItem } from "@/components/RestaurantListItem";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const popularTags = [
  { name: "Biryani", icon: "flame-outline", iconFamily: "Ionicons", color: "#EF4444" },
  { name: "Dosa", icon: "restaurant-outline", iconFamily: "Ionicons", color: "#F59E0B" },
  { name: "Idly", icon: "disc-outline", iconFamily: "Ionicons", color: "#10B981" },
  { name: "Fried Rice", icon: "rice", iconFamily: "MaterialCommunityIcons", color: "#06B6D4" },
  { name: "Fast Food", icon: "fast-food-outline", iconFamily: "Ionicons", color: "#EF4444" },
  { name: "Breakfast", icon: "egg-cooking", iconFamily: "MaterialCommunityIcons", color: "#F59E0B" },
  { name: "Healthy", icon: "leaf-outline", iconFamily: "Ionicons", color: "#10B981" },
  { name: "Deals", icon: "percent", iconFamily: "Feather", color: "#E11D48" },
  { name: "Burgers", icon: "hamburger", iconFamily: "MaterialCommunityIcons", color: "#F97316" },
  { name: "Smoothie", icon: "cup-water", iconFamily: "MaterialCommunityIcons", color: "#06B6D4" },
  { name: "Pizza", icon: "pizza-outline", iconFamily: "Ionicons", color: "#E11D48" },
  { name: "Desserts", icon: "ice-cream-outline", iconFamily: "Ionicons", color: "#EC4899" },
  { name: "Noodles", icon: "restaurant-outline", iconFamily: "Ionicons", color: "#8B5CF6" },
  { name: "Chicken", icon: "flame", iconFamily: "Ionicons", color: "#EF4444" },
];

const TAG_SEARCH_MAP: { [key: string]: string } = {
  "Biryani": "Biryani",
  "Dosa": "Dosa",
  "Idly": "Idli",
  "Fried Rice": "Rice",
  "Fast Food": "Burger",
  "Breakfast": "Breakfast",
  "Healthy": "Salad",
  "Deals": "Thali",
  "Burgers": "Burger",
  "Smoothie": "Lassi",
  "Pizza": "Pizza",
  "Desserts": "Waffles",
  "Tea & Coffee": "Coffee",
  "Noodles": "Noodles",
  "Chicken": "Chicken",
  "Paneer": "Paneer",
  "Fish": "Fish"
};

const renderTagIcon = (tag: typeof popularTags[0]) => {
  if (tag.iconFamily === "MaterialCommunityIcons") {
    return <MaterialCommunityIcons name={tag.icon as any} size={16} color={tag.color} />;
  }
  if (tag.iconFamily === "Feather") {
    return <Feather name={tag.icon as any} size={16} color={tag.color} />;
  }
  return <Ionicons name={tag.icon as any} size={16} color={tag.color} />;
};

const HOME_SKELETON_ITEMS = Array.from({ length: 4 }, (_, index) => ({ _id: `home-skeleton-${index}` }));

import * as Location from "expo-location";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("recent_searches");
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load recent searches", e);
      }
    })();
  }, []);

  const addRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    const trimmed = query.trim();
    const newRecent = [trimmed, ...recentSearches.filter(q => q !== trimmed)].slice(0, 5);
    setRecentSearches(newRecent);
    try {
      await AsyncStorage.setItem("recent_searches", JSON.stringify(newRecent));
    } catch (e) {
      console.error("Failed to save recent searches", e);
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem("recent_searches");
  };
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    Animated.spring(searchBarScale, {
      toValue: isHoveringSearch ? 1.06 : 1.0,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [isHoveringSearch]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const userName = user?.name ? user.name.split(" ")[0] : "there";


  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [meatCenters, setMeatCenters] = useState<any[]>([]);
  const [activeService, setActiveService] = useState<'Food' | 'Meat'>('Food');
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [nearbyDriversCount, setNearbyDriversCount] = useState<number | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const vegAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(vegAnim, {
      toValue: foodFilter === 'veg' ? 1 : 0,
      useNativeDriver: false,
      friction: 6,
      tension: 40,
    }).start();
  }, [foodFilter]);
  const [isDistanceSheetOpen, setIsDistanceSheetOpen] = useState(false);
  const [distanceOption, setDistanceOption] = useState<"3" | "5" | "7" | "custom">("5");
  const [customDistance, setCustomDistance] = useState("");
  const [appliedDistanceKm, setAppliedDistanceKm] = useState<number | null>(null);
  const [distanceRefreshKey, setDistanceRefreshKey] = useState(0);

  const [searchedDishes, setSearchedDishes] = useState<any[]>([]);
  const [isSearchingDishes, setIsSearchingDishes] = useState(false);

  const [store149Items, setStore149Items] = useState<any[]>([]);
  const [loading149, setLoading149] = useState(false);

  const cartStore = useCartStore();
  const cartItems = cartStore.items;
  const addCartItem = cartStore.addItem;
  const updateCartQuantity = cartStore.updateQuantity;

  useEffect(() => {
    if (!searchText) {
      setSearchedDishes([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsSearchingDishes(true);
        const queryTerm = TAG_SEARCH_MAP[searchText] || searchText;
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
        const response = await fetch(`${baseUrl}/api/v1/food/search?query=${encodeURIComponent(queryTerm)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchedDishes(data);
        }
      } catch (error) {
        console.error("Error searching dishes:", error);
      } finally {
        setIsSearchingDishes(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

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
      
      // Load selected address from AsyncStorage on screen focus
      (async () => {
        try {
          const activeStr = await AsyncStorage.getItem("active_address");
          if (activeStr) {
            const parsed = JSON.parse(activeStr);
            setSelectedAddress(parsed);
          }
        } catch (e) {
          console.error("Failed to load active address:", e);
        }
      })();

      return () => searchGlowLoop.current?.stop();
    }, [startSearchGlow])
  );

  const getCoords = async () => {
    try {
      // 1. Priority 1: Device GPS location (only check status first)
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'undetermined') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
      }
      
      if (status === 'granted') {
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
      }
    } catch (error) {
      console.warn("Home Screen: GPS fetch failed:", error);
    }

    // 2. Priority 2: Fallback to Selected Address
    if (selectedAddress) {
      const lat = selectedAddress.coordinates?.lat ?? selectedAddress.location?.coordinates?.[1];
      const lng = selectedAddress.coordinates?.lng ?? selectedAddress.location?.coordinates?.[0];
      
      if (lat != null && lng != null) {
        useDeliveryStore.getState().setCurrentCoords({ lat, lng });
        if (selectedAddress.addressLine) {
          useDeliveryStore.getState().setCurrentLocation(selectedAddress.addressLine);
        } else if (selectedAddress.label) {
          useDeliveryStore.getState().setCurrentLocation(selectedAddress.label);
        }
        return { lat, lng };
      }
    }

    // 3. Both are unavailable: Return nulls
    return { lat: null, lng: null };
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

  const fetch149StoreItems = async (lat: number, lng: number) => {
    try {
      setLoading149(true);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
      const response = await fetch(`${baseUrl}/api/v1/food/store-149?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        setStore149Items(data);
      }
    } catch (error) {
      console.error("Error fetching 149 store items:", error);
    } finally {
      setLoading149(false);
    }
  };

  const checkNearbyDrivers = async (lat: number, lng: number) => {
    try {
      setLoadingDrivers(true);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${baseUrl}/api/v1/drivers/nearby?latitude=${lat}&longitude=${lng}&radius=5000`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setNearbyDriversCount(data.length);
        }
      }
    } catch (error) {
      console.error("Error checking nearby drivers:", error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    (async () => {
      setPage(1);
      setHasMore(true);
      setLoading(true);
      const { lat, lng } = await getCoords();
      if (lat && lng) {
        checkNearbyDrivers(lat, lng);
        if (activeService === 'Meat') {
          fetchMeatCenters(lat, lng, 1);
        } else {
          fetchVendors(lat, lng, 1);
          fetch149StoreItems(lat, lng);
        }
      } else {
        setLoading(false);
        setIsLocationSheetOpen(true);
      }
    })();
  }, [selectedAddress, activeService, appliedDistanceKm, distanceRefreshKey]);

  const loadMore = async () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      const { lat, lng } = await getCoords();
      if (lat && lng) {
        if (activeService === 'Meat') fetchMeatCenters(lat, lng, nextPage);
        else fetchVendors(lat, lng, nextPage);
      }
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

  const showHomeSkeleton = (loading && !loadingMore) || loadingDrivers;

  const filteredItems = (activeService === 'Meat' ? meatCenters : restaurants)
    .filter((item) => {
      if (!searchText) return true;
      const query = searchText.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(query);
      const categoryMatch = item.categories && item.categories.some((cat: string) => cat.toLowerCase().includes(query));
      const addressMatch = item.address && item.address.toLowerCase().includes(query);
      return nameMatch || categoryMatch || addressMatch;
    });

  const visibleItems = activeService === 'Meat'
    ? filteredItems
    : foodFilter === 'all'
      ? filteredItems
      : filteredItems.filter(r => foodFilter === 'veg' ? r.isPureVeg : !r.isPureVeg);

  const showCategories = showHomeSkeleton || (nearbyDriversCount > 0 && visibleItems.length > 0);

  const renderHeader = () => {
    if (!showCategories) return null;
    return (
      <>
      {activeService === 'Food' && (
        <>
          <View style={styles.greetingSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.greetingTitle, { marginBottom: 0, flex: 1, marginRight: 10 }]}>
                {getGreeting(userName)}
              </Text>
              
              <TouchableOpacity 
                activeOpacity={0.85}
                onPress={() => setFoodFilter(foodFilter === 'veg' ? 'all' : 'veg')}
              >
                <Animated.View style={[
                  styles.vegMorphBadge,
                  {
                    width: vegAnim.interpolate({ inputRange: [0, 1], outputRange: [38, 85] }),
                    backgroundColor: vegAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.surface, '#16A34A']
                    }),
                    borderColor: vegAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.border, '#15803D']
                    }),
                  }
                ]}>
                  <View style={styles.vegMorphIconWrap}>
                    <Ionicons 
                      name="leaf" 
                      size={14} 
                      color={foodFilter === 'veg' ? '#FFFFFF' : '#16A34A'} 
                    />
                  </View>
                  <Animated.Text 
                    numberOfLines={1}
                    style={[
                      styles.vegMorphText,
                      {
                        opacity: vegAnim,
                        transform: [{
                          translateX: vegAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0]
                          })
                        }]
                      }
                    ]}
                  >
                    VEG
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dishesScrollContent}
              style={styles.dishesScroll}
            >
              <View style={styles.dishesRowsContainer}>
                <View style={styles.dishesRow}>
                  {popularTags.slice(0, 7).map((tag, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.dishChip} 
                      activeOpacity={0.8}
                      onPress={() => {
                        setSearchText(tag.name);
                        setIsSearchActive(true);
                      }}
                    >
                      <View style={[styles.dishIconCircle, { backgroundColor: tag.color + '15' }]}>
                        {renderTagIcon(tag)}
                      </View>
                      <Text style={styles.dishChipText}>{tag.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.dishesRow}>
                  {popularTags.slice(7, 14).map((tag, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.dishChip} 
                      activeOpacity={0.8}
                      onPress={() => {
                        setSearchText(tag.name);
                        setIsSearchActive(true);
                      }}
                    >
                      <View style={[styles.dishIconCircle, { backgroundColor: tag.color + '15' }]}>
                        {renderTagIcon(tag)}
                      </View>
                      <Text style={styles.dishChipText}>{tag.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          {store149Items.length > 0 && (
            <LinearGradient
              colors={theme === 'light' ? ['#F5F3FF', '#EDE9FE', '#F5F3FF'] : ['#2E1065', '#4C1D95', '#2E1065']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.store149Container}
            >
              <View style={styles.store149Header}>
                <View style={{ flex: 1 }}>
                  <View style={styles.store149LogoContainer}>
                    <View style={styles.store149LogoCircle}>
                      <Text style={styles.store149LogoText}>149</Text>
                    </View>
                    <Text style={styles.store149BrandText}>store</Text>
                  </View>
                  <View style={styles.store149Subheader}>
                    <Ionicons name="checkmark-circle" size={14} color={theme === 'light' ? '#7C3AED' : '#C4B5FD'} />
                    <Text style={[styles.store149SubText, { color: theme === 'light' ? '#6D28D9' : '#C4B5FD' }]}>Meals at ₹149 + Free Delivery</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.store149ViewAllBtn} activeOpacity={0.7}>
                  <Text style={styles.store149ViewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={12} color="#0284C7" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.store149ScrollContent}
              >
                {store149Items.map((item) => {
                  const cartItem = cartItems.find((i) => i._id === item._id);
                  
                  const handleAdd = () => {
                    const foodItem = {
                      _id: item._id,
                      name: item.name,
                      description: item.description || "",
                      price: item.price,
                      category: item.category || "149 Store",
                      isVeg: item.isVeg,
                      images: item.images && item.images.length > 0 ? item.images : ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"]
                    };
                    addCartItem(foodItem, item.vendorId);
                  };

                  return (
                    <View key={item._id} style={styles.store149Card}>
                      <View style={styles.store149ImageContainer}>
                        <Image
                          source={{ uri: item.images && item.images.length > 0 ? item.images[0] : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }}
                          style={styles.store149Image}
                        />
                        
                        {/* Diet overlay (top-left) */}
                        <View style={styles.store149DietOverlay}>
                          <View style={[styles.store149DietIcon, { borderColor: item.isVeg ? "#16A34A" : "#E11D48" }]}>
                            <View style={[styles.store149DietDot, { backgroundColor: item.isVeg ? "#16A34A" : "#E11D48" }]} />
                          </View>
                        </View>

                        {/* Rating overlay (top-right) */}
                        <View style={styles.store149RatingOverlay}>
                          <Ionicons name="star" size={9} color="#F59E0B" />
                          <Text style={styles.store149RatingOverlayText}>{item.rating || "4.2"}</Text>
                        </View>

                        {/* Add button overlay */}
                        <View style={styles.store149AddButtonOverlay}>
                          {cartItem ? (
                            <View style={styles.store149QtyPill}>
                              <TouchableOpacity
                                onPress={() => updateCartQuantity(item._id, cartItem.quantity - 1)}
                                style={styles.store149QtyBtn}
                                activeOpacity={0.7}
                              >
                                <Feather name="minus" size={11} color="#002045" />
                              </TouchableOpacity>
                              <Text style={styles.store149QtyText}>{cartItem.quantity}</Text>
                              <TouchableOpacity
                                onPress={handleAdd}
                                style={styles.store149QtyBtn}
                                activeOpacity={0.7}
                              >
                                <Feather name="plus" size={11} color="#002045" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={handleAdd}
                              style={styles.store149AddPill}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.store149AddText}>ADD</Text>
                              <Feather name="plus" size={10} color="#16A34A" style={{ marginLeft: 2 }} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      <View style={styles.store149Details}>
                        <Text style={styles.store149Name} numberOfLines={1}>
                          {item.name}
                        </Text>

                        <View style={styles.store149PriceRow}>
                          <Text style={styles.store149OriginalPrice}>₹{item.originalPrice}</Text>
                          <View style={styles.store149PriceHighlight}>
                            <Text style={styles.store149DealPrice}>₹{item.price}</Text>
                          </View>
                        </View>

                        <Text style={styles.store149Brand} numberOfLines={1}>
                          {item.brand || "KFC"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </LinearGradient>
          )}
        </>
      )}

      {activeService === 'Meat' && (
        <View style={styles.meatBannerRow}>
          <Text style={styles.meatBannerTitle}>🥩 Nearby Meat Centers</Text>
          <Text style={styles.meatBannerSubtitle}>Fresh meat delivered to your door</Text>
        </View>
      )}

     
    </>
    );
  };

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
  // (Duplicate declarations removed - moved above renderHeader)

  const listData = React.useMemo(() => {
    if (showHomeSkeleton) {
      return HOME_SKELETON_ITEMS.map((item) => ({ ...item, isSkeleton: true }));
    }
    if (!loadingDrivers && nearbyDriversCount === 0) {
      return [];
    }
    if (!searchText) {
      return visibleItems.map((item) => ({ ...item, isRestaurant: true }));
    }

    const items: any[] = [];
    // Restaurants Section
    if (visibleItems.length > 0) {
      items.push({ _id: "header-restaurants", isHeader: true, title: "RESTAURANTS" });
      visibleItems.forEach((r) => items.push({ ...r, isRestaurant: true }));
    }
    // Dishes Section
    if (searchedDishes.length > 0) {
      items.push({ _id: "header-dishes", isHeader: true, title: "DISHES & FOOD ITEMS" });
      searchedDishes.forEach((d) => items.push({ ...d, isDish: true }));
    }
    return items;
  }, [showHomeSkeleton, searchText, visibleItems, searchedDishes, loadingDrivers, nearbyDriversCount]);

  return (
    <View style={styles.root}>
      <Animated.FlatList
        data={listData}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          if (item.isSkeleton) {
            return <HomeSkeletonCard colors={colors} />;
          }
          if (item.isHeader) {
            return <Text style={styles.listSectionHeader}>{item.title}</Text>;
          }
          if (item.isRestaurant) {
            return <RestaurantListItem {...item} isMeat={activeService === 'Meat'} />;
          }
          if (item.isDish) {
            return <DishSearchResultItem item={item} colors={colors} styles={styles} />;
          }
          return null;
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => {
          if (showHomeSkeleton || loadingDrivers) return null;
          
          if (searchText) {
            return (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search-outline" size={60} color={colors.textMuted} />
                <Text style={[styles.emptySearchTitle, { color: colors.text }]}>No results found</Text>
                <Text style={[styles.emptySearchSubtitle, { color: colors.textSecondary }]}>
                  We couldn't find any outlets matching "{searchText}"
                </Text>
              </View>
            );
          }

          if (nearbyDriversCount === 0) {
            return (
              <View style={styles.noServiceContainer}>
                <Ionicons name="bicycle-outline" size={80} color={colors.error} />
                <Text style={[styles.noServiceTitle, { color: colors.text }]}>No Riders Available</Text>
                <Text style={[styles.noServiceSubtitle, { color: colors.textSecondary }]}>
                  We don't have riders in this location to deliver your orders. Please try changing your location.
                </Text>
                <TouchableOpacity 
                  style={[styles.noServiceButton, { backgroundColor: colors.primary }]}
                  onPress={() => setIsLocationSheetOpen(true)}
                >
                  <Text style={[styles.noServiceButtonText, { color: colors.surface }]}>Change Location</Text>
                </TouchableOpacity>
              </View>
            );
          }
          
          if (visibleItems.length === 0) {
            const serviceName = activeService === "Meat" ? "meat" : "food";
            return (
              <View style={styles.noServiceContainer}>
                <Ionicons name="location-outline" size={80} color={colors.error} />
                <Text style={[styles.noServiceTitle, { color: colors.text }]}>No Service in this Location</Text>
                <Text style={[styles.noServiceSubtitle, { color: colors.textSecondary }]}>
                  We don't have {serviceName} delivery services in this location. Please try changing your location.
                </Text>
                <TouchableOpacity 
                  style={[styles.noServiceButton, { backgroundColor: colors.primary }]}
                  onPress={() => setIsLocationSheetOpen(true)}
                >
                  <Text style={[styles.noServiceButtonText, { color: colors.surface }]}>Change Location</Text>
                </TouchableOpacity>
              </View>
            );
          }
          
          return null;
        }}
        ListFooterComponent={() => (
          loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 120 }} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.mainScrollContent, 
          { 
            paddingTop: showCategories ? topPadding + 175 : topPadding + 60,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 120
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={false}
        onRefresh={async () => {
          startSearchGlow();
          setPage(1);
          setHasMore(true);
          const { lat, lng } = await getCoords();
          if (activeService === 'Meat') {
            fetchMeatCenters(lat, lng, 1);
          } else {
            fetchVendors(lat, lng, 1);
            fetch149StoreItems(lat, lng);
          }
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
              <TouchableOpacity 
                style={styles.addressSelector} 
                activeOpacity={0.7}
                onPress={() => router.push("/delivery/saved-addresses")}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
                  <Text style={styles.addressHeaderText}>
                    {selectedAddress 
                      ? (selectedAddress.label === "Home" || selectedAddress.label === "Work"
                          ? selectedAddress.label.toUpperCase()
                          : (selectedAddress.label && selectedAddress.label !== "Other" ? selectedAddress.label.toUpperCase() : "ADDRESS"))
                      : "ADDRESS"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            </View>
            {showCategories && (
              <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setIsDistanceSheetOpen(true)}>
                    <MaterialCommunityIcons name="radius-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/(tabs)/profile")}>
                    <Ionicons name="person-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {showCategories && (
            <Animated.View style={[
              styles.categoriesContainer,
              { transform: [{ translateY: categoriesTranslateY }] }
            ]}>
              <ScrollView
                ref={categoriesScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScrollContent}
                scrollEventThrottle={16}
              >
                <ServiceCategory
                  icon="bag-outline"
                  label="Task"
                  onPress={() => router.push({ pathname: "/service-selection", params: { label: "Task" } })}
                />
                <ServiceCategory
                  icon="car-outline"
                  label="Rides"
                  onPress={() => router.push({ pathname: "/all-services" })}
                />
                <ServiceCategory
                  icon="fast-food-outline"
                  label="Food"
                  active={activeService === 'Food'}
                  onPress={() => handleServiceSwitch('Food')}
                />
                <ServiceCategory
                  icon="heart-pulse"
                  iconFamily="MaterialCommunityIcons"
                  label="Health"
                  onPress={() => router.push({
                    pathname: "/service-selection",
                    params: appliedDistanceKm ? { label: "Health", radiusKm: String(appliedDistanceKm) } : { label: "Health" },
                  })}
                />
                <ServiceCategory
                  icon="food-steak"
                  iconFamily="MaterialCommunityIcons"
                  label="Meat"
                  active={activeService === 'Meat'}
                  onPress={() => handleServiceSwitch('Meat')}
                />
                <ServiceCategory
                  icon="paw-outline"
                  label="Pets"
                  onPress={() => router.push({
                    pathname: "/service-selection",
                    params: appliedDistanceKm ? { label: "pets", radiusKm: String(appliedDistanceKm) } : { label: "pets" },
                  })}
                />
              </ScrollView>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      {showCategories && (
        <View
          style={[
            styles.bottomSearchOverlay,
            { 
              bottom: keyboardHeight > 0 
                ? keyboardHeight + (Platform.OS === "ios" ? 10 : 12) 
                : insets.bottom + 18
            }
          ]}
          pointerEvents="box-none"
        >
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
            <TouchableOpacity 
              style={styles.searchBar} 
              activeOpacity={0.9} 
              onPress={() => setIsSearchActive(true)}
            >
              <Ionicons name="search" size={18} color={colors.primary} />
              <Text style={[styles.searchInput, { color: searchText ? colors.text : colors.textSecondary, paddingTop: Platform.OS === 'ios' ? 0 : 3 }]}>
                {searchText || 'Search "milk", "eggs", "bread"'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* DOORDASH STYLE SEARCH SCREEN OVERLAY */}
      <Modal
        visible={isSearchActive}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsSearchActive(false)}
      >
        <View style={[styles.ddSearchRoot, { paddingTop: insets.top }]}>
          {/* Header Row */}
          <View style={styles.ddSearchHeader}>
            <TouchableOpacity 
              onPress={() => {
                setIsSearchActive(false);
                setSearchText("");
              }}
              style={styles.ddSearchCloseBtn}
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.ddSearchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.ddSearchInput}
                placeholder="Search food, dishes, restaurants"
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={() => addRecentSearch(searchText)}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Body Content */}
          {!searchText ? (
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.ddSearchBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <View style={styles.ddRecentSection}>
                  <View style={styles.ddSectionHeader}>
                    <Text style={styles.ddSectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={clearRecentSearches}>
                      <Text style={styles.ddClearLink}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.ddRecentList}>
                    {recentSearches.map((query, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.ddRecentItem}
                        onPress={() => setSearchText(query)}
                      >
                        <Ionicons name="time-outline" size={20} color={colors.textMuted} style={{ marginRight: 12 }} />
                        <Text style={styles.ddRecentText}>{query}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Recommended Chips */}
              <View style={styles.ddRecommendedSection}>
                <Text style={styles.ddSectionTitle}>Recommended</Text>
                <View style={styles.ddRecommendedGrid}>
                  {["Ice cream", "Grocery", "Cat food", "Cookie", "Soda", "Tacos", "Burger", "Pizza"].map((rec, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={styles.ddRecChip}
                      onPress={() => setSearchText(rec)}
                    >
                      <Text style={styles.ddRecChipText}>{rec}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cuisines Grid */}
              <View style={styles.ddCuisinesSection}>
                <Text style={styles.ddSectionTitle}>Cuisines</Text>
                <View style={styles.ddCuisinesGrid}>
                  {[
                    { name: "Fast Food", emoji: "🍟", query: "Burger" },
                    { name: "Breakfast", emoji: "🍳", query: "Breakfast" },
                    { name: "Pizza", emoji: "🍕", query: "Pizza" },
                    { name: "Indian", emoji: "🍛", query: "Biryani" },
                    { name: "Desserts", emoji: "🍰", query: "Waffles" },
                    { name: "Chinese", emoji: "🍜", query: "Noodles" }
                  ].map((item, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={styles.ddCuisineCard}
                      onPress={() => setSearchText(item.query)}
                    >
                      <View style={styles.ddCuisineIconBg}>
                        <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                      </View>
                      <Text style={styles.ddCuisineText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : (
            /* Search Results */
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <FlatList
                data={listData.filter((item: any) => item.isHeader || item.isRestaurant || item.isDish)}
                keyExtractor={(item) => item._id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }: any) => {
                  if (item.isHeader) {
                    return <Text style={styles.listSectionHeader}>{item.title}</Text>;
                  }
                  if (item.isRestaurant) {
                    return <RestaurantListItem {...item} isMeat={activeService === 'Meat'} />;
                  }
                  if (item.isDish) {
                    return <DishSearchResultItem item={item} colors={colors} styles={styles} />;
                  }
                  return null;
                }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearchContainer}>
                    <Ionicons name="search-outline" size={60} color={colors.textMuted} />
                    <Text style={[styles.emptySearchTitle, { color: colors.text }]}>No results found</Text>
                    <Text style={[styles.emptySearchSubtitle, { color: colors.textSecondary }]}>
                      We couldn't find any outlets matching "{searchText}"
                    </Text>
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </Modal>

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

interface DishSearchResultItemProps {
  item: any;
  colors: any;
  styles: any;
}

function DishSearchResultItem({ item, colors, styles }: DishSearchResultItemProps) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find((i) => i._id === item._id);
  const vendor = item.vendorId;

  const handleAdd = () => {
    if (vendor?._id) {
      addItem(item, vendor._id);
    }
  };

  const handleNavigateToMenu = () => {
    if (vendor?._id) {
      router.push({
        pathname: "/restaurant-menu",
        params: {
          id: vendor._id,
          name: vendor.name,
          image: vendor.image || "",
          rating: String(vendor.rating || "4.8"),
          reviews: vendor.reviews || "2k+",
          isMeat: "false",
          highlightDishId: item._id,
        },
      });
    }
  };

  return (
    <View style={styles.dishMenuItem}>
      {/* Clickable details section */}
      <TouchableOpacity 
        style={styles.dishItemInfo} 
        activeOpacity={0.7} 
        onPress={handleNavigateToMenu}
      >
        <View style={styles.dishItemTitleRow}>
          <View style={[styles.dishVegIndicator, { borderColor: item.isVeg ? "#16A34A" : "#E11D48" }]}>
            <View style={[styles.dishVegDot, { backgroundColor: item.isVeg ? "#16A34A" : "#E11D48" }]} />
          </View>
          <Text style={styles.dishItemName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <Text style={styles.dishItemPrice}>₹{item.price}</Text>
        <Text style={styles.dishItemDesc} numberOfLines={2}>
          {item.description}
        </Text>
        {vendor && (
          <View style={styles.dishVendorRow}>
            <Ionicons name="storefront-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.dishVendorText, { color: colors.textSecondary }]} numberOfLines={1}>
              from <Text style={{ fontFamily: "Inter_700Bold", textDecorationLine: "underline" }}>{vendor.name}</Text>
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Clickable image container */}
      <View style={styles.dishItemImageContainer}>
        <TouchableOpacity activeOpacity={0.8} onPress={handleNavigateToMenu}>
          <Image 
            source={{ uri: item.images && item.images.length > 0 ? item.images[0] : "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400" }} 
            style={styles.dishItemImage} 
          />
        </TouchableOpacity>
        <View style={styles.dishAddButtonOverlay}>
          {cartItem ? (
            <View style={styles.dishQuantityPill}>
              <TouchableOpacity 
                onPress={() => updateQuantity(item._id, cartItem.quantity - 1)}
                style={styles.dishQtyActionBtn}
                activeOpacity={0.7}
              >
                <Feather name="minus" size={12} color="#002045" />
              </TouchableOpacity>
              <Text style={styles.dishQtyText}>{cartItem.quantity}</Text>
              <TouchableOpacity 
                onPress={handleAdd}
                style={styles.dishQtyActionBtn}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={12} color="#002045" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={handleAdd}
              style={styles.dishAddPill}
              activeOpacity={0.85}
            >
              <Text style={styles.dishAddPillText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    backgroundColor: colors.background,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  locationInfoBox: {
    flex: 1,
  },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  addressSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    flexShrink: 1,
  },
  iconBtn: {
    padding: 4,
  },
  topVegNonVegToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 2,
    gap: 2,
  },
  topToggleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 3,
  },
  topToggleOptionVegActive: {
    backgroundColor: "#16A34A",
  },
  topToggleOptionNonVegActive: {
    backgroundColor: "#E11D48",
  },
  topToggleText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  topToggleTextActive: {
    color: "#ffffff",
  },
  categoriesContainer: {
    marginTop: 8,
    paddingBottom: 4,
  },
  categoriesScrollContent: {
    flexDirection: "row",
    gap: 16,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 15,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  vegMorphBadge: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vegMorphIconWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegMorphText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  dishesScroll: {
    marginHorizontal: -16,
    marginTop: 4,
  },
  dishesScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  dishesRowsContainer: {
    flexDirection: "column",
    gap: 8,
  },
  dishesRow: {
    flexDirection: "row",
    gap: 8,
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
  store149Container: {
    borderRadius: 22,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  store149Header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  store149LogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  store149LogoCircle: {
    backgroundColor: "#7C3AED",
    width: 40,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: "-6deg" }],
  },
  store149LogoText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  store149BrandText: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
  },
  store149Subheader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  store149SubText: {
    fontSize: 12,
    fontWeight: "700",
  },
  store149ViewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  store149ViewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },
  store149ScrollContent: {
    gap: 12,
    paddingVertical: 8,
    paddingRight: 16,
  },
  store149Card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "visible",
  },
  store149ImageContainer: {
    position: "relative",
    width: 140,
    height: 120,
    borderRadius: 18,
  },
  store149Image: {
    width: 140,
    height: 120,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
  },
  store149DietOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 3,
    borderRadius: 4,
    zIndex: 4,
  },
  store149RatingOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 4,
  },
  store149RatingOverlayText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0F172A",
  },
  store149AddButtonOverlay: {
    position: "absolute",
    bottom: -12,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  store149AddPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#16A34A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 55,
    justifyContent: "center",
  },
  store149AddText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#16A34A",
  },
  store149QtyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#002045",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    width: 65,
  },
  store149QtyBtn: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  store149QtyText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#002045",
  },
  store149Details: {
    paddingHorizontal: 10,
    paddingTop: 16,
    gap: 4,
  },
  store149DietIcon: {
    borderWidth: 1,
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
  },
  store149DietDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  store149Name: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.text,
  },
  store149PriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  store149OriginalPrice: {
    fontSize: 10,
    color: colors.textSecondary,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  store149PriceHighlight: {
    backgroundColor: "#FEF08A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#EAB308",
  },
  store149DealPrice: {
    fontSize: 10,
    fontWeight: "900",
    color: "#B45309",
  },
  store149Brand: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
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
  emptySearchContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptySearchTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  emptySearchSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
  },
  noServiceContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  noServiceTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  noServiceSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  noServiceButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noServiceButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  listSectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: colors.textSecondary,
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  dishMenuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dishItemInfo: {
    flex: 1,
    paddingRight: 16,
  },
  dishItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dishVegIndicator: {
    borderWidth: 1,
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
  },
  dishVegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dishItemName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: colors.text,
    flex: 1,
  },
  dishItemPrice: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
    marginTop: 4,
  },
  dishItemDesc: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  dishVendorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  dishVendorText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  dishItemImageContainer: {
    width: 90,
    height: 90,
    position: "relative",
  },
  dishItemImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
  },
  dishAddButtonOverlay: {
    position: "absolute",
    bottom: -8,
    left: 8,
    right: 8,
    alignItems: "center",
  },
  dishAddPill: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 70,
    alignItems: "center",
  },
  dishAddPillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#16A34A",
  },
  dishQuantityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    gap: 8,
  },
  dishQtyActionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dishQtyText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: colors.text,
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
  searchSheetRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ddSearchRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ddSearchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
    gap: 12,
  },
  ddSearchCloseBtn: {
    padding: 4,
  },
  ddSearchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ddSearchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  ddSearchBody: {
    padding: 20,
    paddingBottom: 40,
  },
  ddSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ddSectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
    marginTop: 12,
    marginBottom: 16,
  },
  ddClearLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  ddRecentSection: {
    marginBottom: 28,
  },
  ddRecentList: {
    gap: 16,
  },
  ddRecentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  ddRecentText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  ddRecommendedSection: {
    marginBottom: 28,
  },
  ddRecommendedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ddRecChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ddRecChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  ddCuisinesSection: {
    marginBottom: 20,
  },
  ddCuisinesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  ddCuisineCard: {
    width: (Dimensions.get("window").width - 64) / 3, // fits 3 items perfectly with gaps
    alignItems: "center",
    marginBottom: 16,
  },
  ddCuisineIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ddCuisineText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  attachedSearchSheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginBottom: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
    gap: 12,
  },
  searchSheetBackBtn: {
    padding: 4,
  },
  searchSheetInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSheetInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  searchSheetMic: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchSheetContent: {
    padding: 20,
  },
  recentSearchesSection: {
    marginBottom: 30,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  clearRecentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E11D48',
  },
  recentSearchesList: {
    gap: 16,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentSearchText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  suggestionsSection: {
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
