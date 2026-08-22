import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import Constants from "expo-constants";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { AppTabBar, useAppTabBarHeight } from "@/components/AppTabBar";

interface VendorDetails {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  detailedAddress?: { landmark?: string };
  rating: number;
  reviews: string;
  categories: string[];
  isPureVeg: boolean;
  isOpen: boolean;
  legal?: { fssaiNumber?: string };
  location?: { type: string; coordinates: number[] };
}

export default function RestaurantDetails() {
  const { id, name: searchName, rating: searchRating, reviews: searchReviews, isMeat } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useAppTabBarHeight();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services[isMeat === "true" ? "meat" : "food"];
  const styles = useMemo(() => createStyles(tokens, accent), [theme, isMeat]);

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorDetails | null>(null);

  useEffect(() => {
    // There's no public by-id endpoint for meat centers today, only for
    // food vendors — skip the doomed fetch for meat and fall back to
    // whatever the previous screen already passed along.
    if (!id || isMeat === "true") {
      setLoading(false);
      return;
    }
    const fetchVendorDetails = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
        const response = await fetch(`${baseUrl}/api/v1/vendors/${id}`);
        if (response.ok) setVendor(await response.json());
      } catch (error) {
        console.error("Error fetching vendor details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVendorDetails();
  }, [id, isMeat]);

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch((err) => console.error("Failed to call:", err));
  };

  const handleEmail = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}`).catch((err) => console.error("Failed to email:", err));
  };

  const handleNavigate = () => {
    const targetName = vendor?.name || (searchName as string) || "Restaurant";
    if (vendor?.location?.coordinates && vendor.location.coordinates.length === 2) {
      const [lng, lat] = vendor.location.coordinates;
      const label = encodeURIComponent(targetName);
      const url = Platform.select({
        ios: `maps://app?daddr=${lat},${lng}&q=${label}`,
        android: `google.navigation:q=${lat},${lng}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      });
      Linking.canOpenURL(url).then((supported) => {
        if (supported) Linking.openURL(url);
        else Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }).catch((err) => console.error("Error launching navigation:", err));
    } else {
      const addressQuery = encodeURIComponent(vendor?.address || targetName);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${addressQuery}`).catch((err) =>
        console.error("Failed to open map query:", err)
      );
    }
  };

  const displayName = vendor?.name || (searchName as string) || "Restaurant";
  const displayRating = vendor?.rating || parseFloat(searchRating as string) || undefined;
  const displayReviews = vendor?.reviews || (searchReviews as string) || undefined;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isMeat === "true" ? "Meat center info" : "Restaurant info"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={accent.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.badgeRow}>
              {vendor?.isPureVeg && (
                <View style={styles.vegBadge}>
                  <View style={styles.vegIconBox}><View style={styles.vegDot} /></View>
                  <Text style={styles.vegBadgeText}>Pure veg</Text>
                </View>
              )}
              {displayRating != null && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>
                    {displayRating} ★{displayReviews ? ` · ${displayReviews}` : ""}
                  </Text>
                </View>
              )}
              {vendor && (
                <View style={[styles.statusBadge, { backgroundColor: vendor.isOpen !== false ? tokens.successSkin : tokens.errorSkin }]}>
                  <Text style={[styles.statusBadgeText, { color: vendor.isOpen !== false ? tokens.success : tokens.error }]}>
                    {vendor.isOpen !== false ? "Open now" : "Closed"}
                  </Text>
                </View>
              )}
            </View>
            {!!vendor?.categories?.length && (
              <Text style={styles.cuisineLine}>{vendor.categories.join(" · ")}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {vendor?.legal?.fssaiNumber && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Hygiene &amp; safety</Text>
              <View style={styles.hygieneCard}>
                <View style={styles.hygieneRow}>
                  <Ionicons name="checkmark" size={14} color={tokens.success} />
                  <Text style={styles.hygieneText}>Kitchen audited by FSSAI · licence {vendor.legal.fssaiNumber}</Text>
                </View>
                <View style={styles.hygieneRow}>
                  <Ionicons name="checkmark" size={14} color={tokens.success} />
                  <Text style={styles.hygieneText}>Tamper-proof packaging on every order</Text>
                </View>
              </View>
            </View>
          )}

          {vendor?.address && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Address</Text>
              <View style={styles.card}>
                <Text style={styles.addressText}>
                  {vendor.address}
                  {vendor.detailedAddress?.landmark ? ` · Near ${vendor.detailedAddress.landmark}` : ""}
                </Text>
                <TouchableOpacity style={styles.navigateBtn} activeOpacity={0.85} onPress={handleNavigate}>
                  <Text style={styles.navigateBtnText}>Navigate in Google Maps</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(vendor?.phone || vendor?.email) && (
            <View style={[styles.section, { flexDirection: "row", gap: 10 }]}>
              {vendor?.phone && (
                <TouchableOpacity style={styles.contactCard} activeOpacity={0.85} onPress={() => handleCall(vendor.phone)}>
                  <Feather name="phone" size={15} color={tokens.sec} />
                  {/* flex: 1 (not just minWidth: 0) is what actually bounds
                      this to the card's available width — without it,
                      numberOfLines had nothing to truncate against and long
                      values could render past the card's edge. */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>{vendor.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              {vendor?.email && (
                <TouchableOpacity style={styles.contactCard} activeOpacity={0.85} onPress={() => handleEmail(vendor.email!)}>
                  <Feather name="mail" size={15} color={tokens.sec} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>{vendor.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isMeat === "true" && !vendor && (
            <View style={styles.section}>
              <Text style={styles.hygieneText}>
                Full details for meat centers aren't available yet — there's no public lookup endpoint for them, only the nearby-search listing.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <AppTabBar accent={isMeat === "true" ? "meat" : "food"} cartVendorName={displayName} />
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
    backBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    section: { paddingHorizontal: 16, paddingTop: 20 },
    name: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(24), letterSpacing: -0.3, color: tokens.text },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
    vegBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: tokens.veg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    vegIconBox: { width: 13, height: 13, borderWidth: 1.5, borderColor: tokens.veg, borderRadius: 3, alignItems: "center", justifyContent: "center" },
    vegDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.veg },
    vegBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.veg },
    ratingBadge: { backgroundColor: tokens.successSkin, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
    ratingBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.success },
    statusBadge: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
    statusBadgeText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase" },
    cuisineLine: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(23), color: tokens.sec, marginTop: 14 },

    divider: { height: 1, backgroundColor: tokens.border, marginHorizontal: 16, marginTop: 20 },

    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 12 },
    hygieneCard: { backgroundColor: tokens.successSkin, borderRadius: 16, padding: 14, gap: 9 },
    hygieneRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    hygieneText: { flex: 1, fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec },

    card: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 14 },
    addressText: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(22), color: tokens.text },
    navigateBtn: { marginTop: 12, backgroundColor: accent.skin, borderWidth: 1, borderColor: accent.accent, borderRadius: 12, minHeight: moderateScale(44), alignItems: "center", justifyContent: "center" },
    navigateBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: accent.accent },

    contactCard: {
      flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16,
      paddingHorizontal: 14, paddingVertical: 13, minHeight: moderateScale(56), flexDirection: "row", alignItems: "center", gap: 10,
    },
    contactLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    contactValue: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text, marginTop: 2 },
  });
