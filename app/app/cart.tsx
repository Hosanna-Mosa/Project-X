import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useCartStore } from "@/contexts/cartStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const { vendorName: paramVendorName } = useLocalSearchParams();
  const { items, getTotalPrice, vendorId, updateQuantity, addItem } = useCartStore();
  // Tracks which menu endpoint actually resolved this vendor's items, so
  // "Add more items" can route back to the right menu screen with the
  // correct isMeat flag instead of relying on browser-style back navigation.
  const [isMeatVendor, setIsMeatVendor] = useState(false);

  // The cart doesn't currently track which service (food vs meat) its
  // vendor belongs to, so this always renders in the food accent.
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [fetchedVendorName, setFetchedVendorName] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    // Only food vendors expose a public by-id lookup today — meat centers
    // don't, so their delivery fee genuinely can't be sourced here yet.
    customFetch<any>(`/api/v1/vendors/${vendorId}`)
      .then((v) => {
        if (v?.name) setFetchedVendorName(v.name);
        if (typeof v?.deliveryFee === "number") setDeliveryFee(v.deliveryFee);
      })
      .catch(() => {});
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;
    customFetch<any[]>(`/api/v1/food/vendor/${vendorId}`)
      .then((data) => {
        if (data?.length) {
          setMenuItems(data);
          setIsMeatVendor(false);
        } else fetchMeatMenu();
      })
      .catch(fetchMeatMenu);

    function fetchMeatMenu() {
      customFetch<any[]>(`/api/v1/meat/menu/${vendorId}`)
        .then((meatData) => {
          if (Array.isArray(meatData)) {
            setIsMeatVendor(true);
            setMenuItems(
              meatData.map((item: any) => ({
                ...item,
                isVeg: false,
                images: item.images || [item.image || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400"],
                description: item.description || `Fresh ${item.name} - ${item.weight}`,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [vendorId]);

  // Empty-cart "order again" — real order history, best-effort vendor name.
  useEffect(() => {
    if (items.length > 0) return;
    setLoadingRecent(true);
    customFetch<any[]>("/api/v1/orders")
      .then((orders) => {
        const withVendor = (orders || []).filter((o) => o.vendor);
        const seen = new Set<string>();
        const deduped = withVendor.filter((o) => {
          const vId = typeof o.vendor === "object" ? o.vendor._id : o.vendor;
          if (seen.has(vId)) return false;
          seen.add(vId);
          return true;
        });
        setRecentOrders(deduped.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  }, [items.length]);

  const complements = useMemo(
    () => menuItems.filter((m) => !items.some((c) => c._id === m._id)),
    [menuItems, items]
  );

  const displayVendorName = paramVendorName ? String(paramVendorName) : fetchedVendorName || "your vendor";
  const subtotal = getTotalPrice();

  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === "PERCENTAGE") {
      discount = (subtotal * appliedPromo.discountValue) / 100;
      if (appliedPromo.maxDiscount) discount = Math.min(discount, appliedPromo.maxDiscount);
    } else {
      discount = appliedPromo.discountValue;
    }
  }
  const total = Math.max(0, Math.round((subtotal + (deliveryFee || 0) - discount) * 100) / 100);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      const response = await customFetch<any>("/api/v1/orders/validate-coupon", {
        method: "POST",
        body: JSON.stringify({ code: promoCode.trim(), cartTotal: subtotal }),
      });
      if (response?.code) {
        setAppliedPromo(response);
        setShowPromoInput(false);
      }
    } catch (error: any) {
      setPromoError((error?.message || "Invalid promo code").replace(/^HTTP \d+.*?: /, "").trim());
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const goToCheckout = () => {
    router.push({
      pathname: "/checkout",
      params: {
        subtotal: String(subtotal),
        deliveryFee: deliveryFee != null ? String(deliveryFee) : "",
        discount: String(discount),
        couponCode: appliedPromo?.code || "",
        total: String(total),
        vendorName: displayVendorName,
      },
    });
  };

  if (items.length === 0) {
    const lastOrder = recentOrders[0];
    const lastVendorName = lastOrder && typeof lastOrder.vendor === "object" ? lastOrder.vendor.name : null;
    const daysAgo = lastOrder ? Math.max(0, Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / 86400000)) : null;

    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitleSolo}>Cart</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}>
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="bag-outline" size={moderateScale(30)} color={accent.accent} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              {lastVendorName
                ? `Nothing here yet. Your last order was ${lastVendorName}, ${daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}.`
                : "Nothing here yet — find something to add from a restaurant or meat center."}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => router.replace("/(tabs)")}>
              <Text style={styles.primaryBtnText}>Browse restaurants</Text>
            </TouchableOpacity>
            {lastVendorName && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/restaurant-menu",
                    params: { id: typeof lastOrder.vendor === "object" ? lastOrder.vendor._id : lastOrder.vendor, name: lastVendorName },
                  })
                }
              >
                <Text style={styles.secondaryBtnText}>Order from {lastVendorName} again</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentOrders.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentLabel}>Order again</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {recentOrders.map((o) => {
                  const vName = typeof o.vendor === "object" ? o.vendor.name : "Vendor";
                  const vId = typeof o.vendor === "object" ? o.vendor._id : o.vendor;
                  return (
                    <TouchableOpacity
                      key={o._id}
                      style={styles.recentCard}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: "/restaurant-menu", params: { id: vId, name: vName } })}
                    >
                      <View style={styles.recentImagePlaceholder} />
                      <Text style={styles.recentName} numberOfLines={1}>{vName}</Text>
                      <Text style={styles.recentMeta}>₹{Math.round(o.totalPrice || 0)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {loadingRecent && <ActivityIndicator style={{ marginTop: 20 }} color={accent.accent} />}
        </ScrollView>

        {/* No `active` tab — this is a pushed screen, not one of the 3 real
            tabs. Marking "home" active here made the Home tab a no-op
            (already "active") until the user backed out via the cart icon. */}
        <AppTabBar accent="food" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <View style={{ minWidth: 0 }}>
          <Text style={styles.headerEyebrow}>Your cart from</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayVendorName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 160 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.itemsCard}>
            {items.map((item, idx) => (
              <View key={item._id} style={[styles.itemRow, idx < items.length - 1 && styles.itemRowDivider]}>
                <View style={styles.itemThumbWrap}>
                  {item.images?.[0] ? (
                    <Image source={{ uri: item.images[0] }} style={styles.itemThumb} />
                  ) : (
                    <View style={[styles.itemThumb, styles.itemThumbFallback]}>
                      <Ionicons name="restaurant-outline" size={moderateScale(16)} color={tokens.muted} />
                    </View>
                  )}
                  <View style={[styles.dietIcon, { borderColor: item.isVeg ? tokens.veg : tokens.nonveg }]}>
                    {item.isVeg ? (
                      <View style={[styles.vegDot, { backgroundColor: tokens.veg }]} />
                    ) : (
                      <View style={styles.nonvegTriangle} />
                    )}
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  {!!item.category && <Text style={styles.itemMeta} numberOfLines={1}>{item.category}</Text>}
                </View>
                <View style={styles.qtyPill}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item._id, item.quantity - 1)}>
                    <Feather name="minus" size={14} color={accent.accent} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item._id, item.quantity + 1)}>
                    <Feather name="plus" size={14} color={accent.accent} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemLinePrice}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addMoreRow}
              onPress={() =>
                vendorId
                  ? router.push({
                      pathname: "/restaurant-menu",
                      params: { id: vendorId, name: displayVendorName, isMeat: isMeatVendor ? "true" : "false" },
                    })
                  : router.back()
              }
            >
              <Text style={styles.addMoreText}>+ Add more items</Text>
            </TouchableOpacity>
          </View>
        </View>

        {complements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Complement your cart</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {complements.slice(0, 8).map((comp) => (
                <View key={comp._id} style={styles.complementCard}>
                  <Image source={{ uri: comp.images?.[0] }} style={styles.complementImage} />
                  <Text style={styles.complementName} numberOfLines={1}>{comp.name}</Text>
                  <View style={styles.complementFooter}>
                    <Text style={styles.complementPrice}>₹{comp.price}</Text>
                    <TouchableOpacity style={styles.complementAddBtn} onPress={() => addItem(comp, vendorId!)}>
                      <Ionicons name="add" size={16} color={accent.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.couponRow}
            activeOpacity={0.85}
            onPress={() => (appliedPromo ? setAppliedPromo(null) : setShowPromoInput((s) => !s))}
          >
            <View style={styles.couponIconCircle}>
              <Ionicons name="pricetag" size={moderateScale(15)} color={accent.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.couponTitle}>{appliedPromo ? `${appliedPromo.code} applied` : "Have a promo code?"}</Text>
              <Text style={styles.couponSub}>
                {appliedPromo ? `You saved ₹${Math.round(discount)}` : "Tap to add it at checkout"}
              </Text>
            </View>
            <Text style={styles.couponAction}>{appliedPromo ? "Remove" : "Apply"}</Text>
          </TouchableOpacity>

          {showPromoInput && !appliedPromo && (
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter code"
                placeholderTextColor={tokens.muted}
                autoCapitalize="characters"
                value={promoCode}
                onChangeText={setPromoCode}
              />
              <TouchableOpacity style={styles.promoApplyBtn} onPress={handleApplyPromo} disabled={isApplyingPromo}>
                {isApplyingPromo ? <ActivityIndicator size="small" color={accent.on} /> : <Text style={styles.promoApplyBtnText}>Apply</Text>}
              </TouchableOpacity>
            </View>
          )}
          {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bill summary</Text>
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item total</Text>
              <Text style={styles.billValue}>₹{subtotal}</Text>
            </View>
            {deliveryFee != null ? (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery fee</Text>
                <Text style={styles.billValue}>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</Text>
              </View>
            ) : (
              <Text style={styles.billNote}>Delivery fee is confirmed at checkout.</Text>
            )}
            {appliedPromo && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: tokens.success }]}>Coupon {appliedPromo.code}</Text>
                <Text style={[styles.billValue, { color: tokens.success }]}>−₹{Math.round(discount)}</Text>
              </View>
            )}
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotalLabel}>To pay</Text>
              <Text style={styles.billTotalValue}>₹{total}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.9} onPress={goToCheckout}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Text style={styles.continueBtnPrice}>· ₹{total}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), letterSpacing: -0.1, color: tokens.text, marginTop: 2 },
    headerTitleSolo: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 12 },

    itemsCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, paddingHorizontal: 14 },
    itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
    itemRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.border },
    itemThumbWrap: { flexShrink: 0 },
    itemThumb: { width: moderateScale(46), height: moderateScale(46), borderRadius: 10, backgroundColor: tokens.sunken },
    itemThumbFallback: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: tokens.border },
    dietIcon: {
      position: "absolute", bottom: -4, left: -4, width: 16, height: 16, borderWidth: 1.5, borderRadius: 3,
      backgroundColor: tokens.surface, alignItems: "center", justifyContent: "center",
    },
    vegDot: { width: 7, height: 7, borderRadius: 4 },
    nonvegTriangle: { width: 0, height: 0, borderLeftWidth: 3.5, borderRightWidth: 3.5, borderBottomWidth: 6, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: tokens.nonveg },
    itemName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    itemMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    qtyPill: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: moderateScale(92),
      backgroundColor: accent.skin, borderWidth: 1, borderColor: accent.accent, borderRadius: 10, minHeight: moderateScale(34), flexShrink: 0,
    },
    qtyBtn: { width: 30, height: 34, alignItems: "center", justifyContent: "center" },
    qtyText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.accent },
    itemLinePrice: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text, width: 56, textAlign: "right", flexShrink: 0 },
    addMoreRow: { paddingVertical: 13 },
    addMoreText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: accent.accent },

    complementCard: { width: 132, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 10 },
    complementImage: { width: "100%", height: 72, borderRadius: 8, backgroundColor: tokens.sunken, marginBottom: 9 },
    complementName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    complementFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
    complementPrice: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    complementAddBtn: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: accent.accent, alignItems: "center", justifyContent: "center" },

    couponRow: {
      flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.surface,
      borderWidth: 1, borderColor: accent.accent, borderStyle: "dashed", borderRadius: 16, padding: 14, minHeight: 56,
    },
    couponIconCircle: { width: 34, height: 34, borderRadius: 11, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    couponTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    couponSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    couponAction: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(12), letterSpacing: 0.5, textTransform: "uppercase", color: accent.accent, flexShrink: 0 },
    promoInputRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    promoInput: {
      flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 12,
      paddingHorizontal: 14, height: moderateScale(44), fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text,
    },
    promoApplyBtn: { backgroundColor: accent.accent, borderRadius: 12, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
    promoApplyBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13), color: accent.on },
    promoError: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.error, marginTop: 8 },

    billCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 16, gap: 11 },
    billRow: { flexDirection: "row", justifyContent: "space-between" },
    billLabel: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.sec },
    billValue: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    billNote: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.muted },
    billDivider: { borderTopWidth: 1, borderTopColor: tokens.borderStrong, borderStyle: "dashed", marginTop: 3, paddingTop: 1 },
    billTotalLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    billTotalValue: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.3, color: tokens.text },

    footer: {
      position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: tokens.surface,
      borderTopWidth: 1, borderTopColor: tokens.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 14,
    },
    continueBtn: {
      backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52),
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    continueBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    continueBtnPrice: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on, opacity: 0.85 },

    emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
    emptyIconCircle: { width: 76, height: 76, borderRadius: 24, backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", marginBottom: 20 },
    emptyTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.2, color: tokens.text, textAlign: "center" },
    emptySubtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, textAlign: "center", marginTop: 10, marginBottom: 22 },
    primaryBtn: { width: "100%", backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    primaryBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
    secondaryBtn: { width: "100%", marginTop: 10, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    secondaryBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: accent.accent },

    recentSection: { paddingHorizontal: 16, paddingTop: 36 },
    recentLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 12 },
    recentCard: { width: 150 },
    recentImagePlaceholder: { width: 150, height: 100, borderRadius: 8, backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border },
    recentName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text, marginTop: 8 },
    recentMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
  });
