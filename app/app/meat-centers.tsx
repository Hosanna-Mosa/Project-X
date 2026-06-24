import React, { useEffect, useState, useCallback } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { RestaurantListItem } from "@/components/RestaurantListItem";
import * as Location from "expo-location";

const MEAT_CATEGORIES = [
  { id: 1, name: "Chicken", image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200" },
  { id: 2, name: "Mutton", image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=200" },
  { id: 3, name: "Fish", image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200" },
  { id: 4, name: "Prawns", image: "https://images.unsplash.com/photo-1565689157206-0fddef7589a2?w=200" },
  { id: 5, name: "Eggs", image: "https://images.unsplash.com/photo-1582722872445-44c56bb62441?w=200" },
];

export default function MeatCentersScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { theme, toggleTheme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const [meatCenters, setMeatCenters] = useState<any[]>([]);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getCoords = async () => {
    if (selectedAddress?.location?.coordinates) {
      const [lng, lat] = selectedAddress.location.coordinates;
      return { lat, lng };
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { lat: 17.4447, lng: 78.3498 };
    }

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: location.coords.latitude, lng: location.coords.longitude };
  };

  const fetchMeatCenters = async (lat: number, lng: number, pageNum: number = 1, category: string | null = null) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      let url = `${baseUrl}/api/v1/meat/nearby?lat=${lat}&lng=${lng}&page=${pageNum}&limit=20`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch meat centers: ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        if (data.length < 20) setHasMore(false);
        else setHasMore(true);

        if (pageNum === 1) {
          setMeatCenters(data);
        } else {
          setMeatCenters(prev => [...prev, ...data]);
        }
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
          if (activeStr) {
            setSelectedAddress(JSON.parse(activeStr));
          }
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

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const renderHeader = () => (
    <>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.meatCategoriesContainer}
      >
        {MEAT_CATEGORIES.map((cat) => (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.categoryCircleWrapper, selectedCategory === cat.name && styles.categorySelected]}
            onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
          >
            <View style={[styles.categoryCircle, selectedCategory === cat.name && { borderColor: colors.primary, borderWidth: 2 }]}>
              <Image source={{ uri: cat.image }} style={styles.categoryImage} />
            </View>
            <Text style={[styles.categoryLabel, selectedCategory === cat.name && { color: colors.primary, fontWeight: '800' }]} numberOfLines={1}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Filter</Text>
          <Ionicons name="options-outline" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Fast Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Ratings 4.0+</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={meatCenters}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <RestaurantListItem {...item} isMeat={true} />}
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
          fetchMeatCenters(lat, lng, 1, selectedCategory);
        }}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.flushHeader, { paddingTop: topPadding + 8 }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
               <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.locationInfoBox}>
              <View style={styles.deliveryTitleRow}>
                <Ionicons name="location" size={14} color={colors.primary} style={{marginRight: 6}} />
                <Text style={styles.deliveryTitle}>Delivery to</Text>
              </View>
              <TouchableOpacity 
                style={styles.addressSelector} 
                onPress={() => router.push("/delivery/saved-addresses")}
              >
                <Text style={styles.addressText} numberOfLines={1}>
                  {selectedAddress 
                    ? (selectedAddress.label === "Home" || selectedAddress.label === "Work"
                        ? selectedAddress.label.toUpperCase()
                        : (selectedAddress.label && selectedAddress.label !== "Other" ? selectedAddress.label.toUpperCase() : "ADDRESS"))
                    : "SELECT LOCATION"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{flexDirection: 'row', gap: 10}}>
              <TouchableOpacity style={styles.avatarBtnCircle} onPress={toggleTheme}>
                  <Ionicons name={theme === 'dark' ? 'sunny' : 'moon'} size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Meat Centers</Text>
            <Text style={styles.headerSubtitle}>Fresh meat delivered from nearby centers</Text>
          </View>
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
  root: { flex: 1, backgroundColor: colors.background },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  mainScrollContent: { paddingBottom: 100 },
  flushHeader: {
    backgroundColor: colors.surface,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  backBtn: { marginRight: 15 },
  locationInfoBox: { flex: 1 },
  deliveryTitleRow: { flexDirection: "row", alignItems: "center" },
  deliveryTitle: { fontSize: 11, fontWeight: "800", color: colors.textSecondary },
  addressSelector: { flexDirection: "row", alignItems: "center" },
  addressText: { fontSize: 13, fontWeight: "600", color: colors.text, maxWidth: "80%" },
  avatarBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleRow: { marginTop: 5 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  meatCategoriesContainer: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  categoryCircleWrapper: { alignItems: "center", gap: 8, width: 65 },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryImage: { width: "100%", height: "100%" },
  categoryLabel: { fontSize: 11, fontWeight: "600", color: colors.text, textAlign: "center" },
  categorySelected: { opacity: 1 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
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
  filterChipText: { fontSize: 12, fontWeight: "600", color: colors.text },
});
