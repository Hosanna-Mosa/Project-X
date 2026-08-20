import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useCartStore } from "@/contexts/cartStore";

type TabKey = "home" | "orders" | "account";

interface AppTabBarProps {
  /** Omit on pushed screens that aren't one of the 3 tabs (e.g. All Services) — no tab highlights, but the bar still navigates. */
  active?: TabKey;
  /** Which service accent to tint the active tab / cart row with. Defaults to food. */
  accent?: keyof ThemeTokens["services"];
  /** Vendor name shown in the cart row, e.g. "Bawarchi". Falls back to a generic label. */
  cartVendorName?: string;
}

/**
 * The bar is absolutely positioned, so screens have to reserve space for it
 * themselves. Both rows are given fixed heights here so `useAppTabBarHeight()`
 * below can report the exact reserved space instead of screens guessing at a
 * padding that breaks the moment the cart row appears.
 */
const CART_ROW_HEIGHT = moderateScale(62);
const TAB_ROW_HEIGHT = moderateScale(64);

/**
 * Height the tab bar currently occupies, including the safe-area inset and the
 * cart summary row when the cart is non-empty. Use it as the bottom padding of
 * a screen's scroll content so the last element never sits under the bar.
 */
export function useAppTabBarHeight() {
  const insets = useSafeAreaInsets();
  const itemCount = useCartStore((s) => s.getItemCount());
  return insets.bottom + TAB_ROW_HEIGHT + (itemCount > 0 ? CART_ROW_HEIGHT + 1 : 0);
}

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; route: string }[] = [
  { key: "home", label: "Home", icon: "home-outline", activeIcon: "home", route: "/(tabs)" },
  { key: "orders", label: "Orders", icon: "receipt-outline", activeIcon: "receipt", route: "/(tabs)/orders" },
  { key: "account", label: "Account", icon: "person-outline", activeIcon: "person", route: "/(tabs)/profile" },
];

/**
 * Fixed bottom bar shared across the main tabs (Home / Orders / Account),
 * matching the design spec's bottom-of-screen pattern: an optional cart
 * summary row above a Home/Orders/Cart/Account row. There's a "Cart" entry
 * in that row too, but it's a launcher to /cart rather than a tab — it has
 * no active state of its own.
 */
export function AppTabBar({ active, accent = "food", cartVendorName }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accentTokens = tokens.services[accent];
  const styles = React.useMemo(() => createStyles(tokens, accentTokens), [theme, accent]);

  const itemCount = useCartStore((s) => s.getItemCount());
  const totalPrice = useCartStore((s) => s.getTotalPrice());

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartRow} activeOpacity={0.85} onPress={() => router.push("/cart")}>
          <View style={styles.cartCountBadge}>
            <Text style={styles.cartCountText}>{itemCount}</Text>
          </View>
          <View style={styles.cartInfo}>
            <Text style={styles.cartPrice}>₹{totalPrice}</Text>
            <Text style={styles.cartMeta} numberOfLines={1}>
              {cartVendorName ? `${cartVendorName} · ` : ""}
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Text>
          </View>
          <Text style={styles.cartCta}>View cart</Text>
        </TouchableOpacity>
      )}

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => {
                if (!isActive) router.push(tab.route as any);
              }}
            >
              {isActive && <View style={styles.tabActiveMark} />}
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={moderateScale(20)}
                color={isActive ? accentTokens.accent : tokens.muted}
              />
              <Text style={[styles.tabLabel, isActive && { color: accentTokens.accent, fontFamily: fontFamilies.body.semibold }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => router.push("/cart")}>
          <View style={styles.cartIconWrap}>
            <Ionicons name="bag-outline" size={moderateScale(20)} color={tokens.muted} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tabLabel}>Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ServiceTokens) => StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: CART_ROW_HEIGHT,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  cartCountBadge: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(11),
    backgroundColor: accent.skin,
    alignItems: "center",
    justifyContent: "center",
  },
  cartCountText: {
    fontFamily: fontFamilies.body.bold,
    fontSize: moderateScale(14),
    color: accent.accent,
  },
  cartInfo: {
    flex: 1,
    minWidth: 0,
  },
  cartPrice: {
    fontFamily: fontFamilies.body.semibold,
    fontSize: moderateScale(15),
    color: tokens.text,
  },
  cartMeta: {
    fontFamily: fontFamilies.body.medium,
    fontSize: moderateScale(13),
    color: tokens.sec,
    marginTop: 1,
  },
  cartCta: {
    fontFamily: fontFamilies.body.bold,
    fontSize: moderateScale(13),
    color: accent.on,
    backgroundColor: accent.accent,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: moderateScale(12),
    overflow: "hidden",
  },
  tabRow: {
    flexDirection: "row",
    height: TAB_ROW_HEIGHT,
    paddingHorizontal: 6,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    minHeight: moderateScale(52),
    position: "relative",
  },
  tabActiveMark: {
    position: "absolute",
    top: -8,
    width: 26,
    height: 3,
    borderRadius: 999,
    backgroundColor: accent.accent,
  },
  tabLabel: {
    fontFamily: fontFamilies.body.medium,
    fontSize: moderateScale(11),
    color: tokens.muted,
  },
  cartIconWrap: {
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: moderateScale(17),
    height: moderateScale(17),
    borderRadius: moderateScale(9),
    backgroundColor: accent.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontFamily: fontFamilies.body.bold,
    fontSize: moderateScale(10),
    color: accent.on,
  },
});
