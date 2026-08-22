import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import Constants from "expo-constants";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useCartStore } from "@/contexts/cartStore";
import { useAuthStore } from "@/contexts/authStore";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";
import { shareRestaurant } from "@/utils/shareLink";
import { addToCartWithConfirm } from "@/utils/addToCart";

interface FoodItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  images: string[];
  isAvailable?: boolean;
}

export default function RestaurantMenu() {
  const {
    id, name, image, rating, reviews, isMeat, highlightDishId,
    categories, minOrderValue, time, distance, address,
  } = useLocalSearchParams();

  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services[isMeat === "true" ? "meat" : "food"];
  const styles = useMemo(() => createStyles(tokens, accent), [theme, isMeat]);

  const { setVendorId } = useDeliveryStore();
  const { items, updateQuantity, getItemCount } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const isFavorite = useMemo(() => user?.favorites?.includes(id as string) || false, [user?.favorites, id]);

  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [scrolledPast, setScrolledPast] = useState(false);
  // Real measured height of the solid header, used to dock the category
  // tabs bar right against its bottom edge — the previous hardcoded
  // `insets.top + moderateScale(52)` guess didn't always match the header's
  // actual rendered height, leaving a visible gap (or overlap) between them.
  const [solidHeaderHeight, setSolidHeaderHeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState("");
  const [selectedDishDetail, setSelectedDishDetail] = useState<FoodItem | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const handleAddToCart = (item: FoodItem) => {
    if (loadingItems[item._id] || item.isAvailable === false) return;
    setLoadingItems((prev) => ({ ...prev, [item._id]: true }));
    setTimeout(() => {
      addToCartWithConfirm(item as any, id as string, name as string);
      setLoadingItems((prev) => ({ ...prev, [item._id]: false }));
    }, 450);
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (loadingItems[itemId]) return;
    setLoadingItems((prev) => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      updateQuantity(itemId, newQty);
      setLoadingItems((prev) => ({ ...prev, [itemId]: false }));
    }, 450);
  };

  const itemCount = getItemCount();

  const categoryPositions = useRef<Record<string, number>>({});
  const isProgrammaticScroll = useRef(false);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    setScrolledPast(y > 170);

    if (!isProgrammaticScroll.current) {
      const sortedCats = Object.keys(categoryPositions.current).sort(
        (a, b) => categoryPositions.current[a] - categoryPositions.current[b]
      );
      let matchedCat = activeCategory;
      for (const cat of sortedCats) {
        if (y >= categoryPositions.current[cat] - 120) matchedCat = cat;
      }
      if (matchedCat && matchedCat !== activeCategory) setActiveCategory(matchedCat);
    }
  };

  const handleCategoryPress = (category: string) => {
    setActiveCategory(category);
    isProgrammaticScroll.current = true;
    const posY = categoryPositions.current[category];
    const targetY = posY !== undefined ? Math.max(0, posY - 10) : 0;
    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 600);
  };

  useEffect(() => {
    if (id) setVendorId(id as string);
  }, [id]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
        const endpoint = isMeat === "true"
          ? `${baseUrl}/api/v1/meat/menu/${id}`
          : `${baseUrl}/api/v1/food/vendor/${id}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        const normalizedData = data.map((item: any) => {
          if (isMeat === "true") {
            return {
              ...item,
              isVeg: false,
              images: item.images || [item.image || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400"],
              description: item.description || `Fresh ${item.name} - ${item.weight}`,
            };
          }
          return item;
        });

        setMenu(normalizedData);
        if (normalizedData.length > 0) {
          let categoryToSelect = normalizedData[0].category;
          if (highlightDishId) {
            const targetItem = normalizedData.find((item: any) => item._id === highlightDishId);
            if (targetItem) {
              categoryToSelect = targetItem.category;
              setHighlightedItemId(highlightDishId as string);
              setTimeout(() => setHighlightedItemId(""), 2500);
              setTimeout(() => handleCategoryPress(categoryToSelect), 600);
            }
          }
          setActiveCategory(categoryToSelect);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id, isMeat]);

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      if (vegOnly && !item.isVeg) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [menu, searchQuery, vegOnly]);

  const groupedMenu = useMemo(() => {
    return filteredMenu.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, FoodItem[]>);
  }, [filteredMenu]);

  const categoryTabs = Object.keys(groupedMenu);

  useEffect(() => {
    if ((searchQuery || vegOnly) && categoryTabs.length > 0 && !categoryTabs.includes(activeCategory)) {
      setActiveCategory(categoryTabs[0]);
    }
  }, [searchQuery, vegOnly, categoryTabs]);

  const metaLine1Parts = [
    categories,
    minOrderValue ? (isMeat === "true" ? `from ₹${minOrderValue} / kg` : `₹${minOrderValue} for two`) : "",
  ].filter(Boolean);
  const metaLine2Parts = [time, distance, address].filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Overlay header — icons over the hero until scrolled, solid bar after */}
      {!scrolledPast ? (
        <View style={[styles.heroOverlay, { top: Math.max(insets.top, 24) + 10 }]}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={moderateScale(20)} color="#fff" />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => toggleFavorite(id as string)}>
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={moderateScale(18)} color={isFavorite ? accent.accent : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View
          style={[styles.solidHeader, { paddingTop: Math.max(insets.top, 24) }]}
          onLayout={(e) => setSolidHeaderHeight(e.nativeEvent.layout.height)}
        >
          <TouchableOpacity style={styles.solidHeaderBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
          </TouchableOpacity>
          <Text style={styles.solidHeaderTitle} numberOfLines={1}>{name}</Text>
          <TouchableOpacity style={styles.solidHeaderBtn} onPress={() => toggleFavorite(id as string)}>
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={moderateScale(18)} color={isFavorite ? accent.accent : tokens.text} />
          </TouchableOpacity>
        </View>
      )}

      {scrolledPast && categoryTabs.length > 0 && (
        <View style={[styles.fixedTabsBar, { top: solidHeaderHeight || Math.max(insets.top, 24) + moderateScale(52) }]}>
          <CategoryTabs categoryTabs={categoryTabs} activeCategory={activeCategory} onPress={handleCategoryPress} styles={styles} />
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Image source={{ uri: (image as string) || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600" }} style={styles.heroImage} />

        <View style={styles.sheet}>
          <TouchableOpacity
            style={styles.titleRow}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/restaurant-details",
                params: { id: id as string, name: name as string, image: image as string, rating: rating as string, reviews: reviews as string, isMeat: isMeat as string },
              })
            }
          >
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{name}</Text>
                <Ionicons name="chevron-forward" size={moderateScale(16)} color={tokens.sec} />
              </View>
              {metaLine1Parts.length > 0 && (
                <Text style={styles.metaLine} numberOfLines={1}>{metaLine1Parts.join(" · ")}</Text>
              )}
              {metaLine2Parts.length > 0 && (
                <Text style={styles.metaLine} numberOfLines={1}>{metaLine2Parts.join(" · ")}</Text>
              )}
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillValue}>{rating || "—"} ★</Text>
              {!!reviews && <Text style={styles.ratingPillCount}>{reviews}</Text>}
            </View>
          </TouchableOpacity>

          {isMeat !== "true" && (
            <View style={styles.vegRow}>
              <View style={styles.vegLeft}>
                <View style={styles.vegIconBox}><View style={styles.vegDot} /></View>
                <Text style={styles.vegLabel}>Veg only</Text>
              </View>
              <TouchableOpacity
                style={[styles.vegSwitch, vegOnly && { backgroundColor: tokens.veg }]}
                activeOpacity={0.8}
                onPress={() => setVegOnly((v) => !v)}
              >
                <View style={[styles.vegSwitchKnob, vegOnly && { alignSelf: "flex-end" }]} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchRow}>
            <Ionicons name="search" size={moderateScale(17)} color={accent.accent} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search dishes"
              placeholderTextColor={tokens.sec}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={moderateScale(15)} color={tokens.sec} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!scrolledPast && categoryTabs.length > 0 && (
          <View style={styles.inlineTabsBar}>
            <CategoryTabs categoryTabs={categoryTabs} activeCategory={activeCategory} onPress={handleCategoryPress} styles={styles} />
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={accent.accent} style={{ marginTop: 60 }} />
        ) : categoryTabs.length === 0 ? (
          <View style={styles.emptyMenu}>
            <Ionicons name="search-outline" size={48} color={tokens.muted} />
            <Text style={styles.emptyText}>
              {searchQuery || vegOnly ? "No dishes match" : "Menu not available yet"}
            </Text>
          </View>
        ) : (
          categoryTabs.map((category) => (
            <View
              key={category}
              style={styles.categorySection}
              onLayout={(e) => { categoryPositions.current[category] = e.nativeEvent.layout.y; }}
            >
              <View style={styles.categoryHeadRow}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <Text style={styles.categoryCount}>{groupedMenu[category].length} items</Text>
              </View>

              {groupedMenu[category].map((item, idx) => {
                const cartItem = items.find((i) => i._id === item._id);
                const soldOut = item.isAvailable === false;
                return (
                  <TouchableOpacity
                    key={item._id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedDishDetail(item)}
                    style={[
                      styles.menuRow,
                      idx < groupedMenu[category].length - 1 && styles.menuRowDivider,
                      highlightedItemId === item._id && styles.menuRowHighlighted,
                      soldOut && { opacity: 0.55 },
                    ]}
                  >
                    <View style={styles.rowInfo}>
                      <View style={[styles.dietIcon, { borderColor: item.isVeg ? tokens.veg : tokens.nonveg }]}>
                        {item.isVeg ? (
                          <View style={[styles.vegDotSmall, { backgroundColor: tokens.veg }]} />
                        ) : (
                          <View style={styles.nonvegTriangle} />
                        )}
                      </View>
                      <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.rowPrice}>₹{item.price}</Text>
                      {!!item.description && (
                        <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
                      )}
                    </View>

                    <View style={styles.rowImageCol}>
                      <Image
                        source={{ uri: item.images?.[0] || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400" }}
                        style={styles.rowImage}
                      />
                      {soldOut ? (
                        <View style={styles.soldOutBadge}><Text style={styles.soldOutText}>Sold out</Text></View>
                      ) : cartItem ? (
                        <View style={styles.qtyPill}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQuantity(item._id, cartItem.quantity - 1)} disabled={loadingItems[item._id]}>
                            <Feather name="minus" size={14} color={accent.accent} />
                          </TouchableOpacity>
                          {loadingItems[item._id] ? (
                            <ActivityIndicator size="small" color={accent.accent} />
                          ) : (
                            <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                          )}
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAddToCart(item)} disabled={loadingItems[item._id]}>
                            <Feather name="plus" size={14} color={accent.accent} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => handleAddToCart(item)} disabled={loadingItems[item._id]}>
                          {loadingItems[item._id] ? <ActivityIndicator size="small" color={accent.accent} /> : <Text style={styles.addBtnText}>Add</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Dish detail modal */}
      <Modal visible={!!selectedDishDetail} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelectedDishDetail(null)} />
          {selectedDishDetail && (
            <View style={styles.modalSheet}>
              <Image
                source={{ uri: selectedDishDetail.images?.[0] || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800" }}
                style={styles.modalImage}
              />
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedDishDetail(null)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { right: undefined, left: 16 }]}
                onPress={() => shareRestaurant(id as string, name as string, selectedDishDetail._id, selectedDishDetail.name)}
              >
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.modalHeadRow}>
                  <View style={[styles.dietIcon, { borderColor: selectedDishDetail.isVeg ? tokens.veg : tokens.nonveg }]}>
                    {selectedDishDetail.isVeg ? (
                      <View style={[styles.vegDotSmall, { backgroundColor: tokens.veg }]} />
                    ) : (
                      <View style={styles.nonvegTriangle} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedDishDetail.name}</Text>
                    <Text style={styles.modalPrice}>₹{selectedDishDetail.price}</Text>
                  </View>
                </View>
                <Text style={styles.modalDesc}>{selectedDishDetail.description}</Text>

                {selectedDishDetail.isAvailable === false ? (
                  <View style={styles.modalSoldOut}><Text style={styles.soldOutText}>Currently sold out</Text></View>
                ) : items.find((i) => i._id === selectedDishDetail._id) ? (
                  <View style={styles.modalQtyRow}>
                    <TouchableOpacity
                      style={styles.modalQtyBtn}
                      onPress={() => handleUpdateQuantity(selectedDishDetail._id, (items.find((i) => i._id === selectedDishDetail._id)?.quantity || 1) - 1)}
                    >
                      <Feather name="minus" size={16} color={accent.accent} />
                    </TouchableOpacity>
                    <Text style={styles.modalQtyText}>{items.find((i) => i._id === selectedDishDetail._id)?.quantity}</Text>
                    <TouchableOpacity style={styles.modalQtyBtn} onPress={() => handleAddToCart(selectedDishDetail)}>
                      <Feather name="plus" size={16} color={accent.accent} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.modalAddBtn} activeOpacity={0.85} onPress={() => handleAddToCart(selectedDishDetail)}>
                    <Text style={styles.modalAddBtnText}>Add to cart</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      <AppTabBar accent={isMeat === "true" ? "meat" : "food"} cartVendorName={name as string} />
    </View>
  );
}

function CategoryTabs({ categoryTabs, activeCategory, onPress, styles }: { categoryTabs: string[]; activeCategory: string; onPress: (c: string) => void; styles: any }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
      {categoryTabs.map((cat) => (
        <TouchableOpacity key={cat} onPress={() => onPress(cat)} style={styles.tabItem} activeOpacity={0.8}>
          <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>{cat}</Text>
          {activeCategory === cat && <View style={styles.tabActiveMark} />}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.bg },
    heroOverlay: {
      position: "absolute", left: 16, right: 16, zIndex: 20,
      flexDirection: "row", justifyContent: "space-between",
    },
    circleBtn: {
      width: moderateScale(38), height: moderateScale(38), borderRadius: moderateScale(19),
      backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center",
    },
    solidHeader: {
      position: "absolute", left: 0, right: 0, zIndex: 20,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 12, paddingBottom: 10,
      backgroundColor: tokens.surface, borderBottomWidth: 1, borderBottomColor: tokens.border,
    },
    solidHeaderBtn: {
      width: moderateScale(38), height: moderateScale(38), borderRadius: moderateScale(19),
      alignItems: "center", justifyContent: "center",
    },
    solidHeaderTitle: { flex: 1, textAlign: "center", fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(16), color: tokens.text },

    fixedTabsBar: { position: "absolute", left: 0, right: 0, zIndex: 19, backgroundColor: tokens.bg, borderBottomWidth: 1, borderBottomColor: tokens.border },
    inlineTabsBar: { backgroundColor: tokens.bg },

    heroImage: { width: "100%", height: moderateScale(190), backgroundColor: tokens.sunken },
    sheet: { backgroundColor: tokens.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 18, paddingHorizontal: 16 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    name: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.3, color: tokens.text },
    metaLine: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 5 },
    ratingPill: { backgroundColor: tokens.success, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignItems: "center" },
    ratingPillValue: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: "#fff" },
    ratingPillCount: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(10), color: "#fff", opacity: 0.9, marginTop: 1 },

    vegRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
    vegLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
    vegIconBox: { width: 16, height: 16, borderWidth: 1.5, borderColor: tokens.veg, borderRadius: 3, alignItems: "center", justifyContent: "center" },
    vegDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.veg },
    vegLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    vegSwitch: { width: moderateScale(52), height: moderateScale(30), borderRadius: 999, backgroundColor: tokens.border, padding: 3 },
    vegSwitchKnob: { width: moderateScale(24), height: moderateScale(24), borderRadius: 999, backgroundColor: tokens.surface },

    searchRow: {
      flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16,
      backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.borderStrong,
      borderRadius: 14, height: moderateScale(48), paddingHorizontal: 14,
    },
    searchInput: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },

    tabsScrollContent: { paddingHorizontal: 16, gap: 20, alignItems: "center" },
    tabItem: { paddingVertical: 12, alignItems: "center" },
    tabText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec },
    tabTextActive: { fontFamily: fontFamilies.body.bold, color: tokens.text },
    tabActiveMark: { marginTop: 6, width: 18, height: 2.5, borderRadius: 999, backgroundColor: accent.accent },

    emptyMenu: { marginTop: 80, alignItems: "center", gap: 10 },
    emptyText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.sec },

    categorySection: { paddingHorizontal: 16, paddingTop: 22 },
    categoryHeadRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 14 },
    categoryTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), letterSpacing: -0.1, color: tokens.text },
    categoryCount: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },

    menuRow: { flexDirection: "row", gap: 14, paddingBottom: 16 },
    menuRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.border, marginBottom: 16 },
    menuRowHighlighted: { backgroundColor: accent.skin, borderRadius: 12, padding: 8, marginHorizontal: -8 },
    rowInfo: { flex: 1, minWidth: 0 },
    dietIcon: { width: 16, height: 16, borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    vegDotSmall: { width: 7, height: 7, borderRadius: 4 },
    nonvegTriangle: { width: 0, height: 0, borderLeftWidth: 3.5, borderRightWidth: 3.5, borderBottomWidth: 6, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: tokens.nonveg },
    rowName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), letterSpacing: -0.1, lineHeight: moderateScale(22), color: tokens.text },
    rowPrice: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 4 },
    rowDesc: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 6 },
    rowImageCol: { width: moderateScale(98), flexShrink: 0, alignItems: "center", gap: 8 },
    rowImage: { width: moderateScale(98), height: moderateScale(88), borderRadius: 8, backgroundColor: tokens.sunken },
    addBtn: {
      width: moderateScale(98), minHeight: moderateScale(34), borderRadius: 12,
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: accent.accent,
      alignItems: "center", justifyContent: "center",
    },
    addBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: accent.accent },
    qtyPill: {
      width: moderateScale(98), minHeight: moderateScale(34), borderRadius: 12,
      backgroundColor: accent.skin, borderWidth: 1, borderColor: accent.accent,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8,
    },
    qtyBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
    qtyText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: accent.accent },
    soldOutBadge: { backgroundColor: tokens.sunken, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
    soldOutText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), color: tokens.sec, textTransform: "uppercase", letterSpacing: 0.4 },

    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: tokens.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
    modalImage: { width: "100%", height: 240, backgroundColor: tokens.sunken },
    modalCloseBtn: {
      position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 18,
      backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
    },
    modalContent: { padding: 20, paddingBottom: 28 },
    modalHeadRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    modalTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(21), letterSpacing: -0.2, color: tokens.text },
    modalPrice: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.sec, marginTop: 4 },
    modalDesc: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, marginTop: 12 },
    modalSoldOut: { marginTop: 18, alignSelf: "flex-start", backgroundColor: tokens.sunken, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
    modalAddBtn: { marginTop: 18, backgroundColor: accent.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
    modalAddBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    modalQtyRow: {
      marginTop: 18, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 16,
      backgroundColor: accent.skin, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
    },
    modalQtyBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
    modalQtyText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(16), color: accent.accent },
  });
