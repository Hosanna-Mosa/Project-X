import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useHomeStore } from "@/contexts/homeStore";
import { RestaurantListItem } from "@/components/RestaurantListItem";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";
import { useAuthStore } from "@/contexts/authStore";
import { useCartStore } from "@/contexts/cartStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { addToCartWithConfirm } from "@/utils/addToCart";

// Maps the short quick-search tags to the actual query terms the backend
// dish-search endpoint expects.
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
  "Fish": "Fish",
};

const HOME_SKELETON_ITEMS = Array.from({ length: 4 }, (_, index) => ({ _id: `home-skeleton-${index}` }));

const CUISINE_EMOJI: { [key: string]: string } = {
  Biryani: "🍛", Tiffins: "🫓", Chinese: "🍜", Pizza: "🍕", Sweets: "🍮",
  "South Indian": "🥞", "North Indian": "🍛", Mughlai: "🍢", Kebabs: "🍢",
  "Fast Food": "🍔", Burgers: "🍔", Rolls: "🌯", Desserts: "🍮",
  Chicken: "🐔", Mutton: "🐐", Seafood: "🦐", Eggs: "🥚",
};
const DEFAULT_CUISINES = ["Biryani", "Tiffins", "Chinese", "Pizza", "Sweets"];
const DEFAULT_MEAT_TYPES = ["Chicken", "Mutton", "Seafood", "Eggs"];

const FOOD_PROMOS = [
  { eyebrow: "First order", headline: "50% off up to ₹120", caption: "Code FLAV50 · min ₹199" },
  { eyebrow: "Late night", headline: "Open till 2 AM", caption: "42 outlets near you" },
];
const MEAT_PROMOS = [
  { eyebrow: "Sunday special", headline: "Country chicken ₹399 / kg", caption: "" },
  { eyebrow: "Cleaned & cut", headline: "No fee today", caption: "" },
];

const CARD_W = 280;
const CARD_GAP = 12;
const STRIDE = CARD_W + CARD_GAP;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
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
  const searchTranslateY = useRef(new Animated.Value(-Dimensions.get("window").height)).current;
  const searchBackdropOpacity = useRef(new Animated.Value(0)).current;
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (isSearchActive) {
      setIsSearchVisible(true);
      // Entry animation is handled by onShow in Modal
    } else if (isSearchVisible) {
      Animated.parallel([
        Animated.timing(searchTranslateY, {
          toValue: -Dimensions.get("window").height,
          duration: 300,
          easing: Easing.in(Easing.poly(3)),
          useNativeDriver: true,
        }),
        Animated.timing(searchBackdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setIsSearchVisible(false));
    }
  }, [isSearchActive]);

  const [banners, setBanners] = useState<any[]>([]);
  const [hasShownStartupAd, setHasShownStartupAd] = useState(false);
  const [activeStartupAd, setActiveStartupAd] = useState<any | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const carouselRef = useRef<ScrollView>(null);
  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const bannerIndexRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("recent_searches");
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load recent searches", e);
      }
    })();
  }, []);

  const addRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    const trimmed = query.trim();
    const newRecent = [trimmed, ...recentSearches.filter((q) => q !== trimmed)].slice(0, 5);
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
  const [isRetryingDrivers, setIsRetryingDrivers] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services[activeService === "Meat" ? "meat" : "food"];
  const styles = useMemo(() => createStyles(tokens, accent), [theme, activeService]);

  const cartVendorId = useCartStore((s) => s.vendorId);
  const cartVendorName = useMemo(() => {
    if (!cartVendorId) return undefined;
    const list = activeService === "Meat" ? meatCenters : restaurants;
    return list.find((v) => v._id === cartVendorId)?.name;
  }, [cartVendorId, meatCenters, restaurants, activeService]);

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

  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isAddressLoaded, setIsAddressLoaded] = useState(false);
  const [hasNoLocation, setHasNoLocation] = useState(false);
  const addressResolveRef = useRef<(() => void) | null>(null);
  const hasRedirectedRef = useRef(false);

  const [isDistanceSheetOpen, setIsDistanceSheetOpen] = useState(false);
  const [distanceOption, setDistanceOption] = useState<"3" | "5" | "7" | "custom">("5");
  const [customDistance, setCustomDistance] = useState("");
  const [appliedDistanceKm, setAppliedDistanceKm] = useState<number | null>(null);
  const [distanceRefreshKey, setDistanceRefreshKey] = useState(0);

  const [searchedDishes, setSearchedDishes] = useState<any[]>([]);
  const [isSearchingDishes, setIsSearchingDishes] = useState(false);

  const [loading149, setLoading149] = useState(false);

  // Filter state
  const [selectedSort, setSelectedSort] = useState<string>("relevance");
  const [filter99Store, setFilter99Store] = useState<boolean>(false);
  const [filterFastDelivery, setFilterFastDelivery] = useState<boolean>(false);
  const [filterOffers, setFilterOffers] = useState<boolean>(false);
  const [filterRating4Plus, setFilterRating4Plus] = useState<boolean>(false);
  const [filterCostRange, setFilterCostRange] = useState<string>("all");
  const [filterVegNonVeg, setFilterVegNonVeg] = useState<string>("all");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<string>("Sort");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState<boolean>(false);

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

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const activeStr = await AsyncStorage.getItem("active_address");
          if (activeStr) setSelectedAddress(JSON.parse(activeStr));
        } catch (e) {
          console.error("Failed to load active address:", e);
        } finally {
          setIsAddressLoaded(true);
        }
      })();

      (async () => {
        try {
          const response = await customFetch<any>("/api/v1/banners");
          if (response && response.data) {
            setBanners(response.data);
            const startupAds = response.data.filter((b: any) => b.itemType === "ad" && b.position === "startup");
            if (startupAds.length > 0 && !hasShownStartupAd) {
              // `hasShownStartupAd` alone only guards against re-showing
              // within this mount — Home remounting (returning from a pushed
              // screen, cold start, etc.) reset it to false every time, so
              // the ad kept replaying. Persist which ad was last dismissed
              // so "seen" survives remounts.
              const ad = startupAds[0];
              const lastSeenId = await AsyncStorage.getItem("last_seen_startup_ad").catch(() => null);
              if (lastSeenId !== ad._id) {
                setActiveStartupAd(ad);
                setHasShownStartupAd(true);
              }
            }
          }
        } catch (e) {
          console.error("Failed to load banners:", e);
        }
      })();
    }, [])
  );

  const dismissStartupAd = () => {
    if (activeStartupAd?._id) {
      AsyncStorage.setItem("last_seen_startup_ad", activeStartupAd._id).catch(() => {});
    }
    setActiveStartupAd(null);
  };

  const getCoords = async () => {
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
      const gpsDeniedBefore = await AsyncStorage.getItem("gps_permission_denied");
      if (gpsDeniedBefore !== "true") {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === "undetermined") {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          status = newStatus;
        }

        if (status === "granted") {
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
            const [address] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
            if (address) {
              const formatted = [
                address.name, address.street, address.district || address.subregion,
                address.city, address.region, address.postalCode,
              ].filter(Boolean).join(", ");
              useDeliveryStore.getState().setCurrentLocation(formatted);
            }
          } catch (e) {
            console.warn("Home Screen: Reverse geocoding failed:", e);
          }

          return coords;
        } else {
          await AsyncStorage.setItem("gps_permission_denied", "true");
        }
      }
    } catch (error) {
      console.warn("Home Screen: GPS fetch failed:", error);
    }

    return { lat: null, lng: null };
  };

  const selectedDistanceKm = distanceOption === "custom"
    ? Math.max(1, Number(customDistance) || 5)
    : Number(distanceOption);

  const fetchVendors = async (lat: number, lng: number, pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true); else setLoadingMore(true);
      const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
      const data = await customFetch<any>(`/api/v1/vendors/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20${radiusParam}`);
      if (Array.isArray(data)) {
        if (data.length < 20) setHasMore(false); else setHasMore(true);
        if (pageNum === 1) {
          setRestaurants(data);
        } else {
          setRestaurants((prev) => {
            const newItems = data.filter((d) => !prev.some((p) => p._id === d._id));
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
      if (pageNum === 1) setLoading(true); else setLoadingMore(true);
      const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
      const data = await customFetch<any>(`/api/v1/meat/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20${radiusParam}`);
      if (Array.isArray(data)) {
        if (data.length < 20) setHasMore(false); else setHasMore(true);
        if (pageNum === 1) {
          setMeatCenters(data);
        } else {
          setMeatCenters((prev) => {
            const newItems = data.filter((d) => !prev.some((p) => p._id === d._id));
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
      const radiusParam = appliedDistanceKm ? `&radius=${Math.round(appliedDistanceKm * 1000)}` : "";
      const data = await customFetch<any>(`/api/v1/food/store-149?lat=${lat}&lng=${lng}${radiusParam}`);
      setStore149Items(data);
    } catch (error) {
      console.error("Error fetching 149 store items:", error);
    } finally {
      setLoading149(false);
    }
  };

  // `silent` skips the global loadingDrivers flag — that flag drives the
  // full-screen skeleton, so flipping it for a button-level retry replaced
  // the empty state with a flash of skeleton cards instead of just updating
  // the button. The "Retry search" action passes silent:true and shows its
  // own inline spinner via isRetryingDrivers instead.
  const checkNearbyDrivers = async (lat: number, lng: number, opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoadingDrivers(true);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const driversRadius = appliedDistanceKm ? Math.round(appliedDistanceKm * 1000) : 5000;
      const response = await fetch(`${baseUrl}/api/v1/drivers/nearby?latitude=${lat}&longitude=${lng}&radius=${driversRadius}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) setNearbyDriversCount(data.length);
      }
    } catch (error) {
      console.error("Error checking nearby drivers:", error);
    } finally {
      if (!opts?.silent) setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    if (!isAddressLoaded) return;

    (async () => {
      const { lat, lng } = await getCoords();
      if (lat && lng) {
        setHasNoLocation(false);
        const storeState = useHomeStore.getState();
        if (
          storeState.lastFetchedCoords &&
          storeState.lastFetchedCoords.lat === lat &&
          storeState.lastFetchedCoords.lng === lng &&
          storeState.lastFetchedService === activeService
        ) {
          if (addressResolveRef.current) {
            addressResolveRef.current();
            addressResolveRef.current = null;
          }
          return;
        }

        setPage(1);
        setHasMore(true);
        setLoading(true);
        setLoadingDrivers(true);
        try {
          const fetchPromise = Promise.all([
            checkNearbyDrivers(lat, lng),
            activeService === "Meat"
              ? fetchMeatCenters(lat, lng, 1)
              : Promise.all([fetchVendors(lat, lng, 1), fetch149StoreItems(lat, lng)]),
          ]);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout after 15 seconds")), 15000);
          });
          await Promise.race([fetchPromise, timeoutPromise]);
        } catch (e) {
          console.warn("Home Screen: Initial fetches timed out or failed (likely slow dev server):", e);
        } finally {
          setLoading(false);
          setLoadingDrivers(false);
        }

        useHomeStore.setState({ lastFetchedCoords: { lat, lng }, lastFetchedService: activeService });
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
        if (activeService === "Meat") fetchMeatCenters(lat, lng, nextPage);
        else fetchVendors(lat, lng, nextPage);
      }
    }
  };

  const handleServiceSwitch = (service: "Food" | "Meat") => {
    if (activeService === service) return;
    setPage(1);
    setHasMore(true);
    setActiveService(service);
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

  const showHomeSkeleton = (loading && !loadingMore) || loadingDrivers;

  const filteredItems = (activeService === "Meat" ? meatCenters : restaurants).filter((item) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(query);
    const categoryMatch = item.categories && item.categories.some((cat: string) => cat.toLowerCase().includes(query));
    const addressMatch = item.address && item.address.toLowerCase().includes(query);
    return nameMatch || categoryMatch || addressMatch;
  });

  // Note: the old code had a second, overlapping veg-only filter on top of
  // this (a header toggle separate from the "Pure Veg" filter chip below).
  // The mockup has one veg control, not two — filterVegNonVeg (driven by the
  // "Veg only" switch and the "Pure Veg" chip, same state) now does this job.
  const visibleItems = filteredItems;

  const filteredAndSortedItems = useMemo(() => {
    let items = [...visibleItems];

    if (filter99Store) {
      items = items.filter((vendor) =>
        store149Items.some((item) =>
          item.vendorId === vendor._id || (item.vendorId && typeof item.vendorId === "object" && item.vendorId._id === vendor._id)
        )
      );
    }
    if (filterFastDelivery) {
      items = items.filter((vendor) => {
        if (!vendor.time) return false;
        const match = vendor.time.match(/\d+/);
        return match ? parseInt(match[0]) <= 30 : false;
      });
    }
    if (filterOffers) {
      items = items.filter((vendor) => vendor.deliveryFee === 0 || (vendor.offer && vendor.offer.toLowerCase().includes("free")));
    }
    if (filterRating4Plus) {
      items = items.filter((vendor) => vendor.rating >= 4.0);
    }
    if (filterCostRange !== "all") {
      items = items.filter((vendor) => {
        const cost = vendor.minOrderValue || 0;
        if (filterCostRange === "under300") return cost < 300;
        if (filterCostRange === "300to600") return cost >= 300 && cost <= 600;
        if (filterCostRange === "over600") return cost > 600;
        return true;
      });
    }
    if (filterVegNonVeg !== "all") {
      items = items.filter((vendor) => {
        const isVeg = vendor.isPureVeg === true || vendor.isVeg === true;
        if (filterVegNonVeg === "veg") return isVeg;
        if (filterVegNonVeg === "nonveg") return !isVeg;
        return true;
      });
    }
    if (selectedCuisines.length > 0) {
      items = items.filter((vendor) => Array.isArray(vendor.categories) && vendor.categories.some((cat: string) => selectedCuisines.includes(cat)));
    }

    if (selectedSort === "time") {
      items.sort((a, b) => {
        const tA = a.time ? parseInt(a.time.match(/\d+/)?.[0] || "999") : 999;
        const tB = b.time ? parseInt(b.time.match(/\d+/)?.[0] || "999") : 999;
        return tA - tB;
      });
    } else if (selectedSort === "rating") {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (selectedSort === "costLowHigh") {
      items.sort((a, b) => (a.minOrderValue || 0) - (b.minOrderValue || 0));
    } else if (selectedSort === "costHighLow") {
      items.sort((a, b) => (b.minOrderValue || 0) - (a.minOrderValue || 0));
    }

    return items;
  }, [visibleItems, selectedSort, filter99Store, filterFastDelivery, filterOffers, filterRating4Plus, filterCostRange, filterVegNonVeg, selectedCuisines, store149Items]);

  const availableCuisines = useMemo(() => {
    const cuisinesSet = new Set<string>();
    const items = activeService === "Meat" ? meatCenters : restaurants;
    items.forEach((item) => {
      if (Array.isArray(item.categories)) item.categories.forEach((cat: string) => cuisinesSet.add(cat));
    });
    return Array.from(cuisinesSet).slice(0, 20);
  }, [restaurants, meatCenters, activeService]);

  const cuisineChips = availableCuisines.length > 0
    ? availableCuisines.slice(0, 8)
    : activeService === "Meat" ? DEFAULT_MEAT_TYPES : DEFAULT_CUISINES;

  const showCategories = !hasNoLocation && (showHomeSkeleton || loadingDrivers || visibleItems.length > 0 || (nearbyDriversCount ?? 0) > 0);

  const heroBanners = useMemo(
    () => banners.filter((b) => (!b.itemType || b.itemType === "banner") && (!b.position || b.position === "hero" || b.position === "inline")),
    [banners]
  );
  const greetingAds = useMemo(() => banners.filter((b) => b.itemType === "ad" && b.position === "below_greetings"), [banners]);

  const promoCards = heroBanners.length > 0
    ? heroBanners.map((b) => ({ eyebrow: "Offer", headline: b.title, caption: b.description || "" }))
    : activeService === "Meat" ? MEAT_PROMOS : FOOD_PROMOS;

  useEffect(() => {
    const interval = setInterval(() => {
      let next = bannerIndexRef.current + 1;
      if (next >= promoCards.length) next = 0;
      carouselRef.current?.scrollTo({ x: next * STRIDE, animated: true });
      bannerIndexRef.current = next;
    }, 4000);
    return () => clearInterval(interval);
  }, [promoCards.length]);

  const Store149Card = ({ item }: { item: any }) => {
    const { items: cItems, updateQuantity: updateCartQuantity } = useCartStore();
    const cartItem = cItems.find((i) => i._id === item._id);

    const handleAdd = () => {
      const foodItem = {
        _id: item._id,
        name: item.name,
        description: item.description || "",
        price: item.price,
        category: item.category || "149 Store",
        isVeg: item.isVeg,
        images: item.images && item.images.length > 0 ? item.images : ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"],
      };
      addToCartWithConfirm(foodItem, item.vendorId, item.brand || item.name);
    };

    return (
      <View style={styles.mealCard}>
        <View style={styles.mealImageWrap}>
          <Image
            source={{ uri: item.images && item.images.length > 0 ? item.images[0] : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }}
            style={styles.mealImage}
          />
          <View style={styles.mealPriceBadge}>
            <Text style={styles.mealPriceBadgeText}>₹{item.price}</Text>
          </View>
          <TouchableOpacity style={styles.mealAddBtn} onPress={handleAdd} activeOpacity={0.85}>
            {cartItem ? (
              <Text style={styles.mealAddBtnText}>{cartItem.quantity}</Text>
            ) : (
              <Feather name="plus" size={moderateScale(13)} color={accent.on} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.mealName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.mealVendor} numberOfLines={1}>{item.brand || "Nearby"} · {item.rating || "4.3"} ★</Text>
      </View>
    );
  };

  // [scroll-animate-1] Morph-and-dock category bar: the real tiles row (in
  // the scrollable header) fades out as it scrolls past, while a compact
  // "docked" copy fades/settles in at a fixed spot right under the
  // always-pinned address bar, continuously driven by scroll position
  // (not a threshold toggle) so it reads as one thing shrinking into place
  // rather than a hard swap. It only ever occupies space *below* the
  // always-pinned address bar, so however imprecise the interpolation range
  // is, it can't expose the status bar the way the old sticky-header attempt
  // did — worst case it just visually cross-fades a little early/late.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [tilesRowTop, setTilesRowTop] = useState(0);
  const [tilesRowBottom, setTilesRowBottom] = useState(0);
  const [addressBarHeight, setAddressBarHeight] = useState(0);
  const [isCategoryBarInteractive, setIsCategoryBarInteractive] = useState(false);

  const collapseStart = tilesRowTop > 0 ? tilesRowTop : 300;
  const collapseEnd = tilesRowBottom > 0 ? tilesRowBottom : 360;
  const realTilesOpacity = scrollY.interpolate({ inputRange: [collapseStart, collapseEnd], outputRange: [1, 0], extrapolate: "clamp" });
  const dockedBarOpacity = scrollY.interpolate({ inputRange: [collapseStart, collapseEnd], outputRange: [0, 1], extrapolate: "clamp" });
  const dockedBarTranslateY = scrollY.interpolate({ inputRange: [collapseStart, collapseEnd], outputRange: [-14, 0], extrapolate: "clamp" });

  const listData = useMemo(() => {
    if (showHomeSkeleton) return HOME_SKELETON_ITEMS.map((item) => ({ ...item, isSkeleton: true }));
    if (!loadingDrivers && nearbyDriversCount === 0) return [];
    if (!searchText) return filteredAndSortedItems.map((item) => ({ ...item, isRestaurant: true }));

    const items: any[] = [];
    if (filteredAndSortedItems.length > 0) {
      items.push({ _id: "header-restaurants", isHeader: true, title: "RESTAURANTS" });
      filteredAndSortedItems.forEach((r) => items.push({ ...r, isRestaurant: true }));
    }
    if (searchedDishes.length > 0) {
      items.push({ _id: "header-dishes", isHeader: true, title: "DISHES & FOOD ITEMS" });
      searchedDishes.forEach((d) => items.push({ ...d, isDish: true }));
    }
    return items;
  }, [showHomeSkeleton, searchText, filteredAndSortedItems, searchedDishes, loadingDrivers, nearbyDriversCount]);

  const areaLabel = selectedAddress?.label && selectedAddress.label !== "Other" ? selectedAddress.label : "Home";
  const areaLine = selectedAddress?.addressLine || selectedAddress?.city || "your area";

  const renderPromoCarousel = () => (
    <View style={styles.promoSection}>
      <Animated.ScrollView
        ref={carouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={STRIDE}
        decelerationRate="fast"
        contentContainerStyle={styles.promoScrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: bannerScrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          bannerIndexRef.current = Math.round(e.nativeEvent.contentOffset.x / STRIDE);
        }}
        scrollEventThrottle={16}
      >
        {promoCards.map((promo, index) => (
          <View key={index} style={[styles.promoCard, index === 0 ? { backgroundColor: accent.skin } : { backgroundColor: tokens.sunken }]}>
            <View>
              <Text style={[styles.promoEyebrow, { color: index === 0 ? accent.accent : tokens.sec }]}>{promo.eyebrow}</Text>
              <Text style={styles.promoHeadline}>{promo.headline}</Text>
            </View>
            {!!promo.caption && <Text style={styles.promoCaption}>{promo.caption}</Text>}
          </View>
        ))}
      </Animated.ScrollView>
      {promoCards.length > 1 && (
        <View style={styles.promoDotsRow}>
          {promoCards.map((_, i) => {
            const width = bannerScrollX.interpolate({
              inputRange: [(i - 1) * STRIDE, i * STRIDE, (i + 1) * STRIDE],
              outputRange: [5, 18, 5],
              extrapolate: "clamp",
            });
            const backgroundColor = bannerScrollX.interpolate({
              inputRange: [(i - 1) * STRIDE, i * STRIDE, (i + 1) * STRIDE],
              outputRange: [tokens.borderStrong, accent.accent, tokens.borderStrong],
              extrapolate: "clamp",
            });
            return <Animated.View key={i} style={[styles.promoDot, { width, backgroundColor }]} />;
          })}
        </View>
      )}
    </View>
  );

  const activeFilterCount = [
    filter99Store, filterFastDelivery, filterOffers, filterRating4Plus,
    filterCostRange !== "all", filterVegNonVeg !== "all", selectedCuisines.length > 0,
  ].filter(Boolean).length;

  // Re-attempts GPS from scratch: drops any saved address and the cached
  // "user denied GPS" flag, then nudges the address-loading effect to re-run.
  const handleUseCurrentLocation = async () => {
    try {
      await AsyncStorage.removeItem("gps_permission_denied");
      await AsyncStorage.removeItem("active_address");
    } catch (e) {
      console.error("Failed to reset location prefs:", e);
    }
    setSelectedAddress(null);
    setDistanceRefreshKey((v) => v + 1);
  };

  const renderHeader = () => {
    const hasRidersButNoVendors = !showHomeSkeleton && !loadingDrivers && (nearbyDriversCount ?? 0) > 0 && visibleItems.length === 0;
    if (!showCategories || ((!showHomeSkeleton && visibleItems.length === 0) && !hasRidersButNoVendors)) return null;

    return (
      <View>
        {/* Headline */}
        <Text style={styles.headline}>
          {activeService === "Meat" ? "Fresh Meat Daily!" : "Craving something\ndelicious?"}
        </Text>

        {/* Search bar */}
        <Animated.View style={{ transform: [{ scale: searchBarScale }] }}>
          <TouchableOpacity style={styles.searchBar} activeOpacity={0.85} onPress={() => setIsSearchActive(true)}>
            <Ionicons name="search" size={moderateScale(16)} color={tokens.sec} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              {activeService === "Meat" ? "Search “mutton curry cut”, “prawns”" : "Search “biryani”, “Bawarchi”"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* [scroll-animate-1] Service tiles: Food/Meat toggle + Ride/Task
            launchers. Fades out (via realTilesOpacity) as the docked copy
            below fades in, over the same scroll range. */}
        <Animated.View
          style={[styles.tilesRow, { opacity: realTilesOpacity }]}
          onLayout={(e) => {
            setTilesRowTop(e.nativeEvent.layout.y);
            setTilesRowBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
          }}
        >
          <View style={styles.togglePill}>
            <TouchableOpacity
              style={[styles.toggleCell, activeService === "Food" && { backgroundColor: tokens.services.food.skin, borderColor: tokens.services.food.accent }]}
              onPress={() => handleServiceSwitch("Food")}
              activeOpacity={0.85}
            >
              <View style={[styles.toggleIconCircle, { backgroundColor: activeService === "Food" ? tokens.services.food.accent : tokens.sunken }]}>
                <Text style={styles.toggleEmoji}>🍛</Text>
              </View>
              <Text style={[styles.toggleLabel, activeService === "Food" && { color: tokens.services.food.accent }]}>Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleCell, activeService === "Meat" && { backgroundColor: tokens.services.meat.skin, borderColor: tokens.services.meat.accent }]}
              onPress={() => handleServiceSwitch("Meat")}
              activeOpacity={0.85}
            >
              <View style={[styles.toggleIconCircle, { backgroundColor: activeService === "Meat" ? tokens.services.meat.accent : tokens.sunken }]}>
                <Text style={styles.toggleEmoji}>🍖</Text>
              </View>
              <Text style={[styles.toggleLabel, activeService === "Meat" && { color: tokens.services.meat.accent }]}>Meat</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.launcherTile} onPress={() => router.push("/all-services")} activeOpacity={0.85}>
            <Text style={styles.launcherArrow}>↗</Text>
            <View style={[styles.launcherIconCircle, { backgroundColor: tokens.services.ride.skin }]}>
              <Text style={styles.launcherEmoji}>🛺</Text>
            </View>
            <Text style={styles.toggleLabel}>Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.launcherTile} onPress={() => router.push("/helper-task")} activeOpacity={0.85}>
            <Text style={styles.launcherArrow}>↗</Text>
            <View style={[styles.launcherIconCircle, { backgroundColor: tokens.services.task.skin }]}>
              <Text style={styles.launcherEmoji}>🧰</Text>
            </View>
            <Text style={styles.toggleLabel}>Task</Text>
          </TouchableOpacity>
        </Animated.View>

        {hasRidersButNoVendors ? null : (
          <>
            {renderPromoCarousel()}

            {greetingAds.length > 0 && greetingAds.map((banner, index) => (
              <View key={banner._id || index} style={styles.adCard}>
                <Image source={{ uri: banner.imageUrl }} style={styles.adImage} resizeMode="cover" />
                <View style={styles.adCaption}>
                  <Text style={styles.adTitle}>{banner.title}</Text>
                  {banner.description && <Text style={styles.adDescription}>{banner.description}</Text>}
                </View>
              </View>
            ))}

            {activeService === "Food" && store149Items.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeadRow}>
                  <View style={styles.sectionHeadLeft}>
                    <Text style={styles.sectionTitle}>Meals at ₹149</Text>
                    <Text style={styles.sectionMeta}>ends 11 PM</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push("/149-store")}>
                    <Text style={styles.sectionSeeAll}>See all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealsScrollContent}>
                  {store149Items.map((item) => <Store149Card key={item._id} item={item} />)}
                </ScrollView>
              </View>
            )}

            {activeService === "Food" && (
              <View style={styles.vegOnlyRow}>
                <View style={styles.vegOnlyLeft}>
                  <View style={styles.vegOnlyIcon}><View style={styles.vegOnlyDot} /></View>
                  <Text style={styles.vegOnlyLabel}>Veg only</Text>
                </View>
                <TouchableOpacity
                  style={[styles.vegSwitchTrack, filterVegNonVeg === "veg" && { backgroundColor: tokens.veg }]}
                  activeOpacity={0.85}
                  onPress={() => setFilterVegNonVeg(filterVegNonVeg === "veg" ? "all" : "veg")}
                >
                  <View style={[styles.vegSwitchThumb, filterVegNonVeg === "veg" && { alignSelf: "flex-end" }]} />
                </TouchableOpacity>
              </View>
            )}

            {/* Filter chips — quick filters differ per service, "Filter" always opens the full modal */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScrollContent}>
              <TouchableOpacity
                style={[styles.chip, styles.chipFilled]}
                onPress={() => { setActiveFilterTab("Sort"); setIsFilterModalVisible(true); }}
              >
                <Text style={styles.chipFilledText}>Filter</Text>
                <Ionicons name="options-outline" size={moderateScale(13)} color={accent.on} style={{ marginLeft: 4 }} />
                {activeFilterCount > 0 && (
                  <View style={styles.chipBadge}><Text style={styles.chipBadgeText}>{activeFilterCount}</Text></View>
                )}
              </TouchableOpacity>

              {activeService === "Meat" ? (
                <>
                  <TouchableOpacity style={[styles.chip, filterFastDelivery && styles.chipActive]} onPress={() => setFilterFastDelivery(!filterFastDelivery)}>
                    <Text style={[styles.chipText, filterFastDelivery && styles.chipTextActive]}>Fast delivery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, filterRating4Plus && styles.chipActive]} onPress={() => setFilterRating4Plus(!filterRating4Plus)}>
                    <Text style={[styles.chipText, filterRating4Plus && styles.chipTextActive]}>Ratings 4.0+</Text>
                  </TouchableOpacity>
                  {["Chicken", "Mutton"].map((meatType) => {
                    const isSelected = selectedCuisines.includes(meatType);
                    return (
                      <TouchableOpacity
                        key={meatType}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setSelectedCuisines(isSelected ? selectedCuisines.filter((c) => c !== meatType) : [...selectedCuisines, meatType])}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{meatType}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.chip, filterOffers && styles.chipActive]} onPress={() => setFilterOffers(!filterOffers)}>
                    <Text style={[styles.chipText, filterOffers && styles.chipTextActive]}>Offers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, filterRating4Plus && styles.chipActive]} onPress={() => setFilterRating4Plus(!filterRating4Plus)}>
                    <Text style={[styles.chipText, filterRating4Plus && styles.chipTextActive]}>Ratings 4.0+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, filterCostRange === "300to600" && styles.chipActive]}
                    onPress={() => setFilterCostRange(filterCostRange === "300to600" ? "all" : "300to600")}
                  >
                    <Text style={[styles.chipText, filterCostRange === "300to600" && styles.chipTextActive]}>₹300–₹600</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, filterCostRange === "under300" && styles.chipActive]}
                    onPress={() => setFilterCostRange(filterCostRange === "under300" ? "all" : "under300")}
                  >
                    <Text style={[styles.chipText, filterCostRange === "under300" && styles.chipTextActive]}>Under ₹300</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, filterVegNonVeg === "veg" && styles.chipActive]}
                    onPress={() => setFilterVegNonVeg(filterVegNonVeg === "veg" ? "all" : "veg")}
                  >
                    <View style={styles.chipVegDot} />
                    <Text style={[styles.chipText, filterVegNonVeg === "veg" && styles.chipTextActive]}>Pure Veg</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Browse by cuisine (Food) / meat type (Meat, no eyebrow label in the mockup) */}
            <View style={styles.cuisineSection}>
              {activeService === "Food" && <Text style={styles.cuisineLabel}>Browse by cuisine</Text>}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineScrollContent}>
                {cuisineChips.map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine);
                  return (
                    <TouchableOpacity
                      key={cuisine}
                      style={styles.cuisineItem}
                      activeOpacity={0.8}
                      onPress={() => setSelectedCuisines(isSelected ? selectedCuisines.filter((c) => c !== cuisine) : [...selectedCuisines, cuisine])}
                    >
                      <View style={[styles.cuisineCircle, isSelected && { borderColor: accent.accent, borderWidth: 2 }]}>
                        <Text style={styles.cuisineEmoji}>{CUISINE_EMOJI[cuisine] || "🍽️"}</Text>
                      </View>
                      <Text style={[styles.cuisineName, isSelected && { color: accent.accent }]}>{cuisine}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {filteredAndSortedItems.length > 0 && (
              <View style={styles.listHeadingBlock}>
                <Text style={styles.listHeading}>{activeService === "Meat" ? "Meat centers" : "All restaurants"}</Text>
                <Text style={styles.listHeadingMeta}>
                  {activeService === "Meat"
                    ? `${filteredAndSortedItems.length} open within ${appliedDistanceKm || 5} km`
                    : `${filteredAndSortedItems.length} open near ${areaLabel}`}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Pinned outside the FlatList (not part of scrollable content, not a
          scroll-triggered "sticky" swap-in) so it always reserves the
          safe-area inset and can never be scrolled underneath the status
          bar, even for a single frame during the scroll gesture itself —
          which a scroll-position-triggered header can't guarantee no matter
          where its threshold is set. */}
      <View
        style={[styles.topRow, { paddingTop: Math.max(insets.top, 24) + 6 }]}
        onLayout={(e) => setAddressBarHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity style={styles.addressBlock} activeOpacity={0.7} onPress={() => router.push("/delivery/saved-addresses")}>
          <Text style={styles.addressEyebrow}>Delivery to</Text>
          <View style={styles.addressLabelRow}>
            <Text style={styles.addressLabel} numberOfLines={1}>{areaLabel}</Text>
            <Ionicons name="chevron-down" size={moderateScale(12)} color={tokens.sec} />
          </View>
          <Text style={styles.addressLine} numberOfLines={1}>{areaLine}</Text>
        </TouchableOpacity>
        <View style={styles.topRowActions}>
          <TouchableOpacity style={styles.iconBtnCircle} onPress={() => setIsDistanceSheetOpen(true)}>
            <MaterialCommunityIcons name="radius-outline" size={moderateScale(18)} color={tokens.sec} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push("/(tabs)/profile")}>
            <Ionicons name="person-outline" size={moderateScale(18)} color={tokens.sec} />
          </TouchableOpacity>
        </View>
      </View>

      {/* [scroll-animate-1] Docked copy of the category switcher — always
          mounted, opacity/translateY driven continuously by scroll position
          (see dockedBarOpacity/dockedBarTranslateY above) instead of a
          threshold toggle, so it reads as settling into place rather than
          popping in. Absolutely positioned right under the pinned address
          bar; pointerEvents only turns on once fully docked so it can't
          steal taps from the real tiles while still mid-fade. */}
      <Animated.View
        pointerEvents={isCategoryBarInteractive ? "auto" : "none"}
        style={[
          styles.categoryBarDocked,
          { top: addressBarHeight, opacity: dockedBarOpacity, transform: [{ translateY: dockedBarTranslateY }] },
        ]}
      >
        <View style={styles.categoryBar}>
          <View style={styles.categoryTogglePill}>
            <TouchableOpacity
              style={[styles.categoryToggleCell, activeService === "Food" && { backgroundColor: tokens.services.food.skin }]}
              onPress={() => handleServiceSwitch("Food")}
            >
              <Text style={styles.categoryToggleEmoji}>🍛</Text>
              <Text style={[styles.categoryToggleLabel, activeService === "Food" && { color: tokens.services.food.accent }]}>Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryToggleCell, activeService === "Meat" && { backgroundColor: tokens.services.meat.skin }]}
              onPress={() => handleServiceSwitch("Meat")}
            >
              <Text style={styles.categoryToggleEmoji}>🍖</Text>
              <Text style={[styles.categoryToggleLabel, activeService === "Meat" && { color: tokens.services.meat.accent }]}>Meat</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.categoryIconBtn} onPress={() => router.push("/all-services")}>
            <Text style={styles.categoryToggleEmoji}>🛺</Text>
            <Text style={styles.categoryToggleLabel}>Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryIconBtn} onPress={() => router.push("/helper-task")}>
            <Text style={styles.categoryToggleEmoji}>🧰</Text>
            <Text style={styles.categoryToggleLabel}>Task</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={listData}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          if (item.isSkeleton) return <HomeSkeletonCard tokens={tokens} />;
          if (item.isHeader) return <Text style={styles.listSectionHeader}>{item.title}</Text>;
          if (item.isRestaurant) return <RestaurantListItem {...item} isMeat={activeService === "Meat"} />;
          if (item.isDish) return <DishSearchResultItem item={item} tokens={tokens} accent={accent} styles={styles} />;
          return null;
        }}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={() => {
          if (showHomeSkeleton || loadingDrivers) return null;

          if (hasNoLocation) {
            return (
              <View style={styles.noServiceContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: tokens.warningSkin }]}>
                  <Ionicons name="location-sharp" size={26} color={tokens.warning} />
                </View>
                <Text style={styles.noServiceTitle}>No location selected</Text>
                <Text style={styles.noServiceSubtitle}>We need an address to show prices, ETAs and who's open near you.</Text>
                <TouchableOpacity style={styles.noServiceButton} onPress={handleUseCurrentLocation}>
                  <Text style={styles.noServiceButtonText}>Use my current location</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.noServiceSecondaryButton} onPress={() => router.push("/delivery/saved-addresses")}>
                  <Text style={styles.noServiceSecondaryButtonText}>Enter address manually</Text>
                </TouchableOpacity>
              </View>
            );
          }
          if (searchText) {
            const hasActiveFilters = activeFilterCount > 0;
            const tryInstead = activeService === "Meat" ? ["Chicken curry cut", "Mutton", "Prawns"] : ["Biryani", "Pizza", "₹149 meals"];
            return (
              <View style={styles.emptySearchContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="search-outline" size={26} color={tokens.sec} />
                </View>
                <Text style={styles.emptySearchTitle}>No results found</Text>
                <Text style={styles.emptySearchSubtitle}>
                  {hasActiveFilters
                    ? `Nothing matches "${searchText}" with ${activeFilterCount} ${activeFilterCount === 1 ? "filter" : "filters"} on.`
                    : `We couldn't find any outlets matching "${searchText}".`}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles.noServiceButton}
                    onPress={() => {
                      setFilter99Store(false);
                      setFilterFastDelivery(false);
                      setFilterOffers(false);
                      setFilterRating4Plus(false);
                      setFilterCostRange("all");
                      setFilterVegNonVeg("all");
                      setSelectedCuisines([]);
                    }}
                  >
                    <Text style={styles.noServiceButtonText}>Clear filters</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.tryInsteadLabel}>Try instead</Text>
                <View style={styles.tryInsteadRow}>
                  {tryInstead.map((term) => (
                    <TouchableOpacity key={term} style={styles.tryInsteadChip} onPress={() => setSearchText(term)}>
                      <Text style={styles.tryInsteadChipText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }
          if (nearbyDriversCount === 0) {
            return (
              <View style={styles.noServiceContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: accent.skin }]}>
                  <Ionicons name="bicycle-outline" size={26} color={accent.accent} />
                </View>
                <Text style={styles.noServiceTitle}>No riders available nearby</Text>
                <Text style={styles.noServiceSubtitle}>All captains nearby are on trips right now. It's usually a few minutes before one frees up.</Text>
                <TouchableOpacity
                  style={[styles.noServiceButton, isRetryingDrivers && styles.noServiceButtonDisabled]}
                  disabled={isRetryingDrivers}
                  onPress={async () => {
                    setIsRetryingDrivers(true);
                    try {
                      const { lat, lng } = await getCoords();
                      if (lat && lng) await checkNearbyDrivers(lat, lng, { silent: true });
                    } finally {
                      setIsRetryingDrivers(false);
                    }
                  }}
                >
                  {isRetryingDrivers ? (
                    <ActivityIndicator size="small" color={accent.on} />
                  ) : (
                    <Text style={styles.noServiceButtonText}>Retry search</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.noServiceSecondaryButton} onPress={() => router.push("/delivery/saved-addresses")}>
                  <Text style={styles.noServiceSecondaryButtonText}>Change location</Text>
                </TouchableOpacity>
              </View>
            );
          }
          if (visibleItems.length === 0) {
            const serviceName = activeService === "Meat" ? "meat" : "food";
            return (
              <View style={styles.noServiceContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="map-outline" size={26} color={tokens.sec} />
                </View>
                <Text style={styles.noServiceTitle}>Services aren't available in this location</Text>
                <Text style={styles.noServiceSubtitle}>We don't have {serviceName} outlets or delivery services here yet. Try another location, or let us know you're waiting.</Text>
                <TouchableOpacity style={styles.noServiceButton} onPress={() => router.push("/delivery/saved-addresses")}>
                  <Text style={styles.noServiceButtonText}>Change location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.noServiceSecondaryButton}
                  onPress={() => Alert.alert("Thanks!", "We'll notify you when we launch in your area.")}
                >
                  <Text style={styles.noServiceSecondaryButtonText}>Notify me when you launch</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return null;
        }}
        ListFooterComponent={() => (
          <View>
            {loadingMore ? <ActivityIndicator size="small" color={accent.accent} style={{ marginVertical: 20 }} /> : <View style={{ height: 24 }} />}
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[styles.mainScrollContent, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 140 : tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshing={false}
        onRefresh={async () => {
          setPage(1);
          setHasMore(true);
          const { lat, lng } = await getCoords();
          checkNearbyDrivers(lat, lng);
          if (activeService === "Meat") fetchMeatCenters(lat, lng, 1);
          else { fetchVendors(lat, lng, 1); fetch149StoreItems(lat, lng); }
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              const y = event.nativeEvent.contentOffset.y;
              const interactive = y >= collapseEnd;
              if (interactive !== isCategoryBarInteractive) setIsCategoryBarInteractive(interactive);
            },
          }
        )}
        scrollEventThrottle={16}
      />

      <AppTabBar active="home" accent={activeService === "Meat" ? "meat" : "food"} cartVendorName={cartVendorName} />

      {/* Search overlay */}
      <Modal
        visible={isSearchVisible}
        animationType="none"
        transparent
        onRequestClose={() => setIsSearchActive(false)}
        onShow={() => {
          Animated.parallel([
            Animated.timing(searchTranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.poly(3)), useNativeDriver: true }),
            Animated.timing(searchBackdropOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
          ]).start();
        }}
      >
        <View style={{ flex: 1 }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", opacity: searchBackdropOpacity }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsSearchActive(false)} />
          </Animated.View>
          <Animated.View
            style={[
              styles.searchSheet,
              { paddingTop: Math.max(insets.top, 16), maxHeight: Dimensions.get("window").height * 0.85 },
              { transform: [{ translateY: searchTranslateY }] },
            ]}
          >
            <View style={styles.searchSheetHeaderRow}>
              <TouchableOpacity onPress={() => setIsSearchActive(false)}>
                <Ionicons name="arrow-back" size={moderateScale(22)} color={tokens.sec} />
              </TouchableOpacity>
              <Text style={styles.searchSheetHeaderText}>Search for dishes & restaurants</Text>
            </View>

            <View style={styles.searchSheetInputRow}>
              <View style={styles.searchSheetInputWrap}>
                <Ionicons name="search" size={moderateScale(18)} color={tokens.muted} />
                <TextInput
                  style={styles.searchSheetInput}
                  placeholder="Try 'Bawarchi'"
                  placeholderTextColor={tokens.muted}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={() => addRecentSearch(searchText)}
                />
                {!!searchText && (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <Ionicons name="close-circle" size={moderateScale(18)} color={tokens.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {!searchText ? (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {recentSearches.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={styles.searchSectionHeadRow}>
                      <Text style={styles.searchSectionTitle}>RECENTLY SEARCHED</Text>
                      <TouchableOpacity onPress={clearRecentSearches}><Text style={styles.searchClearLink}>Clear</Text></TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {recentSearches.map((query, index) => (
                        <TouchableOpacity key={index} style={styles.searchSuggestChip} onPress={() => setSearchText(query)}>
                          <Ionicons name="time-outline" size={moderateScale(14)} color={tokens.sec} />
                          <Text style={styles.searchSuggestChipText}>{query}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                <View style={{ marginBottom: 24 }}>
                  <Text style={styles.searchSectionTitle}>RECOMMENDED</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {["Biryani", "Pizza", "Burger", "Chinese", "Desserts"].map((rec, i) => (
                      <TouchableOpacity key={i} style={styles.searchSuggestChip} onPress={() => setSearchText(rec)}>
                        <Text style={styles.searchSuggestChipText}>{rec}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            ) : (
              <FlatList
                data={listData.filter((item: any) => item.isHeader || item.isRestaurant || item.isDish)}
                keyExtractor={(item) => item._id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }: any) => {
                  if (item.isHeader) return <Text style={styles.listSectionHeader}>{item.title}</Text>;
                  if (item.isRestaurant) return <RestaurantListItem {...item} isMeat={activeService === "Meat"} />;
                  if (item.isDish) return <DishSearchResultItem item={item} tokens={tokens} accent={accent} styles={styles} />;
                  return null;
                }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearchContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="search-outline" size={26} color={tokens.sec} />
                    </View>
                    <Text style={styles.emptySearchTitle}>No results found</Text>
                    <Text style={styles.emptySearchSubtitle}>We couldn't find any outlets matching "{searchText}".</Text>
                  </View>
                )}
              />
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Distance sheet */}
      <Modal visible={isDistanceSheetOpen} transparent animationType="slide" onRequestClose={() => setIsDistanceSheetOpen(false)}>
        <KeyboardAvoidingView style={styles.distanceModalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}>
          <TouchableOpacity style={styles.distanceModalScrim} onPress={() => setIsDistanceSheetOpen(false)} />
          <View style={[styles.distanceSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.distanceSheetHandle} />
            <View style={styles.distanceSheetHeader}>
              <View>
                <Text style={styles.distanceTitle}>Customize distance</Text>
                <Text style={styles.distanceSubtitle}>{appliedDistanceKm ? `Filtering within ${appliedDistanceKm} km` : "Showing all nearby options"}</Text>
              </View>
              <TouchableOpacity style={styles.distanceCloseBtn} onPress={() => setIsDistanceSheetOpen(false)}>
                <Ionicons name="close" size={moderateScale(18)} color={tokens.text} />
              </TouchableOpacity>
            </View>

            {distanceOption === "custom" && (
              <View style={styles.distanceInputWrap}>
                <Ionicons name="navigate-outline" size={moderateScale(18)} color={tokens.sec} />
                <TextInput
                  style={styles.distanceInput}
                  value={customDistance}
                  onChangeText={(value) => { setDistanceOption("custom"); setCustomDistance(value.replace(/[^0-9.]/g, "")); }}
                  placeholder="Enter distance"
                  placeholderTextColor={tokens.muted}
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
                  onPress={() => { setDistanceOption(option); setCustomDistance(""); }}
                >
                  <Text style={[styles.distanceChipText, distanceOption === option && styles.distanceChipTextActive]}>{option} km</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.distanceChip, distanceOption === "custom" && styles.distanceChipActive]} onPress={() => setDistanceOption("custom")}>
                <Text style={[styles.distanceChipText, distanceOption === "custom" && styles.distanceChipTextActive]}>Custom</Text>
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

      {/* Startup ad */}
      {activeStartupAd && (
        <Modal visible={hasShownStartupAd && !!activeStartupAd} transparent animationType="fade">
          <View style={styles.startupAdOverlay}>
            <View style={styles.startupAdCard}>
              <TouchableOpacity style={styles.startupAdCloseBtn} onPress={dismissStartupAd}>
                <Feather name="x" size={moderateScale(16)} color={tokens.text} />
              </TouchableOpacity>
              <Image source={{ uri: activeStartupAd.imageUrl }} style={styles.startupAdImage} resizeMode="cover" />
              <View style={{ padding: 18 }}>
                <Text style={styles.startupAdTitle}>{activeStartupAd.title}</Text>
                {activeStartupAd.description && <Text style={styles.startupAdDescription}>{activeStartupAd.description}</Text>}
                <TouchableOpacity style={styles.startupAdBtn} onPress={dismissStartupAd}>
                  <Text style={styles.startupAdBtnText}>Continue to app</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Filter modal */}
      <Modal visible={isFilterModalVisible} transparent animationType="slide" onRequestClose={() => setIsFilterModalVisible(false)}>
        <View style={styles.filterModalOverlay}>
          <TouchableOpacity style={styles.filterModalScrim} activeOpacity={1} onPress={() => setIsFilterModalVisible(false)} />
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.filterModalCloseBtn}>
                <Ionicons name="close" size={moderateScale(22)} color={tokens.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterModalBody}>
              <View style={styles.filterModalLeftPane}>
                {[
                  { id: "Sort", label: "Sort" },
                  { id: "99store", label: "149 Store" },
                  { id: "15mins", label: "15 mins" },
                  { id: "Offers", label: "Offers" },
                  { id: "Ratings", label: "Ratings" },
                  { id: "CostForTwo", label: "Cost for two" },
                  { id: "VegNonVeg", label: "Veg/Non-Veg" },
                  { id: "Cuisines", label: "Cuisines" },
                ].map((tab) => {
                  const isActive = activeFilterTab === tab.id;
                  let hasApplied = false;
                  if (tab.id === "Sort" && selectedSort !== "relevance") hasApplied = true;
                  if (tab.id === "99store" && filter99Store) hasApplied = true;
                  if (tab.id === "15mins" && filterFastDelivery) hasApplied = true;
                  if (tab.id === "Offers" && filterOffers) hasApplied = true;
                  if (tab.id === "Ratings" && filterRating4Plus) hasApplied = true;
                  if (tab.id === "CostForTwo" && filterCostRange !== "all") hasApplied = true;
                  if (tab.id === "VegNonVeg" && filterVegNonVeg !== "all") hasApplied = true;
                  if (tab.id === "Cuisines" && selectedCuisines.length > 0) hasApplied = true;
                  return (
                    <TouchableOpacity key={tab.id} style={[styles.filterTabButton, isActive && styles.filterTabButtonActive]} onPress={() => setActiveFilterTab(tab.id)}>
                      {hasApplied && <View style={styles.filterTabIndicator} />}
                      <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ScrollView style={styles.filterModalRightPane} contentContainerStyle={{ padding: 16 }}>
                {activeFilterTab === "Sort" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>SORT BY</Text>
                    {[
                      { id: "relevance", label: "Relevance (Default)" },
                      { id: "time", label: "Delivery Time" },
                      { id: "rating", label: "Rating" },
                      { id: "costLowHigh", label: "Cost: Low to High" },
                      { id: "costHighLow", label: "Cost: High to Low" },
                    ].map((opt) => (
                      <TouchableOpacity key={opt.id} style={styles.filterOptionRow} onPress={() => setSelectedSort(opt.id)}>
                        <Ionicons name={selectedSort === opt.id ? "radio-button-on" : "radio-button-off"} size={moderateScale(18)} color={selectedSort === opt.id ? accent.accent : tokens.muted} />
                        <Text style={[styles.filterOptionLabel, selectedSort === opt.id && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {activeFilterTab === "99store" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>149 STORE PARTNERS</Text>
                    <TouchableOpacity style={styles.filterOptionRow} onPress={() => setFilter99Store(!filter99Store)}>
                      <Ionicons name={filter99Store ? "checkbox" : "square-outline"} size={moderateScale(18)} color={filter99Store ? accent.accent : tokens.muted} />
                      <Text style={[styles.filterOptionLabel, filter99Store && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>Show 149 Store partners</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeFilterTab === "15mins" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>DELIVERY TIME</Text>
                    <TouchableOpacity style={styles.filterOptionRow} onPress={() => setFilterFastDelivery(!filterFastDelivery)}>
                      <Ionicons name={filterFastDelivery ? "checkbox" : "square-outline"} size={moderateScale(18)} color={filterFastDelivery ? accent.accent : tokens.muted} />
                      <Text style={[styles.filterOptionLabel, filterFastDelivery && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>Fast delivery (under 30 mins)</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeFilterTab === "Offers" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>OFFERS</Text>
                    <TouchableOpacity style={styles.filterOptionRow} onPress={() => setFilterOffers(!filterOffers)}>
                      <Ionicons name={filterOffers ? "checkbox" : "square-outline"} size={moderateScale(18)} color={filterOffers ? accent.accent : tokens.muted} />
                      <Text style={[styles.filterOptionLabel, filterOffers && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>Free delivery / special offers</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeFilterTab === "Ratings" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>RATINGS</Text>
                    <TouchableOpacity style={styles.filterOptionRow} onPress={() => setFilterRating4Plus(!filterRating4Plus)}>
                      <Ionicons name={filterRating4Plus ? "checkbox" : "square-outline"} size={moderateScale(18)} color={filterRating4Plus ? accent.accent : tokens.muted} />
                      <Text style={[styles.filterOptionLabel, filterRating4Plus && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>Ratings 4.0+</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeFilterTab === "CostForTwo" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>COST FOR TWO</Text>
                    {[
                      { id: "all", label: "Show all" },
                      { id: "under300", label: "Less than ₹300" },
                      { id: "300to600", label: "₹300 – ₹600" },
                      { id: "over600", label: "More than ₹600" },
                    ].map((opt) => (
                      <TouchableOpacity key={opt.id} style={styles.filterOptionRow} onPress={() => setFilterCostRange(opt.id)}>
                        <Ionicons name={filterCostRange === opt.id ? "radio-button-on" : "radio-button-off"} size={moderateScale(18)} color={filterCostRange === opt.id ? accent.accent : tokens.muted} />
                        <Text style={[styles.filterOptionLabel, filterCostRange === opt.id && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {activeFilterTab === "VegNonVeg" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>DIETARY PREFERENCE</Text>
                    {[
                      { id: "all", label: "Show all" },
                      { id: "veg", label: "Pure veg" },
                      { id: "nonveg", label: "Non-veg" },
                    ].map((opt) => (
                      <TouchableOpacity key={opt.id} style={styles.filterOptionRow} onPress={() => setFilterVegNonVeg(opt.id)}>
                        <Ionicons name={filterVegNonVeg === opt.id ? "radio-button-on" : "radio-button-off"} size={moderateScale(18)} color={filterVegNonVeg === opt.id ? accent.accent : tokens.muted} />
                        <Text style={[styles.filterOptionLabel, filterVegNonVeg === opt.id && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {activeFilterTab === "Cuisines" && (
                  <View>
                    <Text style={styles.filterSectionTitle}>CUISINES</Text>
                    {availableCuisines.length === 0 ? (
                      <Text style={styles.filterEmptyNote}>No cuisines available in current location.</Text>
                    ) : (
                      availableCuisines.map((cuisine) => {
                        const isSelected = selectedCuisines.includes(cuisine);
                        return (
                          <TouchableOpacity
                            key={cuisine}
                            style={styles.filterOptionRow}
                            onPress={() => setSelectedCuisines(isSelected ? selectedCuisines.filter((c) => c !== cuisine) : [...selectedCuisines, cuisine])}
                          >
                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={moderateScale(18)} color={isSelected ? accent.accent : tokens.muted} />
                            <Text style={[styles.filterOptionLabel, isSelected && { color: accent.accent, fontFamily: fontFamilies.body.bold }]}>{cuisine}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterModalClearBtn}
                onPress={() => {
                  setSelectedSort("relevance");
                  setFilter99Store(false);
                  setFilterFastDelivery(false);
                  setFilterOffers(false);
                  setFilterRating4Plus(false);
                  setFilterCostRange("all");
                  setFilterVegNonVeg("all");
                  setSelectedCuisines([]);
                }}
              >
                <Text style={styles.filterModalClearText}>Clear filters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterModalApplyBtn} onPress={() => setIsFilterModalVisible(false)}>
                <Text style={styles.filterModalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SkeletonBlock({ style, shimmer, shimmerHighlight }: { style: ViewStyle; shimmer: Animated.Value; shimmerHighlight: string }) {
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-220, 220] });
  return (
    <View style={[style, { overflow: "hidden" }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { width: 220, transform: [{ translateX }] }]}>
        <LinearGradient colors={["transparent", shimmerHighlight, "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
    </View>
  );
}

function HomeSkeletonCard({ tokens }: { tokens: ThemeTokens }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const shimmerHighlight = "rgba(255,255,255,0.5)";

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
      <SkeletonBlock style={{ height: moderateScale(88), borderRadius: moderateScale(8), backgroundColor: tokens.sunken }} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
      <SkeletonBlock style={{ width: "70%", height: moderateScale(18), borderRadius: moderateScale(6), backgroundColor: tokens.sunken, marginTop: 12 }} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
      <SkeletonBlock style={{ width: "45%", height: moderateScale(12), borderRadius: moderateScale(4), backgroundColor: tokens.sunken, marginTop: 8 }} shimmer={shimmer} shimmerHighlight={shimmerHighlight} />
    </View>
  );
}

function DishSearchResultItem({ item, tokens, accent, styles }: { item: any; tokens: ThemeTokens; accent: ServiceTokens; styles: any }) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find((i) => i._id === item._id);
  const vendor = item.vendorId;

  const handleAdd = () => {
    if (vendor?._id) addItem(item, vendor._id);
  };

  const handleNavigateToMenu = () => {
    if (vendor?._id) {
      router.push({
        pathname: "/restaurant-menu",
        params: { id: vendor._id, name: vendor.name, image: vendor.image || "", rating: String(vendor.rating || "4.8"), reviews: vendor.reviews || "2k+", isMeat: "false", highlightDishId: item._id },
      });
    }
  };

  return (
    <View style={styles.dishMenuItem}>
      <TouchableOpacity style={styles.dishItemInfo} activeOpacity={0.7} onPress={handleNavigateToMenu}>
        <View style={styles.dishItemTitleRow}>
          <View style={[styles.dishVegIndicator, { borderColor: item.isVeg ? tokens.veg : tokens.nonveg }]}>
            <View style={[styles.dishVegDot, { backgroundColor: item.isVeg ? tokens.veg : tokens.nonveg }]} />
          </View>
          <Text style={styles.dishItemName} numberOfLines={1}>{item.name}</Text>
        </View>
        <Text style={styles.dishItemPrice}>₹{item.price}</Text>
        <Text style={styles.dishItemDesc} numberOfLines={2}>{item.description}</Text>
        {vendor && (
          <View style={styles.dishVendorRow}>
            <Ionicons name="storefront-outline" size={moderateScale(13)} color={tokens.sec} />
            <Text style={styles.dishVendorText} numberOfLines={1}>from {vendor.name}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.dishItemImageContainer}>
        <TouchableOpacity activeOpacity={0.85} onPress={handleNavigateToMenu}>
          <Image source={{ uri: item.images && item.images.length > 0 ? item.images[0] : "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400" }} style={styles.dishItemImage} />
        </TouchableOpacity>
        <View style={styles.dishAddButtonOverlay}>
          {cartItem ? (
            <View style={styles.dishQuantityPill}>
              <TouchableOpacity onPress={() => updateQuantity(item._id, cartItem.quantity - 1)} style={styles.dishQtyActionBtn}>
                <Feather name="minus" size={moderateScale(12)} color={accent.accent} />
              </TouchableOpacity>
              <Text style={styles.dishQtyText}>{cartItem.quantity}</Text>
              <TouchableOpacity onPress={handleAdd} style={styles.dishQtyActionBtn}>
                <Feather name="plus" size={moderateScale(12)} color={accent.accent} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleAdd} style={styles.dishAddPill} activeOpacity={0.85}>
              <Text style={styles.dishAddPillText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ServiceTokens) => StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg },
  mainScrollContent: { paddingBottom: 100 },

  // [check1] Small bump to the header's overall breathing room — was feeling
  // cramped with everything (address bar, headline, search bar, tiles) packed
  // tightly together.
  topRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6, backgroundColor: tokens.bg,
  },
  addressBlock: { flex: 1, minWidth: 0 },
  addressEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: accent.accent },
  addressLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  addressLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
  addressLine: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 3 },
  topRowActions: { flexDirection: "row", gap: 10 },
  iconBtnCircle: {
    width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(22),
    backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
  },
  avatarBtn: {
    width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(22),
    backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
  },

  headline: {
    fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(28), lineHeight: moderateScale(31),
    letterSpacing: -0.6, color: tokens.text, paddingHorizontal: 16, marginTop: 22,
  },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tokens.surface,
    borderWidth: 1, borderColor: tokens.border, borderRadius: moderateScale(14), height: moderateScale(52),
    paddingHorizontal: 14, marginHorizontal: 16, marginTop: 16,
  },
  searchPlaceholder: { flex: 1, fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), color: tokens.sec },

  tilesRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 18, marginBottom: 2, alignItems: "stretch" },
  togglePill: { flex: 1, flexDirection: "row", gap: 4, backgroundColor: tokens.sunken, borderRadius: moderateScale(22), padding: 4 },
  toggleCell: { flex: 1, borderRadius: moderateScale(18), borderWidth: 1.5, borderColor: "transparent", paddingVertical: 12, alignItems: "center", gap: 7 },
  launcherTile: {
    flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: moderateScale(20),
    paddingVertical: 13, alignItems: "center", gap: 7, position: "relative",
  },
  launcherArrow: { position: "absolute", top: 6, right: 8, fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), color: tokens.sec },
  toggleIconCircle: { width: moderateScale(32), height: moderateScale(32), borderRadius: moderateScale(11), alignItems: "center", justifyContent: "center" },
  toggleEmoji: { fontSize: moderateScale(15) },
  // Ride/Task carry a permanent skin tint, so the slack around a 15pt emoji in
  // the 32pt toggle circle showed up as an oversized empty box. Tighter frame,
  // bigger glyph — the icon fills ~63% of it instead of ~47%.
  launcherIconCircle: { width: moderateScale(30), height: moderateScale(30), borderRadius: moderateScale(10), alignItems: "center", justifyContent: "center" },
  launcherEmoji: { fontSize: moderateScale(19), lineHeight: moderateScale(23), textAlign: "center", includeFontPadding: false },
  toggleLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), color: tokens.sec },

  // [scroll-animate-1] Wraps categoryBar so it can be absolutely docked
  // right under the pinned address bar and driven by scroll-position
  // interpolation, independent of the FlatList's own document flow.
  categoryBarDocked: { position: "absolute", left: 0, right: 0, zIndex: 50 },
  categoryBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    backgroundColor: tokens.bg, borderBottomWidth: 1, borderBottomColor: tokens.border,
  },
  categoryTogglePill: { flexDirection: "row", gap: 4, backgroundColor: tokens.sunken, borderRadius: 999, padding: 4 },
  categoryToggleCell: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, height: moderateScale(32), borderRadius: 999,
  },
  categoryIconBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, height: moderateScale(32), borderRadius: 999,
    borderWidth: 1, borderColor: tokens.border,
  },
  categoryToggleEmoji: { fontSize: moderateScale(14) },
  categoryToggleLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: tokens.sec },

  promoSection: { marginTop: 20 },
  promoScrollContent: { paddingHorizontal: 16, gap: CARD_GAP },
  promoCard: { width: CARD_W, height: 140, borderRadius: moderateScale(18), borderWidth: 1, borderColor: tokens.border, padding: 18, justifyContent: "space-between" },
  promoEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase" },
  promoHeadline: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(24), lineHeight: moderateScale(26), letterSpacing: -0.5, color: tokens.text, marginTop: 8 },
  promoCaption: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
  promoDotsRow: { flexDirection: "row", justifyContent: "center", gap: 5, paddingTop: 12 },
  promoDot: { height: 5, borderRadius: 999 },

  adCard: { marginHorizontal: 16, marginTop: 16, borderRadius: moderateScale(16), overflow: "hidden", borderWidth: 1, borderColor: tokens.border },
  adImage: { width: "100%", height: 140 },
  adCaption: { padding: 12, backgroundColor: tokens.surface },
  adTitle: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: tokens.text },
  adDescription: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

  sectionBlock: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionHeadLeft: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  sectionTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), letterSpacing: -0.1, color: tokens.text },
  sectionMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
  sectionSeeAll: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: accent.accent },
  mealsScrollContent: { gap: 12 },

  mealCard: { width: 132 },
  mealImageWrap: { position: "relative" },
  mealImage: { width: 132, height: 96, borderRadius: moderateScale(8), backgroundColor: tokens.sunken },
  mealPriceBadge: { position: "absolute", top: 6, left: 6, backgroundColor: accent.accent, borderRadius: moderateScale(5), paddingHorizontal: 6, paddingVertical: 3 },
  mealPriceBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 0.5, color: accent.on },
  mealAddBtn: {
    position: "absolute", bottom: -10, right: 6, width: moderateScale(26), height: moderateScale(26), borderRadius: moderateScale(13),
    backgroundColor: accent.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: tokens.bg,
  },
  mealAddBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), color: accent.on },
  mealName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text, marginTop: 8 },
  mealVendor: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },

  vegOnlyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 22 },
  vegOnlyLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  vegOnlyIcon: { width: moderateScale(16), height: moderateScale(16), borderWidth: 1.5, borderColor: tokens.veg, borderRadius: moderateScale(3), alignItems: "center", justifyContent: "center" },
  vegOnlyDot: { width: moderateScale(7), height: moderateScale(7), borderRadius: moderateScale(3.5), backgroundColor: tokens.veg },
  vegOnlyLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
  vegSwitchTrack: { width: moderateScale(52), height: moderateScale(30), borderRadius: 999, backgroundColor: tokens.sunken, padding: 3, justifyContent: "center" },
  vegSwitchThumb: { width: moderateScale(24), height: moderateScale(24), borderRadius: 999, backgroundColor: tokens.surface },

  chipsScrollContent: { paddingHorizontal: 16, gap: 8, marginTop: 16 },
  chip: {
    flexDirection: "row", alignItems: "center", backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  chipActive: { backgroundColor: tokens.text, borderColor: tokens.text },
  chipText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
  chipTextActive: { color: tokens.bg, fontFamily: fontFamilies.body.semibold },
  chipFilled: { backgroundColor: accent.accent, borderColor: accent.accent },
  chipFilledText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: accent.on },
  chipBadge: { marginLeft: 6, minWidth: moderateScale(16), height: moderateScale(16), borderRadius: moderateScale(8), backgroundColor: accent.on, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  chipBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), color: accent.accent },
  chipVegDot: { width: moderateScale(8), height: moderateScale(8), borderRadius: moderateScale(4), backgroundColor: tokens.veg, marginRight: 6 },

  cuisineSection: { marginTop: 22 },
  cuisineLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, paddingHorizontal: 16, marginBottom: 12 },
  cuisineScrollContent: { paddingHorizontal: 16, gap: 16 },
  cuisineItem: { width: 64, alignItems: "center" },
  cuisineCircle: { width: 64, height: 64, borderRadius: 999, backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
  cuisineEmoji: { fontSize: moderateScale(24) },
  cuisineName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: tokens.text, marginTop: 7, textAlign: "center" },

  listHeadingBlock: { paddingHorizontal: 16, marginTop: 26, marginBottom: 12 },
  listHeading: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.3, color: tokens.text },
  listHeadingMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },

  listSectionHeader: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1.2, textTransform: "uppercase", color: tokens.muted, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },

  emptyIconCircle: {
    width: moderateScale(60), height: moderateScale(60), borderRadius: moderateScale(20),
    backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center",
  },

  emptySearchContainer: { alignItems: "center", justifyContent: "center", paddingTop: 40, paddingHorizontal: 28 },
  emptySearchTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(20), letterSpacing: -0.3, color: tokens.text, marginTop: 18, textAlign: "center" },
  emptySearchSubtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, textAlign: "center", marginTop: 8 },
  tryInsteadLabel: {
    alignSelf: "flex-start", fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1,
    textTransform: "uppercase", color: tokens.muted, marginTop: 20, marginBottom: 10,
  },
  tryInsteadRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tryInsteadChip: { borderWidth: 1, borderColor: tokens.borderStrong, backgroundColor: tokens.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  tryInsteadChipText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },

  noServiceContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 44, paddingHorizontal: 28 },
  noServiceTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(20), letterSpacing: -0.3, color: tokens.text, marginTop: 18, textAlign: "center" },
  noServiceSubtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), color: tokens.sec, textAlign: "center", marginTop: 8, lineHeight: moderateScale(20) },
  noServiceButton: { marginTop: 22, width: "100%", alignItems: "center", paddingVertical: 15, borderRadius: moderateScale(14), backgroundColor: accent.accent },
  noServiceButtonDisabled: { opacity: 0.6 },
  noServiceButtonText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  noServiceSecondaryButton: { marginTop: 10, width: "100%", alignItems: "center", paddingVertical: 14, borderRadius: moderateScale(14), borderWidth: 1, borderColor: tokens.borderStrong, backgroundColor: tokens.surface },
  noServiceSecondaryButtonText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: accent.accent },

  dishMenuItem: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: tokens.surface, borderBottomWidth: 1, borderBottomColor: tokens.border },
  dishItemInfo: { flex: 1, paddingRight: 16 },
  dishItemTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dishVegIndicator: { borderWidth: 1, width: moderateScale(14), height: moderateScale(14), alignItems: "center", justifyContent: "center", borderRadius: moderateScale(2) },
  dishVegDot: { width: moderateScale(6), height: moderateScale(6), borderRadius: moderateScale(3) },
  dishItemName: { flex: 1, fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: tokens.text },
  dishItemPrice: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.text, marginTop: 4 },
  dishItemDesc: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: tokens.sec, marginTop: 4, lineHeight: moderateScale(16) },
  dishVendorRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 },
  dishVendorText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: tokens.sec },
  dishItemImageContainer: { width: 90, height: 90, position: "relative" },
  dishItemImage: { width: 90, height: 90, borderRadius: moderateScale(12), backgroundColor: tokens.sunken },
  dishAddButtonOverlay: { position: "absolute", bottom: -8, left: 8, right: 8, alignItems: "center" },
  dishAddPill: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong, paddingHorizontal: 16, paddingVertical: 5, borderRadius: moderateScale(8), minWidth: 70, alignItems: "center" },
  dishAddPillText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), color: accent.accent },
  dishQuantityPill: { flexDirection: "row", alignItems: "center", backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: moderateScale(8), paddingHorizontal: 4, paddingVertical: 4, gap: 8 },
  dishQtyActionBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  dishQtyText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), color: tokens.text },

  searchSheet: { backgroundColor: tokens.bg, borderBottomLeftRadius: moderateScale(24), borderBottomRightRadius: moderateScale(24), overflow: "hidden" },
  searchSheetHeaderRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  searchSheetHeaderText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.sec },
  searchSheetInputRow: { paddingHorizontal: 16, paddingBottom: 16 },
  searchSheetInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: moderateScale(14), paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 13 : 9 },
  searchSheetInput: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
  searchSectionHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  searchSectionTitle: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, color: tokens.muted },
  searchClearLink: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: accent.accent },
  searchSuggestChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: tokens.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  searchSuggestChipText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },

  distanceModalOverlay: { flex: 1, justifyContent: "flex-end" },
  distanceModalScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  distanceSheet: { backgroundColor: tokens.surface, borderTopLeftRadius: moderateScale(26), borderTopRightRadius: moderateScale(26), paddingHorizontal: 20, paddingTop: 10 },
  distanceSheetHandle: { width: moderateScale(42), height: moderateScale(4), borderRadius: moderateScale(2), backgroundColor: tokens.borderStrong, alignSelf: "center", marginBottom: 18 },
  distanceSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  distanceTitle: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(18), color: tokens.text },
  distanceSubtitle: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 3 },
  distanceCloseBtn: { width: moderateScale(34), height: moderateScale(34), borderRadius: moderateScale(17), backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center" },
  distancePresetRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  distanceChip: { minWidth: 68, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: moderateScale(18), backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border },
  distanceChipActive: { backgroundColor: accent.accent, borderColor: accent.accent },
  distanceChipText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: tokens.text },
  distanceChipTextActive: { color: accent.on },
  distanceInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: moderateScale(18), borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.sunken, paddingHorizontal: 14, marginBottom: 16 },
  distanceInput: { flex: 1, paddingVertical: Platform.OS === "ios" ? 14 : 10, color: tokens.text, fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14) },
  distanceInputUnit: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: tokens.sec },
  distanceApplyBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: moderateScale(18), backgroundColor: accent.accent },
  distanceApplyText: { fontFamily: fontFamilies.body.bold, color: accent.on, fontSize: moderateScale(14) },
  distanceClearBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 13, marginTop: 10, borderRadius: moderateScale(18), borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.surface },
  distanceClearText: { fontFamily: fontFamilies.body.bold, color: tokens.sec, fontSize: moderateScale(13) },

  startupAdOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  startupAdCard: { width: "90%", maxWidth: 340, backgroundColor: tokens.surface, borderRadius: moderateScale(18), overflow: "hidden", position: "relative" },
  startupAdCloseBtn: { position: "absolute", top: 12, right: 12, zIndex: 10, backgroundColor: tokens.surface, padding: 6, borderRadius: 14 },
  startupAdImage: { width: "100%", height: 200 },
  startupAdTitle: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(18), color: tokens.text, marginBottom: 6 },
  startupAdDescription: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.sec, lineHeight: moderateScale(18) },
  startupAdBtn: { backgroundColor: accent.accent, paddingVertical: 12, borderRadius: moderateScale(12), alignItems: "center", marginTop: 16 },
  startupAdBtnText: { fontFamily: fontFamilies.body.bold, color: accent.on, fontSize: moderateScale(14) },

  filterModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  filterModalScrim: { ...StyleSheet.absoluteFillObject },
  filterModalContent: { backgroundColor: tokens.surface, borderTopLeftRadius: moderateScale(24), borderTopRightRadius: moderateScale(24), height: "75%", overflow: "hidden" },
  filterModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: tokens.border },
  filterModalTitle: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(18), color: tokens.text },
  filterModalCloseBtn: { padding: 4 },
  filterModalBody: { flex: 1, flexDirection: "row" },
  filterModalLeftPane: { width: "35%", backgroundColor: tokens.sunken, borderRightWidth: 1, borderRightColor: tokens.border },
  filterModalRightPane: { width: "65%", backgroundColor: tokens.surface },
  filterTabButton: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: tokens.border, position: "relative" },
  filterTabButtonActive: { backgroundColor: tokens.surface },
  filterTabText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
  filterTabTextActive: { color: accent.accent, fontFamily: fontFamilies.body.bold },
  filterTabIndicator: { position: "absolute", left: 0, top: 12, bottom: 12, width: 4, backgroundColor: accent.accent, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  filterSectionTitle: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 0.8, color: tokens.muted, marginBottom: 16 },
  filterOptionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  filterOptionLabel: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec },
  filterEmptyNote: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.muted, fontStyle: "italic", marginTop: 10 },
  filterModalFooter: { flexDirection: "row", padding: 16, borderTopWidth: 1, borderTopColor: tokens.border, justifyContent: "space-between", alignItems: "center", backgroundColor: tokens.surface },
  filterModalClearBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  filterModalClearText: { fontFamily: fontFamilies.body.bold, color: tokens.sec, fontSize: moderateScale(14) },
  filterModalApplyBtn: { backgroundColor: accent.accent, paddingVertical: 12, paddingHorizontal: 36, borderRadius: 999 },
  filterModalApplyText: { fontFamily: fontFamilies.body.bold, color: accent.on, fontSize: moderateScale(14) },
});
