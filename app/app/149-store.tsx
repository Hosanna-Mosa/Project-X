import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { customFetch } from "@/utils/api/custom-fetch";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useCartStore } from "@/contexts/cartStore";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";

// Standard Indian food-labeling convention: a circle for veg, a triangle
// for non-veg, both inside a small squared-off border — not just two dot
// shapes with a color swap.
function DietMarker({ isVeg, color, style }: { isVeg: boolean; color: string; style?: any }) {
  return (
    <View style={[{ width: moderateScale(14), height: moderateScale(14), borderWidth: 1.5, borderColor: color, borderRadius: 3, alignItems: "center", justifyContent: "center" }, style]}>
      {isVeg ? (
        <View style={{ width: moderateScale(6), height: moderateScale(6), borderRadius: 999, backgroundColor: color }} />
      ) : (
        <View
          style={{
            width: 0, height: 0,
            borderLeftWidth: moderateScale(3.5), borderRightWidth: moderateScale(3.5), borderBottomWidth: moderateScale(6),
            borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: color,
          }}
        />
      )}
    </View>
  );
}

function buildFoodItem(item: any) {
  return {
    _id: item._id,
    name: item.name,
    description: item.description || "",
    price: item.price,
    category: item.category || "149 Store",
    isVeg: item.isVeg,
    images: item.images && item.images.length > 0 ? item.images : ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"],
  };
}

export default function Store149Screen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
  const { currentCoords } = useDeliveryStore();
  const { items: cartItems, addItem: addCartItem, updateQuantity: updateCartQuantity } = useCartStore();
  const [store149Items, setStore149Items] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (currentCoords?.lat && currentCoords?.lng) {
          const data = await customFetch<any>(`/api/v1/food/store-149?lat=${currentCoords.lat}&lng=${currentCoords.lng}`);
          if (Array.isArray(data)) setStore149Items(data);
        }
      } catch (error) {
        console.error("Error fetching 149 store items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [currentCoords]);

  const outletCount = useMemo(() => new Set(store149Items.map((i) => i.vendorId)).size, [store149Items]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    store149Items.forEach((i) => { if (i.category) set.add(i.category); });
    return ["All", ...Array.from(set).slice(0, 6)];
  }, [store149Items]);
  const visibleItems = activeCategory === "All" ? store149Items : store149Items.filter((i) => i.category === activeCategory);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}>
        {/* Full-bleed accent header — the one screen that floods the accent
            color, so the ₹149 promo gets its own identity before the
            neutral system resumes below. */}
        <View style={[styles.heroHeader, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}>
            <Ionicons name="chevron-back" size={moderateScale(20)} color={accent.on} />
          </TouchableOpacity>
          <Text style={styles.heroEyebrow}>Craving? Any dish</Text>
          <Text style={styles.heroHeadline}>Everything{"\n"}at ₹149</Text>
          <Text style={styles.heroSubtext}>
            {store149Items.length} dishes{outletCount > 0 ? ` · ${outletCount} outlets` : ""}
          </Text>
        </View>

        <View style={styles.sheet}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryChipText, activeCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <ActivityIndicator size="large" color={accent.accent} />
            </View>
          ) : (
            <View style={styles.grid}>
              {visibleItems.map((item) => {
                const cartItem = cartItems.find((i) => i._id === item._id);
                const handleAdd = () => addCartItem(buildFoodItem(item), item.vendorId);

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => { setSelectedItem(item); setIsSheetVisible(true); }}
                  >
                    <View style={styles.cardImageWrap}>
                      <Image
                        source={{ uri: item.images && item.images.length > 0 ? item.images[0] : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }}
                        style={styles.cardImage}
                      />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardMetaRow}>
                        <DietMarker isVeg={!!item.isVeg} color={item.isVeg ? tokens.veg : tokens.nonveg} />
                        <Text style={styles.cardRating}>{item.rating || "4.2"} ★</Text>
                      </View>
                      <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cardBrand} numberOfLines={1}>{item.brand || "Restaurant"}</Text>
                      <View style={styles.cardPriceRow}>
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                          <Text style={styles.cardPrice}>₹{item.price}</Text>
                          {!!item.originalPrice && <Text style={styles.cardOriginalPrice}>₹{item.originalPrice}</Text>}
                        </View>
                        {cartItem ? (
                          <View style={styles.qtyPill}>
                            <TouchableOpacity onPress={() => updateCartQuantity(item._id, cartItem.quantity - 1)} style={styles.qtyBtn}>
                              <Feather name="minus" size={moderateScale(12)} color={accent.accent} />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                            <TouchableOpacity onPress={handleAdd} style={styles.qtyBtn}>
                              <Feather name="plus" size={moderateScale(12)} color={accent.accent} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                            <Feather name="plus" size={moderateScale(16)} color={accent.on} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <AppTabBar accent="food" />

      {/* Item detail sheet */}
      <Modal visible={isSheetVisible} transparent animationType="slide" onRequestClose={() => setIsSheetVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsSheetVisible(false)} />
          <View style={[styles.sheetModal, { paddingBottom: insets.bottom + 32 }]}>
            <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setIsSheetVisible(false)}>
              <Ionicons name="close" size={moderateScale(20)} color={tokens.bg} />
            </TouchableOpacity>

            {selectedItem && (
              <View>
                <Image
                  source={{ uri: selectedItem.images && selectedItem.images.length > 0 ? selectedItem.images[0] : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }}
                  style={styles.sheetImage}
                  resizeMode="cover"
                />
                <View style={styles.sheetInfo}>
                  <View style={styles.sheetRow}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <DietMarker isVeg={!!selectedItem.isVeg} color={selectedItem.isVeg ? tokens.veg : tokens.nonveg} style={{ marginRight: 8 }} />
                      <Text style={styles.sheetVegLabel}>{selectedItem.isVeg ? "Veg" : "Non-veg"}</Text>
                    </View>
                    {(() => {
                      const cartItem = cartItems.find((i) => i._id === selectedItem._id);
                      return cartItem ? (
                        <View style={styles.sheetQtyPill}>
                          <TouchableOpacity onPress={() => updateCartQuantity(selectedItem._id, cartItem.quantity - 1)} style={styles.qtyBtn}>
                            <Feather name="minus" size={moderateScale(15)} color={accent.accent} />
                          </TouchableOpacity>
                          <Text style={styles.sheetQtyText}>{cartItem.quantity}</Text>
                          <TouchableOpacity onPress={() => addCartItem(buildFoodItem(selectedItem), selectedItem.vendorId)} style={styles.qtyBtn}>
                            <Feather name="plus" size={moderateScale(15)} color={accent.accent} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.sheetAddBtn} onPress={() => addCartItem(buildFoodItem(selectedItem), selectedItem.vendorId)}>
                          <Text style={styles.sheetAddBtnText}>Add</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>

                  <Text style={styles.sheetTitle}>{selectedItem.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                    <Text style={styles.sheetPrice}>₹{selectedItem.price}</Text>
                    {!!selectedItem.originalPrice && <Text style={styles.cardOriginalPrice}>₹{selectedItem.originalPrice}</Text>}
                  </View>
                  <Text style={styles.sheetRating}>{selectedItem.rating || "4.2"} ★ ({selectedItem.ratingCount || "34"} ratings)</Text>
                  <Text style={styles.sheetDescription}>
                    {selectedItem.description || "Fresh and delicious, prepared by our top partners."}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ServiceTokens) => StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg },

  heroHeader: { backgroundColor: accent.accent, paddingHorizontal: 16, paddingBottom: 22 },
  backBtn: {
    width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  heroEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1.4, textTransform: "uppercase", color: accent.on, opacity: 0.8 },
  heroHeadline: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(40), lineHeight: moderateScale(40), letterSpacing: -1.4, color: accent.on, marginTop: 10 },
  heroSubtext: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: accent.on, opacity: 0.85, marginTop: 12 },

  sheet: { backgroundColor: tokens.bg, borderRadius: 24, marginTop: -14, paddingTop: 16, paddingHorizontal: 16 },
  categoryScrollContent: { gap: 8, paddingBottom: 16 },
  categoryChip: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  categoryChipActive: { backgroundColor: accent.accent, borderColor: accent.accent },
  categoryChipText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },
  categoryChipTextActive: { color: accent.on, fontFamily: fontFamilies.body.semibold },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47.5%", backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: moderateScale(18), overflow: "hidden" },
  cardImageWrap: { height: 104, backgroundColor: tokens.sunken },
  cardImage: { width: "100%", height: "100%" },
  cardBody: { padding: 12 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardRating: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec },
  cardName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text, marginTop: 5 },
  cardBrand: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 3 },
  cardPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  cardPrice: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: tokens.text },
  cardOriginalPrice: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, textDecorationLine: "line-through" },
  addBtn: { width: moderateScale(32), height: moderateScale(32), borderRadius: moderateScale(10), backgroundColor: accent.accent, alignItems: "center", justifyContent: "center" },
  qtyPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: tokens.sunken, borderRadius: moderateScale(10), paddingHorizontal: 6, paddingVertical: 4 },
  qtyBtn: { padding: 3 },
  qtyText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), color: tokens.text },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheetModal: { backgroundColor: tokens.surface, borderTopLeftRadius: moderateScale(24), borderTopRightRadius: moderateScale(24), paddingBottom: 32 },
  sheetCloseBtn: {
    position: "absolute", top: -22, alignSelf: "center", width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(22),
    backgroundColor: tokens.text, alignItems: "center", justifyContent: "center", zIndex: 10,
  },
  sheetImage: { width: "100%", height: moderateScale(220), borderTopLeftRadius: moderateScale(24), borderTopRightRadius: moderateScale(24) },
  sheetInfo: { padding: 20 },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetVegLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.sec },
  sheetAddBtn: { backgroundColor: accent.accent, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10 },
  sheetAddBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.on },
  sheetQtyPill: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: accent.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  sheetQtyText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.accent },
  sheetTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(20), color: tokens.text, marginBottom: 6 },
  sheetPrice: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(18), color: tokens.text },
  sheetRating: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 8 },
  sheetDescription: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, marginTop: 10 },
});
