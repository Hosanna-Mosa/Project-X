import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import { useHomeStore } from "@/contexts/homeStore";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";

function FavoriteCard({ item, tokens, styles, onToggleFavorite }: { item: any; tokens: ThemeTokens; styles: any; onToggleFavorite: (id: string) => void }) {
  const isMeat = item.partnerType === "meat";
  const accent = tokens.services[isMeat ? "meat" : "food"];
  const categoryLabel = Array.isArray(item.categories) ? item.categories.slice(0, 2).join(", ") : item.categories;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardThumb}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: "/restaurant-menu", params: { id: item._id, name: item.name, image: item.image || "", isMeat: isMeat ? "true" : "false" } })}
      >
        <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} />
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => onToggleFavorite(item._id)}>
            <Ionicons name="heart" size={moderateScale(16)} color={accent.accent} />
          </TouchableOpacity>
        </View>
        {isMeat && (
          <View style={[styles.serviceTag, { backgroundColor: accent.skin }]}>
            <Text style={[styles.serviceTagText, { color: accent.accent }]}>Meat</Text>
          </View>
        )}
        <Text style={styles.cardMeta} numberOfLines={1}>
          {categoryLabel}{item.deliveryFee != null ? ` · ₹${item.deliveryFee} delivery` : ""}
        </Text>
        <TouchableOpacity
          style={[styles.reorderBtn, { backgroundColor: accent.accent }]}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: "/restaurant-menu", params: { id: item._id, name: item.name, image: item.image || "", isMeat: isMeat ? "true" : "false" } })}
        >
          <Text style={[styles.reorderBtnText, { color: accent.on }]}>Reorder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);
  const user = useAuthStore((s) => s.user);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);

  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any[]>("/api/v1/users/favorites");
      if (Array.isArray(data)) setFavorites(data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchFavorites(); }, []));
  useEffect(() => { fetchFavorites(); }, [user?.favorites?.length]);

  const activeFavorites = useMemo(
    () => favorites.filter((item) => user?.favorites?.includes(item._id)),
    [favorites, user?.favorites]
  );

  // There's no item-level (dish) favoriting anywhere in the app yet — only
  // outlets can be favorited today (see authStore.toggleFavorite). The
  // "Items" tab is kept as a real, honest empty state rather than removed,
  // so the affordance is ready whenever dish favoriting ships.

  // Subscribed rather than read via getState(), so this fills in when the home
  // fetch lands instead of staying empty for anyone who opens Favorites first.
  const restaurants = useHomeStore((s) => s.restaurants);
  const popularNearby = useMemo(
    () => [...restaurants].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4),
    [restaurants]
  );

  return (
    <View style={styles.root}>
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 24) + 4 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}>
          <Ionicons name="chevron-back" size={moderateScale(22)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {loading && activeFavorites.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accent.accent} />
        </View>
      ) : (
        <FlatList
          data={activeFavorites}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <FavoriteCard item={item} tokens={tokens} styles={styles} onToggleFavorite={toggleFavorite} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchFavorites} tintColor={accent.accent} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.heartCircle}>
                <Ionicons name="heart" size={moderateScale(28)} color={accent.accent} />
              </View>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart on any outlet and it lands here — across food, meat, and everything else.
              </Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => router.replace("/(tabs)")}>
                <Text style={styles.exploreBtnText}>Explore outlets</Text>
              </TouchableOpacity>

              {popularNearby.length > 0 && (
                <View style={styles.popularSection}>
                  <Text style={styles.popularLabel}>Popular near you</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {popularNearby.map((r) => (
                      <TouchableOpacity
                        key={r._id}
                        style={styles.popularCard}
                        activeOpacity={0.85}
                        onPress={() => router.push({ pathname: "/restaurant-menu", params: { id: r._id, name: r.name, image: r.image || "" } })}
                      >
                        <Image source={{ uri: r.image }} style={styles.popularImage} />
                        <Text style={styles.popularName} numberOfLines={1}>{r.name}</Text>
                        <Text style={styles.popularMeta} numberOfLines={1}>
                          {[r.rating ? `${r.rating} ★` : "New", r.time].filter(Boolean).join(" · ")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AppTabBar active="account" accent="food" />
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ServiceTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
    backBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 160 },
    centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },

    card: { flexDirection: "row", gap: 14, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: moderateScale(18), padding: 14, marginBottom: 14 },
    cardThumb: { width: moderateScale(88), height: moderateScale(88), borderRadius: moderateScale(8), backgroundColor: tokens.sunken, overflow: "hidden", flexShrink: 0 },
    cardBody: { flex: 1, minWidth: 0 },
    cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    cardName: { flex: 1, fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), letterSpacing: -0.1, color: tokens.text },
    serviceTag: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 6 },
    serviceTagText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase" },
    cardMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 6 },
    reorderBtn: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 9 },
    reorderBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12) },

    emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
    heartCircle: { width: moderateScale(76), height: moderateScale(76), borderRadius: moderateScale(24), backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", marginBottom: 20 },
    emptyTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.2, color: tokens.text, textAlign: "center" },
    emptySubtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, textAlign: "center", marginTop: 10, marginBottom: 22 },
    exploreBtn: { width: "100%", alignItems: "center", backgroundColor: accent.accent, borderRadius: moderateScale(14), paddingVertical: 15 },
    exploreBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },

    popularSection: { width: "100%", marginTop: 34 },
    popularLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 12, textAlign: "left" },
    popularCard: { width: 150 },
    popularImage: { width: 150, height: 100, borderRadius: moderateScale(8), backgroundColor: tokens.sunken },
    popularName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text, marginTop: 8 },
    popularMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
  });
