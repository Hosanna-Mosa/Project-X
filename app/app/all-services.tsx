import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";

type RideTier = {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
};

// Cab tiers stay commented out until pricing/dispatch actually supports
// them end to end — carried over from the previous version of this screen,
// not a new decision made during the redesign.
const RIDE_TIERS: RideTier[] = [
  { id: "bike", name: "Bike", icon: "motorbike", description: "1 seat · fastest" },
  { id: "auto", name: "Auto", icon: "rickshaw", description: "3 seats · metered" },
  // { id: "cab-economy", name: "Cab Economy", icon: "car", description: "4 seats · AC" },
  // { id: "cab-prime", name: "Cab Prime", icon: "car-side", description: "4 seats · extra boot" },
];

export default function AllServicesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.ride;
  const styles = React.useMemo(() => createStyles(tokens, accent), [theme]);
  const setServiceType = useDeliveryStore((state) => state.setServiceType);

  const selectTier = (tier: RideTier) => {
    setServiceType(tier.id);
    router.push({ pathname: "/drop-location", params: { serviceId: tier.id, name: tier.name } });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 24) + 4 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={moderateScale(22)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All services</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Going somewhere?</Text>
        <Text style={styles.subhead}>Pick a ride to see live fares for your trip.</Text>

        <View style={styles.tierGrid}>
          {RIDE_TIERS.map((tier) => (
            <TouchableOpacity key={tier.id} style={styles.tierCard} activeOpacity={0.85} onPress={() => selectTier(tier)}>
              <View style={styles.tierIconCircle}>
                <MaterialCommunityIcons name={tier.icon} size={moderateScale(24)} color={accent.accent} />
              </View>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierDescription}>{tier.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Also on Flavour</Text>
        <View style={styles.crossPromoList}>
          <TouchableOpacity style={styles.crossPromoRow} activeOpacity={0.85} onPress={() => router.push("/helper-task")}>
            <View style={[styles.crossPromoIcon, { backgroundColor: tokens.services.task.skin }]}>
              <Ionicons name="construct-outline" size={moderateScale(18)} color={tokens.services.task.accent} />
            </View>
            <View style={styles.crossPromoTextWrap}>
              <Text style={styles.crossPromoTitle}>Hire a helper</Text>
              <Text style={styles.crossPromoSubtitle}>From ₹120 / hour</Text>
            </View>
            <Ionicons name="chevron-forward" size={moderateScale(18)} color={tokens.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.crossPromoRow} activeOpacity={0.85} onPress={() => router.push("/delivery/entry")}>
            <View style={[styles.crossPromoIcon, { backgroundColor: tokens.services.delivery.skin }]}>
              <Ionicons name="cube-outline" size={moderateScale(18)} color={tokens.services.delivery.accent} />
            </View>
            <View style={styles.crossPromoTextWrap}>
              <Text style={styles.crossPromoTitle}>Package delivery</Text>
              <Text style={styles.crossPromoSubtitle}>Multi-stop courier · from ₹39</Text>
            </View>
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>Beta</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppTabBar accent="ride" />
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
    scrollContent: { paddingHorizontal: 16, paddingBottom: 160 },
    headline: {
      fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(28), lineHeight: moderateScale(31),
      letterSpacing: -0.6, color: tokens.text, marginTop: 18,
    },
    subhead: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, marginTop: 8 },
    tierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
    tierCard: {
      width: "47%", backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border,
      borderRadius: moderateScale(20), padding: 16,
    },
    tierIconCircle: {
      width: moderateScale(52), height: moderateScale(52), borderRadius: moderateScale(16),
      backgroundColor: accent.skin, alignItems: "center", justifyContent: "center", marginBottom: 14,
    },
    tierName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), letterSpacing: -0.1, color: tokens.text },
    tierDescription: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 3 },
    sectionLabel: {
      fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase",
      color: tokens.muted, marginTop: 28, marginBottom: 12,
    },
    crossPromoList: { gap: 10 },
    crossPromoRow: {
      flexDirection: "row", alignItems: "center", gap: 12, minHeight: moderateScale(56),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: moderateScale(16), paddingHorizontal: 14, paddingVertical: 12,
    },
    crossPromoIcon: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(12), alignItems: "center", justifyContent: "center" },
    crossPromoTextWrap: { flex: 1 },
    crossPromoTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    crossPromoSubtitle: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    betaBadge: { backgroundColor: tokens.sunken, borderRadius: moderateScale(5), paddingHorizontal: 7, paddingVertical: 4 },
    betaBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 0.5, textTransform: "uppercase", color: tokens.sec },
  });
