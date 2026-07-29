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
import { moderateScale } from "react-native-size-matters";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { ServiceCategory } from "@/components/ServiceCategory";
import { useHomeStore } from "@/contexts/homeStore";
import { RestaurantListItem } from "@/components/RestaurantListItem";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuthStore } from "@/contexts/authStore";
import { useCartStore } from "@/contexts/cartStore";
import { customFetch } from "@/utils/api/custom-fetch";

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

const GRADIENT_COLORS = ["#7C3AED", "#EC4899", "#EF4444", "#F97316", "#F59E0B", "#10B981", "#06B6D4", "#3B82F6"];

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
  { name: "Breakfast", icon: "egg-fried", iconFamily: "MaterialCommunityIcons", color: "#F59E0B" },
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

const ServiceCategoryNew = ({ icon, label, active, onPress, iconFamily = 'Ionicons' }: any) => {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', width: 64 }}>
      <View style={{
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#F5F3FF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4
      }}>
        {iconFamily === 'MaterialCommunityIcons' ?
          <MaterialCommunityIcons name={icon} size={26} color="#6D28D9" /> :
          <Ionicons name={icon} size={26} color="#6D28D9" />
        }
      </View>
      <Text style={{ marginTop: 10, fontSize: 11, fontWeight: '800', color: active ? '#7C3AED' : '#374151', letterSpacing: 0.5 }}>{label}</Text>
    </TouchableOpacity>
  );
};

const TagPill = ({ tag }: any) => {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
      {renderTagIcon(tag)}
      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#374151' }}>{tag.name}</Text>
    </TouchableOpacity>
  );
};

import * as Location from "expo-location";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    restaurants,
    setRestaurants,
    meatCenters,
    setMeatCenters,
    nearbyDriversCount,
    setNearbyDriversCount,
    loading,
    setLoading,
    loadingDrivers,
    setLoadingDrivers,
    store149Items,
    setStore149Items,
    activeService,
    setActiveService,
  } = useHomeStore();

  const [searchText, setSearchText] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchTranslateY = useRef(new Animated.Value(-Dimensions.get('window').height)).current;
  const searchBackdropOpacity = useRef(new Animated.Value(0)).current;
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (isSearchActive) {
      setIsSearchVisible(true);
      // Entry animation is handled by onShow in Modal
    } else if (isSearchVisible) {
      Animated.parallel([
        Animated.timing(searchTranslateY, {
          toValue: -Dimensions.get('window').height,
          duration: 300,
          easing: Easing.in(Easing.poly(3)),
          useNativeDriver: true,
        }),
        Animated.timing(searchBackdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => setIsSearchVisible(false));
    }
  }, [isSearchActive]);
  const [banners, setBanners] = useState<any[]>([]);
  const [hasShownStartupAd, setHasShownStartupAd] = useState(false);
  const [activeStartupAd, setActiveStartupAd] = useState<any | null>(null);

  const getInitialWord = () => {
    const today = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[today.getDay()];
  };

  const [displayText, setDisplayText] = useState(getInitialWord());
  const [isFestival, setIsFestival] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 550);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId: any;

    const runTypewriter = async () => {
      const today = new Date();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[today.getDay()];

      const month = String(today.getMonth() + 1).padStart(2, "0");
      const date = String(today.getDate()).padStart(2, "0");
      const key = `${month}-${date}`;
      const festivalName = FESTIVALS[key] || "Christmas";

      let currentWord = dayName;
      let nextIsFestival = true;

      // Typewriter loop
      while (active) {
        // Wait 4 seconds
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 4000);
        });
        if (!active) break;

        // 1. Backspace (erase) current word in chunks of 2 characters
        for (let i = currentWord.length; i >= 0; i -= 2) {
          if (!active) break;
          setDisplayText(currentWord.slice(0, i));
          await new Promise((resolve) => {
            timeoutId = setTimeout(resolve, 10);
          });
        }
        if (!active) break;
        setDisplayText(""); // Ensure completely erased

        // Swap target word and toggle festival flag
        const nextWord = nextIsFestival ? festivalName : dayName;
        setIsFestival(nextIsFestival);
        nextIsFestival = !nextIsFestival;
        currentWord = nextWord;

        // 2. Type (write) new word in chunks of 2 characters
        for (let i = 0; i <= currentWord.length; i += 2) {
          if (!active) break;
          const sliceEnd = Math.min(i, currentWord.length);
          setDisplayText(currentWord.slice(0, sliceEnd));
          await new Promise((resolve) => {
            timeoutId = setTimeout(resolve, 15);
          });
        }
        if (!active) break;
        setDisplayText(currentWord); // Ensure fully typed
        if (!active) break;
      }
    };

    runTypewriter();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const screenWidth = Dimensions.get('window').width;
  const carouselRef = useRef<ScrollView>(null);
  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const bannerIndexRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      let next = bannerIndexRef.current + 1;
      if (next > 3) next = 0;
      if (carouselRef.current) {
        carouselRef.current.scrollTo({ x: next * screenWidth, animated: true });
      }
      bannerIndexRef.current = next;
    }, 4000);
    return () => clearInterval(interval);
  }, [screenWidth]);

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


  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isAddressLoaded, setIsAddressLoaded] = useState(false);
  const [hasNoLocation, setHasNoLocation] = useState(false);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const vegAnim = useRef(new Animated.Value(0)).current;
  const addressResolveRef = useRef<(() => void) | null>(null);
  const hasRedirectedRef = useRef(false);

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
        const data = await customFetch<any>(`/api/v1/food/search?query=${encodeURIComponent(queryTerm)}`);
        setSearchedDishes(data);
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
        } finally {
          setIsAddressLoaded(true);
        }
      })();

      // Load banners
      (async () => {
        try {
          const response = await customFetch<any>('/api/v1/banners');
          if (response && response.data) {
            setBanners(response.data);
            const startupAds = response.data.filter((b: any) => b.itemType === 'ad' && b.position === 'startup');
            if (startupAds.length > 0 && !hasShownStartupAd) {
              setActiveStartupAd(startupAds[0]);
              setHasShownStartupAd(true);
            }
          }
        } catch (e) {
          console.error("Failed to load banners:", e);
        }
      })();

      return () => searchGlowLoop.current?.stop();
    }, [startSearchGlow])
  );

  const getCoords = async () => {
    // 1. Priority 1: Use Selected Address if available
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

    try {
      // 2. Priority 2: Fallback to Device GPS location
      const gpsDeniedBefore = await AsyncStorage.getItem("gps_permission_denied");
      if (gpsDeniedBefore !== "true") {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'undetermined') {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          status = newStatus;
        }

        if (status === 'granted') {
          let loc = null;
          try {
            const locPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const timeoutPromise = new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error("Location fetch timeout")), 8000)
            );
            loc = await Promise.race([locPromise, timeoutPromise]);
          } catch (e) {
            console.warn("Home Screen: High accuracy location failed/timed out, trying last known...", e);
            loc = await Location.getLastKnownPositionAsync();
          }

          if (!loc) {
            console.warn("Home Screen: Could not get any location");
            return { lat: null, lng: null };
          }

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
        } else {
          // User denied permission, record in AsyncStorage so we don't prompt on reload
          await AsyncStorage.setItem("gps_permission_denied", "true");
        }
      }
    } catch (error) {
      console.warn("Home Screen: GPS fetch failed:", error);
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
      const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
      const data = await customFetch<any>(`/api/v1/vendors/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20${radiusParam}`);
      if (Array.isArray(data)) {
        if (data.length < 20) setHasMore(false); else setHasMore(true);
        if (pageNum === 1) {
          setRestaurants(data);
        } else {
          setRestaurants(prev => {
            const newItems = data.filter(d => !prev.some(p => p._id === d._id));
            return [...prev, ...newItems];
          });
        }
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
      const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
      const data = await customFetch<any>(`/api/v1/meat/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20${radiusParam}`);
      if (Array.isArray(data)) {
        if (data.length < 20) setHasMore(false); else setHasMore(true);
        if (pageNum === 1) {
          setMeatCenters(data);
        } else {
          setMeatCenters(prev => {
            const newItems = data.filter(d => !prev.some(p => p._id === d._id));
            return [...prev, ...newItems];
          });
        }
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
      const data = await customFetch<any>(`/api/v1/food/store-149?lat=${lat}&lng=${lng}`);
      setStore149Items(data);
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
      const headers: any = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(
        `${baseUrl}/api/v1/drivers/nearby?latitude=${lat}&longitude=${lng}&radius=5000`,
        { headers }
      );
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
    if (!isAddressLoaded) return;

    (async () => {
      const { lat, lng } = await getCoords();
      if (lat && lng) {
        setHasNoLocation(false);
        // Check if the store already has the correct fetched data for these coords and service
        const storeState = useHomeStore.getState();
        if (
          storeState.lastFetchedCoords &&
          storeState.lastFetchedCoords.lat === lat &&
          storeState.lastFetchedCoords.lng === lng &&
          storeState.lastFetchedService === activeService
        ) {
          // Already fully fetched! Resolve address selection resolver if pending and exit
          if (addressResolveRef.current) {
            addressResolveRef.current();
            addressResolveRef.current = null;
          }
          return;
        }

        setPage(1);
        setHasMore(true);
        setLoading(true);
        setLoadingDrivers(true); // Force true here as well
        // Wait for all initial fetches to complete
        try {
          // Add a 5 second timeout so we don't hang on skeletons forever
          const fetchPromise = Promise.all([
            checkNearbyDrivers(lat, lng),
            activeService === 'Meat'
              ? fetchMeatCenters(lat, lng, 1)
              : Promise.all([
                fetchVendors(lat, lng, 1),
                fetch149StoreItems(lat, lng)
              ])
          ]);

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout after 15 seconds")), 15000);
          });

          await Promise.race([fetchPromise, timeoutPromise]);
        } catch (e) {
          console.warn("Home Screen: Initial fetches timed out or failed (likely slow dev server):", e);
        } finally {
          // FORCE SET FALSE REGARDLESS OF INDIVIDUAL CATCH BLOCKS OR TIMEOUT
          setLoading(false);
          setLoadingDrivers(false);
        }

        // Cache the coordinates and service in the shared store
        useHomeStore.setState({
          lastFetchedCoords: { lat, lng },
          lastFetchedService: activeService
        });
      } else {
        setHasNoLocation(true);
        setPage(1);
        setHasMore(true);
        setLoading(false);
        setLoadingDrivers(false);

        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.push("/delivery/saved-addresses");
        }
      }

      // Trigger the modal address selection resolver once loaded
      if (addressResolveRef.current) {
        addressResolveRef.current();
        addressResolveRef.current = null;
      }
    })();
  }, [isAddressLoaded, selectedAddress, activeService, appliedDistanceKm, distanceRefreshKey]);

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
    
    // Auto scroll the banner carousel to match selected service
    const index = service === 'Food' ? 0 : 3;
    carouselRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const applyDistanceFilter = () => {
    setIsDistanceSheetOpen(false);
    useHomeStore.setState({ lastFetchedCoords: null });
    setLoading(true);
    setAppliedDistanceKm(selectedDistanceKm);
    setDistanceRefreshKey((value) => value + 1);
  };

  const clearDistanceFilter = () => {
    setDistanceOption("5");
    setCustomDistance("");
    setAppliedDistanceKm(null);
    useHomeStore.setState({ lastFetchedCoords: null });
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
      : filteredItems.filter((r) => {
          if (r.isPureVeg === true || r.isVeg === true) return true;
          if (Array.isArray(r.categories)) {
            const hasVegCat = r.categories.some((cat: string) =>
              cat.toLowerCase().includes("veg") && !cat.toLowerCase().includes("non")
            );
            if (hasVegCat) return true;
          }
          if (r.name && (r.name.toLowerCase().includes("veg") || r.name.toLowerCase().includes("tiffin") || r.name.toLowerCase().includes("sweets") || r.name.toLowerCase().includes("pure veg"))) {
            return true;
          }
          return false;
        });

  const showCategories = !hasNoLocation && (showHomeSkeleton || loadingDrivers || (nearbyDriversCount ?? 0) > 0);




  const Store149Card = ({ item }: { item: any }) => {
    const { items: cartItems, addItem: addCartItem, updateQuantity: updateCartQuantity } = useCartStore();
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
      <View style={{ width: 160, backgroundColor: '#fff', borderRadius: 16, padding: 8, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 }}>
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.images && item.images.length > 0 ? item.images[0] : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }}
            style={{ width: '100%', height: 120, borderRadius: 12 }}
          />
          {/* Veg icon */}
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#fff', padding: 2, borderRadius: 4 }}>
            <View style={{ borderWidth: 1, borderColor: item.isVeg ? '#16A34A' : '#E11D48', padding: 2, borderRadius: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.isVeg ? '#16A34A' : '#E11D48' }} />
            </View>
          </View>
          {/* Rating */}
          <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginLeft: 2, color: '#111827' }}>{item.rating || "4.8"}</Text>
          </View>
          {/* ADD Button */}
          <View style={{ position: 'absolute', bottom: -12, alignSelf: 'center', zIndex: 10 }}>
            {cartItem ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3, borderWidth: 1, borderColor: '#16A34A' }}>
                <TouchableOpacity onPress={() => updateCartQuantity(item._id, cartItem.quantity - 1)} style={{ padding: 4 }}>
                  <Feather name="minus" size={12} color="#16A34A" />
                </TouchableOpacity>
                <Text style={{ marginHorizontal: 8, fontWeight: 'bold', color: '#16A34A' }}>{cartItem.quantity}</Text>
                <TouchableOpacity onPress={handleAdd} style={{ padding: 4 }}>
                  <Feather name="plus" size={12} color="#16A34A" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleAdd} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3 }}>
                <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 12 }}>ADD</Text>
                <Feather name="plus" size={12} color="#16A34A" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' }}>₹{item.originalPrice || item.price + 50}</Text>
            <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>₹{item.price}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }} numberOfLines={1}>{item.brand || "Minerva Coffee Shop"}</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const hasRidersButNoVendors = !showHomeSkeleton && !loadingDrivers && (nearbyDriversCount ?? 0) > 0 && visibleItems.length === 0;
    if (!showCategories || ((!showHomeSkeleton && visibleItems.length === 0) && !hasRidersButNoVendors)) return null;

    const getParallaxStyle = (index: number) => {
      const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];
      const translateX = bannerScrollX.interpolate({
        inputRange,
        outputRange: [screenWidth * 0.5, 0, -screenWidth * 0.5],
        extrapolate: 'clamp'
      });
      const opacity = bannerScrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp'
      });
      const scale = bannerScrollX.interpolate({
        inputRange,
        outputRange: [0.8, 1, 0.8],
        extrapolate: 'clamp'
      });
      return { opacity, transform: [{ translateX }, { scale }] };
    };

    const heroBanners = banners.filter(b => (!b.itemType || b.itemType === 'banner') && (!b.position || b.position === 'hero' || b.position === 'inline'));
    const greetingAds = banners.filter(b => b.itemType === 'ad' && b.position === 'below_greetings');

    return (
      <View style={{ backgroundColor: '#FAFAFA', paddingBottom: 20 }}>
        {/* NEW HEADER AREA */}
        <View style={{ overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: '#4C1D95' }}>
          <Animated.ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: bannerScrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              bannerIndexRef.current = newIndex;
            }}
          >
            {/* DYNAMIC HERO BANNERS */}
            {heroBanners.length > 0 ? (
              heroBanners.map((banner, index) => (
                <LinearGradient
                  key={banner._id || index}
                  colors={banner.color1 && banner.color2 ? [banner.color1, banner.color2] : ['#4C1D95', '#2E1065']}
                  style={{ width: screenWidth, paddingBottom: moderateScale(45), paddingTop: insets.top + moderateScale(50) }}
                >
                  <Animated.View style={[{ flexDirection: 'row', paddingHorizontal: 16, minHeight: moderateScale(120), alignItems: 'center' }, getParallaxStyle(index)]}>
                    <View style={{ flex: 1.4, justifyContent: 'center', paddingRight: 8 }}>
                      <Text style={{ color: '#fff', fontSize: moderateScale(24), fontWeight: '800', lineHeight: moderateScale(28) }}>{banner.title}</Text>
                      {banner.description && (
                        <Text style={{ color: '#C4B5FD', fontSize: moderateScale(13), marginTop: moderateScale(8) }}>{banner.description}</Text>
                      )}
                    </View>
                    <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'flex-end' }}>
                      <Image source={{ uri: banner.imageUrl }} style={{ width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60) }} resizeMode="cover" />
                    </View>
                  </Animated.View>
                </LinearGradient>
              ))
            ) : (
              <>
                {/* FALLBACK HARDCODED BANNERS */}
                {/* FOOD BANNER */}
            <LinearGradient
              colors={['#4C1D95', '#2E1065']}
              style={{ width: screenWidth, paddingBottom: moderateScale(45), paddingTop: insets.top + moderateScale(50) }}
            >
              <Animated.View style={[{ flexDirection: 'row', paddingHorizontal: 16, minHeight: moderateScale(120), alignItems: 'center' }, getParallaxStyle(0)]}>
                <View style={{ flex: 1.4, justifyContent: 'center', paddingRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: moderateScale(24), fontWeight: '800', lineHeight: moderateScale(28) }}>Craving something delicious?</Text>
                  <Text style={{ color: '#C4B5FD', fontSize: moderateScale(13), marginTop: moderateScale(8) }}>Good food, good mood!</Text>
                </View>
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'flex-end' }}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }} style={{ width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60) }} resizeMode="cover" />
                </View>
              </Animated.View>
            </LinearGradient>

            {/* TASK BANNER */}
            <LinearGradient
              colors={['#0F766E', '#042F2E']}
              style={{ width: screenWidth, paddingBottom: moderateScale(45), paddingTop: insets.top + moderateScale(50) }}
            >
              <Animated.View style={[{ flexDirection: 'row', paddingHorizontal: 16, minHeight: moderateScale(120), alignItems: 'center' }, getParallaxStyle(1)]}>
                <View style={{ flex: 1.4, justifyContent: 'center', paddingRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: moderateScale(24), fontWeight: '800', lineHeight: moderateScale(28) }}>Need a helping hand today?</Text>
                  <Text style={{ color: '#99F6E4', fontSize: moderateScale(13), marginTop: moderateScale(8) }}>We get your chores done!</Text>
                </View>
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'flex-end' }}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400' }} style={{ width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60) }} resizeMode="cover" />
                </View>
              </Animated.View>
            </LinearGradient>

            {/* RIDES BANNER */}
            <LinearGradient
              colors={['#C2410C', '#7F1D1D']}
              style={{ width: screenWidth, paddingBottom: moderateScale(45), paddingTop: insets.top + moderateScale(50) }}
            >
              <Animated.View style={[{ flexDirection: 'row', paddingHorizontal: 16, minHeight: moderateScale(120), alignItems: 'center' }, getParallaxStyle(2)]}>
                <View style={{ flex: 1.4, justifyContent: 'center', paddingRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: moderateScale(24), fontWeight: '800', lineHeight: moderateScale(28) }}>Going somewhere?</Text>
                  <Text style={{ color: '#FED7AA', fontSize: moderateScale(13), marginTop: moderateScale(8) }}>Book a comfortable ride now!</Text>
                </View>
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'flex-end' }}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400' }} style={{ width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60) }} resizeMode="cover" />
                </View>
              </Animated.View>
            </LinearGradient>

            {/* MEAT BANNER */}
            <LinearGradient
              colors={['#9F1239', '#4C0519']}
              style={{ width: screenWidth, paddingBottom: moderateScale(45), paddingTop: insets.top + moderateScale(50) }}
            >
              <Animated.View style={[{ flexDirection: 'row', paddingHorizontal: 16, minHeight: moderateScale(120), alignItems: 'center' }, getParallaxStyle(3)]}>
                <View style={{ flex: 1.4, justifyContent: 'center', paddingRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: moderateScale(24), fontWeight: '800', lineHeight: moderateScale(28) }}>Fresh Meat Daily!</Text>
                  <Text style={{ color: '#FECDD3', fontSize: moderateScale(13), marginTop: moderateScale(8) }}>High quality cuts delivered.</Text>
                </View>
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'flex-end' }}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1588168333986-50845fce0ba9?w=400' }} style={{ width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60) }} resizeMode="cover" />
                </View>
              </Animated.View>
            </LinearGradient>
              </>
            )}
          </Animated.ScrollView>

          {/* Dots Indicator */}
          <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, zIndex: 5 }}>
            {Array.from({ length: heroBanners.length > 0 ? heroBanners.length : 4 }).map((_, i) => {
              const width = bannerScrollX.interpolate({
                inputRange: [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth],
                outputRange: [6, 20, 6],
                extrapolate: 'clamp'
              });
              const backgroundColor = bannerScrollX.interpolate({
                inputRange: [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth],
                outputRange: ['rgba(255,255,255,0.4)', 'rgba(255,255,255,1)', 'rgba(255,255,255,0.4)'],
                extrapolate: 'clamp'
              });
              return (
                <Animated.View
                  key={i}
                  style={{ width, height: 6, borderRadius: 3, backgroundColor }}
                />
              );
            })}
          </View>

          {/* Fixed Top Bar */}
          <View style={{ position: 'absolute', top: insets.top + 15, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} pointerEvents="box-none">
            <TouchableOpacity onPress={() => router.push("/delivery/saved-addresses")} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                {selectedAddress ? (selectedAddress.label && selectedAddress.label !== "Other" ? selectedAddress.label.toUpperCase() : "ADDRESS") : "ADDRESS"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setIsDistanceSheetOpen(true)}>
                <MaterialCommunityIcons name="radius-outline" size={26} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
                <Ionicons name="person-outline" size={26} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>


        {/* Floating Search Bar Row with Veg Toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: -22, zIndex: 10 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              height: 44,
              backgroundColor: '#fff',
              borderRadius: 22,
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 18,
              paddingRight: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 6,
            }}
            activeOpacity={0.9}
            onPress={() => setIsSearchActive(true)}
          >
            <Text style={{ flex: 1, color: '#9CA3AF', fontSize: 13 }} numberOfLines={1}>
              Search for biryani, pizza, burger...
            </Text>
            <View style={{ backgroundColor: '#7C3AED', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {activeService === 'Food' && (
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => setFoodFilter(foodFilter === 'veg' ? 'all' : 'veg')}
            >
              <Animated.View style={[
                styles.vegMorphBadge,
                {
                  width: vegAnim.interpolate({ inputRange: [0, 1], outputRange: [44, 85] }),
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
                    size={15} 
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
          )}
        </View>

        {/* Service Categories */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 35 }}>
          <ServiceCategoryNew icon="bag-outline" label="TASK" active={false} onPress={() => { console.log(">>> [CLICK] TASK button pressed (main header)"); router.push("/helper-task"); }} />
          <ServiceCategoryNew icon="car-outline" label="RIDES" active={false} onPress={() => { console.log(">>> [CLICK] RIDES button pressed (main header)"); router.push("/all-services"); }} />
          <ServiceCategoryNew icon="fast-food-outline" label="FOOD" active={activeService === 'Food'} onPress={() => { console.log(">>> [CLICK] FOOD button pressed (main header)"); handleServiceSwitch('Food'); }} />
          <ServiceCategoryNew icon="food-steak" iconFamily="MaterialCommunityIcons" label="MEAT" active={activeService === 'Meat'} onPress={() => { console.log(">>> [CLICK] MEAT button pressed (main header)"); handleServiceSwitch('Meat'); }} />
        </View>

        <View style={{ height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16, marginTop: 24, marginBottom: 24 }} />

        {/* Greeting and See All */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 22, fontWeight: 'bold', color: '#111827' }}>
            Happy{" "}
            <Text
              style={{
                color: "#111827",
                fontStyle: isFestival ? "italic" : "normal",
                fontFamily: isFestival ? (Platform.OS === "ios" ? "Georgia" : "serif") : undefined,
                fontWeight: isFestival ? "900" : "bold",
              }}
            >
              {displayText}
            </Text>
            <Text style={{ color: "#7C3AED", fontWeight: "bold", opacity: cursorVisible ? 1 : 0 }}>|</Text>
            , {userName}! 👋
          </Text>
        </View>

        {/* Conditionally show warning and block all products/categories */}
        {hasRidersButNoVendors ? (
          <View style={{ 
            margin: 16, 
            marginTop: 24, 
            alignItems: 'center', 
            padding: 24, 
            backgroundColor: '#F9FAFB', 
            borderRadius: 24, 
            borderWidth: 1, 
            borderColor: '#E5E7EB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2
          }}>
            <Ionicons name={activeService === 'Meat' ? "basket" : "fast-food"} size={48} color="#7C3AED" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937', textAlign: 'center' }}>
              {activeService === 'Meat' ? "No Meat Available" : "No Food Available"}
            </Text>
            <Text style={{ fontSize: 13, color: '#4B5563', textAlign: 'center', marginTop: 6, fontWeight: '600', lineHeight: 18 }}>
              {activeService === 'Meat'
                ? "Riders are online, but there are no meat shops or outlets serving this zone currently."
                : "Riders are online, but there are no restaurants or vendors serving this zone currently."
              }
            </Text>
          </View>
        ) : (
          <>
            {/* Tag Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              <View>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  {popularTags.slice(0, 7).map((tag, idx) => <TagPill key={idx} tag={tag} />)}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {popularTags.slice(7, 14).map((tag, idx) => <TagPill key={idx} tag={tag} />)}
                </View>
              </View>
            </ScrollView>

            {/* Below Greetings Ads */}
            {greetingAds.length > 0 ? (
              greetingAds.map((banner, index) => (
                <View key={banner._id || index} style={{ marginHorizontal: 16, marginVertical: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                  <View style={{ position: 'relative' }}>
                    <Image 
                      source={{ uri: banner.imageUrl }} 
                      style={{ width: '100%', height: 160 }}
                      resizeMode="cover"
                    />
                    <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Ad</Text>
                    </View>
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 12 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{banner.title}</Text>
                      {banner.description && (
                        <Text style={{ color: '#E5E7EB', fontSize: 12, marginTop: 2 }}>{banner.description}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : null}

            {/* 149 Store */}
            {store149Items.length > 0 && (
              <View style={{ margin: 16, backgroundColor: '#F5F3FF', borderRadius: 24, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>149</Text>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '800', marginLeft: 8, color: '#111827' }}>store</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#7C3AED" />
                      <Text style={{ color: '#6D28D9', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>Meals at ₹149 + Free Delivery</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push("/149-store")}>
                    <Text style={{ color: '#7C3AED', fontSize: 14, fontWeight: '700' }}>View All</Text>
                    <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {store149Items.map(item => <Store149Card key={item._id} item={item} />)}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </View>
    );
  };
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const visible = value >= 330;
      setIsStickyVisible(visible);
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY]);

  const stickyHeaderTranslateY = scrollY.interpolate({
    inputRange: [330, 360],
    outputRange: [-120, 0],
    extrapolate: 'clamp',
  });

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [330, 350],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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
      {isStickyVisible && (
        <Animated.View 
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              backgroundColor: '#FAFAFA',
              paddingTop: insets.top + 8,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 3,
              transform: [{ translateY: stickyHeaderTranslateY }],
              opacity: stickyHeaderOpacity,
            }
          ]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <ServiceCategoryNew icon="bag-outline" label="TASK" active={false} onPress={() => { console.log(">>> [CLICK] TASK button pressed (sticky header)"); router.push("/helper-task"); }} />
            <ServiceCategoryNew icon="car-outline" label="RIDES" active={false} onPress={() => { console.log(">>> [CLICK] RIDES button pressed (sticky header)"); router.push("/all-services"); }} />
            <ServiceCategoryNew icon="fast-food-outline" label="FOOD" active={activeService === 'Food'} onPress={() => { console.log(">>> [CLICK] FOOD button pressed (sticky header)"); handleServiceSwitch('Food'); }} />
            <ServiceCategoryNew icon="food-steak" iconFamily="MaterialCommunityIcons" label="MEAT" active={activeService === 'Meat'} onPress={() => { console.log(">>> [CLICK] MEAT button pressed (sticky header)"); handleServiceSwitch('Meat'); }} />
          </View>
        </Animated.View>
      )}

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
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={() => {
          if (showHomeSkeleton || loadingDrivers) return null;

          if (hasNoLocation) {
            return (
              <View style={styles.noServiceContainer}>
                <Ionicons name="location-sharp" size={80} color={colors.primary} style={{ marginBottom: 16 }} />
                <Text style={[styles.noServiceTitle, { color: colors.text }]}>No Location Selected</Text>
                <Text style={[styles.noServiceSubtitle, { color: colors.textSecondary }]}>
                  Please select your delivery location or enable device GPS to view available restaurants and services near you.
                </Text>
                <TouchableOpacity
                  style={[styles.noServiceButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/delivery/saved-addresses")}
                >
                  <Text style={[styles.noServiceButtonText, { color: colors.surface }]}>Select Address</Text>
                </TouchableOpacity>
              </View>
            );
          }

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
                  onPress={() => router.push("/delivery/saved-addresses")}
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
                <Text style={[styles.noServiceTitle, { color: colors.text }]}>Services are not available in this location</Text>
                <Text style={[styles.noServiceSubtitle, { color: colors.textSecondary }]}>
                  We don't have {serviceName} outlets or delivery services available in this location. Please try changing your location.
                </Text>
                <TouchableOpacity
                  style={[styles.noServiceButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/delivery/saved-addresses")}
                >
                  <Text style={[styles.noServiceButtonText, { color: colors.surface }]}>Change Location</Text>
                </TouchableOpacity>
              </View>
            );
          }

          return null;
        }}
        ListFooterComponent={() => (
          <View>
            {showCategories && activeService === 'Food' && visibleItems.length > 0 && (
              <View style={{ margin: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F3E8FF', padding: 20, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, zIndex: 10 }}>
                  <Text style={{ color: '#7C3AED', fontWeight: '700', fontSize: 13 }}>Hot & Delicious</Text>
                  <Text style={{ color: '#111827', fontWeight: '900', fontSize: 20, marginTop: 4 }}>Biryani Special</Text>
                  <Text style={{ color: '#6D28D9', fontWeight: '600', fontSize: 13, marginTop: 4 }}>Up to 40% OFF</Text>
                  <TouchableOpacity style={{ backgroundColor: '#6D28D9', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>Order Now</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800' }}
                  style={{ width: 220, height: 220, position: 'absolute', right: -60, bottom: -40, borderRadius: 110 }}
                  resizeMode="cover"
                />
              </View>
            )}
            {loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 120 }} />}
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.mainScrollContent,
          {
            flexGrow: showCategories ? undefined : 1,
            paddingTop: showCategories ? 0 : 0,
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
          checkNearbyDrivers(lat, lng);
          if (activeService === 'Meat') {
            fetchMeatCenters(lat, lng, 1);
          } else {
            fetchVendors(lat, lng, 1);
            fetch149StoreItems(lat, lng);
          }
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              const y = event.nativeEvent.contentOffset.y;
              const visible = y >= 330;
              if (visible !== isStickyVisible) {
                setIsStickyVisible(visible);
              }
            }
          }
        )}
      />



      {/* DOORDASH STYLE SEARCH SCREEN OVERLAY */}
      <Modal
        visible={isSearchVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setIsSearchActive(false)}
        onShow={() => {
          Animated.parallel([
            Animated.timing(searchTranslateY, {
              toValue: 0,
              duration: 350,
              easing: Easing.out(Easing.poly(3)),
              useNativeDriver: true,
            }),
            Animated.timing(searchBackdropOpacity, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            })
          ]).start();
        }}
      >
        <View style={{ flex: 1 }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: searchBackdropOpacity }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setIsSearchActive(false)} 
            />
          </Animated.View>
          <Animated.View style={[
            { 
              backgroundColor: colors.background, 
              paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 16) : 16,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              overflow: 'hidden',
              maxHeight: Dimensions.get('window').height * 0.85
            }, 
            { transform: [{ translateY: searchTranslateY }] }
          ]}>
            {/* Header Row */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 16 }}>
              <TouchableOpacity onPress={() => setIsSearchActive(false)}>
                <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: "500", color: colors.textSecondary }}>Search for dishes & restaurants</Text>
            </View>

            {/* Search Input Row */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary || "#F3F4F6", borderRadius: 16, paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 10 }}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontWeight: "500", color: colors.text }}
                  placeholder="Try 'EatRight'"
                  placeholderTextColor={colors.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={() => addRecentSearch(searchText)}
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText("")} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Body Content */}
            {!searchText ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              >
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1, color: colors.text, marginBottom: 16, marginTop: 8 }}>RECENTLY SEARCHED RESTAURANTS</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {recentSearches.map((query, index) => (
                        <TouchableOpacity
                          key={index}
                          style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.borderLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }}
                          onPress={() => setSearchText(query)}
                        >
                          <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>{query}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                
                {/* Recommended (Optional fallback if no recent searches) */}
                <View style={{ marginBottom: 24 }}>
                   <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1, color: colors.text, marginBottom: 16 }}>RECOMMENDED FOR YOU</Text>
                   <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {["Biryani", "Pizza", "Burger", "Chinese", "Desserts"].map((rec, i) => (
                      <TouchableOpacity
                        key={i}
                        style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.borderLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }}
                        onPress={() => setSearchText(rec)}
                      >
                        <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>{rec}</Text>
                      </TouchableOpacity>
                    ))}
                   </View>
                </View>
              </ScrollView>
            ) : (
              /* Search Results */
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
            )}
          </Animated.View>
        </View>
      </Modal>





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

      {/* STARTUP AD MODAL */}
      {activeStartupAd && (
        <Modal visible={hasShownStartupAd && !!activeStartupAd} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ width: '100%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
              <TouchableOpacity 
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', padding: 6, borderRadius: 16 }}
                onPress={() => setActiveStartupAd(null)}
              >
                <Feather name="x" size={20} color="#000" />
              </TouchableOpacity>
              <Image source={{ uri: activeStartupAd.imageUrl }} style={{ width: '100%', height: 300 }} resizeMode="cover" />
              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>{activeStartupAd.title}</Text>
                {activeStartupAd.description && (
                  <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>{activeStartupAd.description}</Text>
                )}
                <TouchableOpacity 
                  style={{ backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 }}
                  onPress={() => setActiveStartupAd(null)}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Continue to App</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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

function CategorySkeleton({ colors }: { colors: typeof Colors.light }) {
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
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: 64, alignItems: 'center' }}>
          <SkeletonBlock
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border }}
            shimmer={shimmer}
            shimmerHighlight={shimmerHighlight}
          />
          <SkeletonBlock
            style={{ width: 44, height: 10, borderRadius: 3, backgroundColor: colors.border, marginTop: 8 }}
            shimmer={shimmer}
            shimmerHighlight={shimmerHighlight}
          />
        </View>
      ))}
    </View>
  );
}

function SearchBarSkeleton({ colors }: { colors: typeof Colors.light }) {
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
    <View style={{ width: '92%', alignSelf: 'center', height: 56, borderRadius: 28, backgroundColor: colors.border, padding: 2, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }}>
      <SkeletonBlock
        style={{ width: '100%', height: '100%', borderRadius: 26, backgroundColor: colors.surface }}
        shimmer={shimmer}
        shimmerHighlight={shimmerHighlight}
      />
    </View>
  );
}

function Store149Skeleton({ colors, theme, styles }: { colors: typeof Colors.light, theme: 'light' | 'dark', styles: any }) {
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
    <LinearGradient
      colors={theme === 'light' ? ['#F5F3FF', '#EDE9FE', '#F5F3FF'] : ['#2E1065', '#4C1D95', '#2E1065']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.store149Container}
    >
      <View style={styles.store149Header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBlock
              style={{ width: 80, height: 24, borderRadius: 12, backgroundColor: colors.border }}
              shimmer={shimmer}
              shimmerHighlight={shimmerHighlight}
            />
            <SkeletonBlock
              style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: colors.border }}
              shimmer={shimmer}
              shimmerHighlight={shimmerHighlight}
            />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.store149Card, { backgroundColor: colors.surface, width: 140, height: 200, padding: 8, borderRadius: 12 }]}>
            <SkeletonBlock
              style={{ width: '100%', height: 100, borderRadius: 8, backgroundColor: colors.border }}
              shimmer={shimmer}
              shimmerHighlight={shimmerHighlight}
            />
            <SkeletonBlock
              style={{ width: '80%', height: 12, borderRadius: 3, backgroundColor: colors.border, marginTop: 12 }}
              shimmer={shimmer}
              shimmerHighlight={shimmerHighlight}
            />
            <SkeletonBlock
              style={{ width: '50%', height: 10, borderRadius: 3, backgroundColor: colors.border, marginTop: 8 }}
              shimmer={shimmer}
              shimmerHighlight={shimmerHighlight}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <SkeletonBlock
                style={{ width: 40, height: 14, borderRadius: 3, backgroundColor: colors.border }}
                shimmer={shimmer}
                shimmerHighlight={shimmerHighlight}
              />
              <SkeletonBlock
                style={{ width: 48, height: 24, borderRadius: 12, backgroundColor: colors.border }}
                shimmer={shimmer}
                shimmerHighlight={shimmerHighlight}
              />
            </View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

function GreetingSectionSkeleton({ colors, styles }: { colors: typeof Colors.light, styles: any }) {
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
    <View style={styles.greetingSection}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SkeletonBlock
          style={{ width: 180, height: 24, borderRadius: 12, backgroundColor: colors.border }}
          shimmer={shimmer}
          shimmerHighlight={shimmerHighlight}
        />
        <SkeletonBlock
          style={{ width: 64, height: 32, borderRadius: 16, backgroundColor: colors.border }}
          shimmer={shimmer}
          shimmerHighlight={shimmerHighlight}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.dishChip, { width: 90, height: 36, paddingHorizontal: 8, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderHeight: 1, borderColor: colors.border }]}>
            <SkeletonBlock
              style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.border }}
              shimmer={shimmer}
              shimmerHighlight={shimmerHighlight}
            />
            <SkeletonBlock
              style={{ width: 44, height: 10, borderRadius: 3, backgroundColor: colors.border }}
              shimmer={shimmer}
              shimmerHighlight={shimmerHighlight}
            />
          </View>
        ))}
      </View>
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
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  addressSubText: {
    fontSize: moderateScale(12),
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
    borderRadius: moderateScale(18),
    padding: 2,
    gap: 2,
  },
  topToggleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: moderateScale(14),
    gap: 3,
  },
  topToggleOptionVegActive: {
    backgroundColor: "#16A34A",
  },
  topToggleOptionNonVegActive: {
    backgroundColor: "#E11D48",
  },
  topToggleText: {
    fontSize: moderateScale(10),
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
  categoriesFlexContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 15,
  },
  greetingTitle: {
    fontSize: moderateScale(22),
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  vegMorphBadge: {
    height: moderateScale(38),
    borderRadius: moderateScale(19),
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
    fontSize: moderateScale(12),
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
    borderRadius: moderateScale(18),
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1.5,
  },
  dishIconCircle: {
    width: moderateScale(21),
    height: moderateScale(21),
    borderRadius: moderateScale(10.5),
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },
  dishChipText: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: colors.text,
  },
  store149Container: {
    borderRadius: moderateScale(22),
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
    width: moderateScale(40),
    height: moderateScale(28),
    borderRadius: moderateScale(8),
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
    fontSize: moderateScale(13),
    fontWeight: "900",
    color: "#FFFFFF",
  },
  store149BrandText: {
    fontSize: moderateScale(19),
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
    fontSize: moderateScale(12),
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
    fontSize: moderateScale(12),
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
    borderRadius: moderateScale(20),
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "visible",
  },
  store149ImageContainer: {
    position: "relative",
    width: 140,
    height: 120,
    borderRadius: moderateScale(18),
  },
  store149Image: {
    width: 140,
    height: 120,
    borderRadius: moderateScale(18),
    backgroundColor: colors.surfaceSecondary,
  },
  store149DietOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 3,
    borderRadius: moderateScale(4),
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
    borderRadius: moderateScale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 4,
  },
  store149RatingOverlayText: {
    fontSize: moderateScale(9),
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
    borderRadius: moderateScale(10),
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
    fontSize: moderateScale(10),
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
    borderRadius: moderateScale(10),
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    width: moderateScale(65),
  },
  store149QtyBtn: {
    width: moderateScale(16),
    height: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  store149QtyText: {
    fontSize: moderateScale(10),
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
    width: moderateScale(12),
    height: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: moderateScale(2),
  },
  store149DietDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
  },
  store149Name: {
    fontSize: moderateScale(12),
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
    fontSize: moderateScale(10),
    color: colors.textSecondary,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  store149PriceHighlight: {
    backgroundColor: "#FEF08A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: moderateScale(6),
    borderWidth: 0.5,
    borderColor: "#EAB308",
  },
  store149DealPrice: {
    fontSize: moderateScale(10),
    fontWeight: "900",
    color: "#B45309",
  },
  store149Brand: {
    fontSize: moderateScale(10),
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
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  filterChipText: {
    fontSize: moderateScale(12),
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
    borderRadius: moderateScale(18),
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  skeletonLineLarge: {
    width: "82%",
    height: moderateScale(22),
    borderRadius: moderateScale(11),
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
    height: moderateScale(14),
    borderRadius: moderateScale(7),
    backgroundColor: colors.surfaceSecondary,
  },
  skeletonDot: {
    width: 5,
    height: 5,
    borderRadius: moderateScale(3),
    backgroundColor: colors.border,
  },
  skeletonOffer: {
    width: "45%",
    height: moderateScale(16),
    borderRadius: moderateScale(8),
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
    borderRadius: moderateScale(32),
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
    height: moderateScale(55),
    borderRadius: moderateScale(30),
    width: "100%",
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(Platform.OS === 'ios' ? 13 : 11),
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
    fontSize: moderateScale(20),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  meatBannerSubtitle: {
    fontSize: moderateScale(13),
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
    fontSize: moderateScale(16),
    fontWeight: "800",
    marginTop: 12,
  },
  emptySearchSubtitle: {
    fontSize: moderateScale(13),
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
  },
  noServiceContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  noServiceTitle: {
    fontSize: moderateScale(18),
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  noServiceSubtitle: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    lineHeight: moderateScale(20),
    paddingHorizontal: 16,
  },
  noServiceButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: moderateScale(30),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noServiceButtonText: {
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  listSectionHeader: {
    fontSize: moderateScale(12),
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
    width: moderateScale(14),
    height: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: moderateScale(2),
  },
  dishVegDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
  },
  dishItemName: {
    fontSize: moderateScale(14),
    fontFamily: "Inter_700Bold",
    color: colors.text,
    flex: 1,
  },
  dishItemPrice: {
    fontSize: moderateScale(13),
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
    marginTop: 4,
  },
  dishItemDesc: {
    fontSize: moderateScale(11),
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: moderateScale(16),
  },
  dishVendorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  dishVendorText: {
    fontSize: moderateScale(11),
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
    borderRadius: moderateScale(12),
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
    borderRadius: moderateScale(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 70,
    alignItems: "center",
  },
  dishAddPillText: {
    fontSize: moderateScale(11),
    fontFamily: "Inter_700Bold",
    color: "#16A34A",
  },
  dishQuantityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(8),
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
    fontSize: moderateScale(11),
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
    borderTopLeftRadius: moderateScale(26),
    borderTopRightRadius: moderateScale(26),
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 20,
  },
  distanceSheetHandle: {
    width: moderateScale(42),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
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
    fontSize: moderateScale(18),
    fontWeight: "900",
    color: colors.text,
  },
  distanceSubtitle: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 3,
  },
  distanceCloseBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
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
    borderRadius: moderateScale(18),
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  distanceChipText: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    color: colors.text,
  },
  distanceChipTextActive: {
    color: colors.background,
  },
  distanceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: moderateScale(18),
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
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
  distanceInputUnit: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    color: colors.textSecondary,
  },
  distanceApplyBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: moderateScale(18),
    backgroundColor: colors.text,
  },
  distanceApplyText: {
    color: colors.background,
    fontSize: moderateScale(14),
    fontWeight: "900",
  },
  distanceClearBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginTop: 10,
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  distanceClearText: {
    color: colors.textSecondary,
    fontSize: moderateScale(13),
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
    borderRadius: moderateScale(24),
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ddSearchInput: {
    flex: 1,
    fontSize: moderateScale(16),
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
    fontSize: moderateScale(18),
    fontWeight: "900",
    color: colors.text,
    marginTop: 12,
    marginBottom: 16,
  },
  ddClearLink: {
    fontSize: moderateScale(14),
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
    fontSize: moderateScale(16),
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
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: colors.border,
  },
  ddRecChipText: {
    fontSize: moderateScale(14),
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
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(35),
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
    fontSize: moderateScale(13),
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  attachedSearchSheet: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(24),
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
    borderRadius: moderateScale(12),
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSheetInput: {
    flex: 1,
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.text,
  },
  searchSheetMic: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
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
    fontSize: moderateScale(16),
    fontWeight: '900',
    color: colors.text,
  },
  clearRecentText: {
    fontSize: moderateScale(13),
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
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  suggestionsSection: {
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: moderateScale(16),
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
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionChipText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.text,
  },
  vegMorphBadge: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
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
});
