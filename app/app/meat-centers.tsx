import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { RestaurantListItem } from "@/components/RestaurantListItem";

const MEAT_TYPES = [
  { name: "Chicken", emoji: "🐔" },
  { name: "Mutton", emoji: "🐐" },
  { name: "Fish", emoji: "🐟" },
  { name: "Prawns", emoji: "🦐" },
  { name: "Eggs", emoji: "🥚" },
];

type QuickFilter = "fast" | "rating" | "open";

export default function MeatCentersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.meat;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [meatCenters, setMeatCenters] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const getCoords = async () => {
    if (selectedAddress) {
      const lat = selectedAddress.coordinates?.lat ?? selectedAddress.location?.coordinates?.[1];
      const lng = selectedAddress.coordinates?.lng ?? selectedAddress.location?.coordinates?.[0];
      if (lat != null && lng != null) return { lat, lng };
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return { lat: 17.4447, lng: 78.3498 };
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: location.coords.latitude, lng: location.coords.longitude };
  };

  const fetchMeatCenters = async (lat: number, lng: number, pageNum: number = 1, category: string | null = null) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      let url = `${baseUrl}/api/v1/meat/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20`;
      if (category) url += `&category=${encodeURIComponent(category)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch meat centers: ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setHasMore(data.length >= 20);
        setMeatCenters((prev) => (pageNum === 1 ? data : [...prev, ...data]));
      }
    } catch (error) {
      console.error("Error fetching meat centers:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const activeStr = await AsyncStorage.getItem("active_address");
          if (activeStr) setSelectedAddress(JSON.parse(activeStr));
        } catch (e) {
          console.error("Failed to load active address:", e);
        }
      })();
    }, [])
  );

  useEffect(() => {
    (async () => {
      setPage(1);
      setHasMore(true);
      const { lat, lng } = await getCoords();
      fetchMeatCenters(lat, lng, 1, selectedCategory);
    })();
  }, [selectedAddress, selectedCategory]);

  const loadMore = async () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      const { lat, lng } = await getCoords();
      fetchMeatCenters(lat, lng, nextPage, selectedCategory);
    }
  };

  const toggleQuickFilter = (key: QuickFilter) => {
    setActiveQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleCenters = useMemo(() => {
    let list = meatCenters;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((c) => {
        const cats = Array.isArray(c.categories) ? c.categories.join(" ") : c.categories || "";
        return c.name?.toLowerCase().includes(q) || cats.toLowerCase().includes(q);
      });
    }
    if (activeQuickFilters.has("fast")) {
      list = list.filter((c) => parseInt(c.time?.match(/\d+/)?.[0] || "999", 10) <= 30);
    }
    if (activeQuickFilters.has("rating")) {
      list = list.filter((c) => (c.rating || 0) >= 4.0);
    }
    if (activeQuickFilters.has("open")) {
      list = list.filter((c) => c.isOpen !== false);
    }
    return list;
  }, [meatCenters, searchText, activeQuickFilters]);

  const renderHeader = () => (
    <>
      <View style={styles.headline}>
        <Text style={styles.headlineText}>Meat centers near you</Text>
        <Text style={styles.headlineSub}>{meatCenters.length} open · cut fresh on order</Text>
      </View>

      {searchOpen && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={moderateScale(16)} color={tokens.sec} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search centers or meat type"
            placeholderTextColor={tokens.muted}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={moderateScale(16)} color={tokens.sec} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typesRow}>
        {MEAT_TYPES.map((t) => {
          const isActive = selectedCategory === t.name;
          return (
            <TouchableOpacity
              key={t.name}
              style={styles.typeItem}
              onPress={() => setSelectedCategory(isActive ? null : t.name)}
            >
              <View style={[styles.typeCircle, isActive && styles.typeCircleActive]}>
                <Text style={{ fontSize: moderateScale(24) }}>{t.emoji}</Text>
              </View>
              <Text style={[styles.typeLabel, isActive && { color: accent.accent }]} numberOfLines={1}>
                {t.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, activeQuickFilters.has("fast") && styles.chipActive]}
          onPress={() => toggleQuickFilter("fast")}
        >
          <Text style={[styles.chipText, activeQuickFilters.has("fast") && styles.chipTextActive]}>Fast delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeQuickFilters.has("rating") && styles.chipActive]}
          onPress={() => toggleQuickFilter("rating")}
        >
          <Text style={[styles.chipText, activeQuickFilters.has("rating") && styles.chipTextActive]}>Ratings 4.0+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeQuickFilters.has("open") && styles.chipActive]}
          onPress={() => toggleQuickFilter("open")}
        >
          <Text style={[styles.chipText, activeQuickFilters.has("open") && styles.chipTextActive]}>Open now</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.topRow, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addressBlock} activeOpacity={0.7} onPress={() => router.push("/delivery/saved-addresses")}>
          <Text style={styles.addressEyebrow}>Delivery to</Text>
          <View style={styles.addressLabelRow}>
            <Text style={styles.addressLabel} numberOfLines={1}>
              {selectedAddress?.label ? `${selectedAddress.label} · Nallagandla` : "Select location"}
            </Text>
            <Ionicons name="chevron-down" size={moderateScale(12)} color={tokens.sec} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen((s) => !s)}>
          <Ionicons name={searchOpen ? "close" : "search"} size={moderateScale(17)} color={tokens.sec} />
        </TouchableOpacity>
      </View>

      {loading && meatCenters.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accent.accent} />
        </View>
      ) : (
        <FlatList
          data={visibleCenters}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <RestaurantListItem {...item} isMeat={true} />}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={() =>
            loadingMore ? <ActivityIndicator size="small" color={accent.accent} style={{ marginVertical: 20 }} /> : <View style={{ height: 120 }} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={async () => {
            setPage(1);
            setHasMore(true);
            const { lat, lng } = await getCoords();
            fetchMeatCenters(lat, lng, 1, selectedCategory);
          }}
        />
      )}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["meat"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    topRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    addressBlock: { flex: 1, minWidth: 0 },
    addressEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: accent.accent },
    addressLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
    addressLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text, flexShrink: 1 },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },

    searchRow: {
      flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tokens.surface,
      borderWidth: 1, borderColor: tokens.border, borderRadius: moderateScale(14), height: moderateScale(48),
      paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 14,
    },
    searchInput: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },

    headline: { paddingHorizontal: 16, paddingTop: 18 },
    headlineText: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.3, color: tokens.text },
    headlineSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 6 },

    typesRow: { paddingHorizontal: 16, paddingVertical: 18, gap: 16 },
    typeItem: { alignItems: "center", gap: 8, width: moderateScale(64) },
    typeCircle: {
      width: moderateScale(64), height: moderateScale(64), borderRadius: moderateScale(32),
      backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center",
    },
    typeCircleActive: { borderWidth: 2, borderColor: accent.accent, backgroundColor: accent.skin },
    typeLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(12), color: tokens.text, textAlign: "center" },

    chipsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
    chip: {
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong,
      borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
    },
    chipActive: { backgroundColor: accent.accent, borderColor: accent.accent },
    chipText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
    chipTextActive: { fontFamily: fontFamilies.body.semibold, color: accent.on },
  });
