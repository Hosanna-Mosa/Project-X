import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

interface VendorDetails {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  detailedAddress?: {
    shopNo?: string;
    floor?: string;
    area?: string;
    city?: string;
    landmark?: string;
  };
  rating: number;
  reviews: string;
  categories: string[];
  isPureVeg: boolean;
  isOpen: boolean;
  deliveryFee: number;
  minOrderValue: number;
  partnerType?: string;
  location?: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
}

export default function RestaurantDetails() {
  const { id, name: searchName, image: searchImage, rating: searchRating, reviews: searchReviews, isMeat } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorDetails | null>(null);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
        const endpoint = `${baseUrl}/api/v1/vendors/${id}`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setVendor(data);
        }
      } catch (error) {
        console.error("Error fetching vendor details:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchVendorDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch((err) =>
      console.error("Failed to make call:", err)
    );
  };

  const handleEmail = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}`).catch((err) =>
      console.error("Failed to send email:", err)
    );
  };

  const handleNavigate = () => {
    const targetName = vendor?.name || (searchName as string) || "Restaurant";
    
    if (vendor?.location?.coordinates && vendor.location.coordinates.length === 2) {
      const [lng, lat] = vendor.location.coordinates;
      const label = encodeURIComponent(targetName);
      
      // Select appropriate URI based on platform
      const url = Platform.select({
        ios: `maps://app?daddr=${lat},${lng}&q=${label}`,
        android: `google.navigation:q=${lat},${lng}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      });

      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to web link
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        }
      }).catch((err) => {
        console.error("Error launching maps navigation:", err);
      });
    } else {
      // Fallback: search by address query in Google Maps
      const addressQuery = encodeURIComponent(vendor?.address || (searchName as string));
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${addressQuery}`).catch((err) =>
        console.error("Failed to open map query:", err)
      );
    }
  };

  // Safe Fallback Values
  const displayName = vendor?.name || (searchName as string) || "Restaurant Details";
  const displayImage = (searchImage as string) || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600";
  const displayRating = vendor?.rating || parseFloat(searchRating as string) || 4.5;
  const displayReviews = vendor?.reviews || (searchReviews as string) || "200";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <TouchableOpacity
        onPress={() => router.back()}
        style={[
          styles.floatingBackButton,
          {
            top: insets.top + 12,
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Image & Top Card overlap */}
        <View style={styles.heroSection}>
          <Image source={{ uri: displayImage }} style={styles.heroImage} />
          
          <View style={[styles.floatingCard, { borderColor: colors.borderLight }]}>
            <Text style={styles.restaurantTitle}>{displayName}</Text>

            {/* Rating row */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#0061a5" />
              <Text style={styles.ratingValue}>{displayRating}</Text>
              <Text style={styles.ratingCount}>({displayReviews} ratings)</Text>
              {vendor?.isPureVeg && (
                <>
                  <Text style={styles.dot}>•</Text>
                  <View style={styles.vegIndicator}>
                    <View style={styles.vegDot} />
                    <Text style={styles.vegText}>PURE VEG</Text>
                  </View>
                </>
              )}
            </View>

            {/* Separator line */}
            <View style={styles.cardSeparator} />

            {/* Quick Metrics */}
            <View style={styles.gridRow}>
              <View style={styles.gridColumn}>
                <Text style={styles.gridValue}>{vendor?.deliveryFee === 0 ? "Free" : `₹${vendor?.deliveryFee || 25}`}</Text>
                <Text style={styles.gridLabel}>delivery fee</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.gridColumn}>
                <Text style={styles.gridValue}>₹{vendor?.minOrderValue || 150}</Text>
                <Text style={styles.gridLabel}>min order</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.gridColumn}>
                <View style={[styles.statusBadge, { backgroundColor: vendor?.isOpen !== false ? "#F0FDF4" : "#FEF2F2" }]}>
                  <Text style={[styles.statusBadgeText, { color: vendor?.isOpen !== false ? "#16A34A" : "#EF4444" }]}>
                    {vendor?.isOpen !== false ? "OPEN NOW" : "CLOSED"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.contentSection}>
            
            {/* CARD 1: RESTAURANT INFO & TIMINGS (Efficiently Grouped) */}
            <View style={[styles.sectionCard, { borderColor: colors.borderLight }]}>
              <Text style={styles.sectionTitle}>RESTAURANT INFO</Text>
              
              {/* Cuisines Sub-section */}
              {vendor?.categories && vendor.categories.length > 0 && (
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>CUISINES</Text>
                  <View style={styles.cuisineTagsRow}>
                    {vendor.categories.map((cat) => (
                      <View key={cat} style={[styles.cuisineTag, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.cuisineTagText, { color: colors.text }]}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {vendor?.categories && vendor.categories.length > 0 && <View style={styles.itemDivider} />}

              {/* Delivery Hours */}
              <View style={styles.detailRow}>
                <View style={[styles.iconContainer, { backgroundColor: "#F0FDF4" }]}>
                  <Feather name="clock" size={18} color="#16A34A" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowLabel}>Standard Delivery Hours</Text>
                  <Text style={[styles.rowValue, { color: colors.text }]}>09:00 AM - 10:00 PM</Text>
                </View>
              </View>

              <View style={styles.itemDivider} />

              {/* Hygiene Policy */}
              <View style={styles.detailRow}>
                <View style={[styles.iconContainer, { backgroundColor: "#FEF2F2" }]}>
                  <MaterialIcons name="security" size={18} color="#EF4444" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowLabel}>Hygiene & Safety Policy</Text>
                  <Text style={[styles.rowValue, { color: colors.text, fontSize: 12, lineHeight: 18 }]}>
                    This kitchen holds a valid FSSAI certification and enforces strict sanitization protocols.
                  </Text>
                </View>
              </View>
            </View>

            {/* CARD 2: LOCATION & CONTACT DETAILS (Efficiently Grouped) */}
            <View style={[styles.sectionCard, { borderColor: colors.borderLight }]}>
              <Text style={styles.sectionTitle}>LOCATION & CONTACT</Text>
              
              {/* Address Details */}
              <View style={styles.detailRow}>
                <View style={[styles.iconContainer, { backgroundColor: "#F5F3FF" }]}>
                  <Ionicons name="location-outline" size={18} color="#8B5CF6" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowLabel}>Full Address</Text>
                  <Text style={[styles.rowValue, { color: colors.text, lineHeight: 20 }]}>
                    {vendor?.address || "Address details not available"}
                  </Text>
                </View>
              </View>

              {/* Landmark details */}
              {vendor?.detailedAddress?.landmark && (
                <View style={[styles.detailRow, { marginTop: 12, marginLeft: 52 }]}>
                  <Ionicons name="flag-outline" size={14} color="#F59E0B" />
                  <Text style={[styles.landmarkText, { color: colors.textSecondary }]}>
                    Landmark: <Text style={{ fontFamily: "Inter_600SemiBold" }}>{vendor.detailedAddress.landmark}</Text>
                  </Text>
                </View>
              )}

              {/* Navigate Button */}
              <TouchableOpacity
                onPress={handleNavigate}
                style={[styles.navigateBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Ionicons name="map-outline" size={18} color="#ffffff" />
                <Text style={styles.navigateBtnText}>Navigate in Google Maps</Text>
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              {/* Phone item */}
              <TouchableOpacity
                onPress={() => handleCall(vendor?.phone || "9876543210")}
                style={styles.detailRowAction}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${colors.teal}10` }]}>
                  <Feather name="phone" size={18} color={colors.teal} />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowLabel}>Phone Number</Text>
                  <Text style={[styles.rowValue, { color: colors.teal }]}>{vendor?.phone || "Not Available"}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              {/* Email item */}
              {vendor?.email && (
                <TouchableOpacity
                  onPress={() => handleEmail(vendor.email!)}
                  style={styles.detailRowAction}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${colors.teal}10` }]}>
                    <Feather name="mail" size={18} color={colors.teal} />
                  </View>
                  <View style={styles.rowTextContainer}>
                    <Text style={styles.rowLabel}>Email Address</Text>
                    <Text style={[styles.rowValue, { color: colors.teal }]}>{vendor.email}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingBackButton: {
    position: "absolute",
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  heroSection: {
    width: "100%",
    position: "relative",
    paddingBottom: 24,
  },
  heroImage: {
    width: "100%",
    height: 180,
  },
  floatingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 20,
    marginTop: -30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  restaurantTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#002045",
    textAlign: "center",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ratingValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#002045",
  },
  ratingCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#43474e",
  },
  dot: {
    fontSize: 14,
    color: "#c4c6cf",
  },
  vegIndicator: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#16A34A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  vegText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#16A34A",
  },
  cardSeparator: {
    height: 1,
    backgroundColor: "#eceef0",
    marginVertical: 12,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  gridColumn: {
    alignItems: "center",
    flex: 1,
  },
  gridValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#191c1e",
  },
  gridLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#74777f",
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#eceef0",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  contentSection: {
    paddingHorizontal: 20,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#74777f",
    letterSpacing: 1,
    marginBottom: 12,
  },
  subSection: {
    marginBottom: 4,
  },
  subSectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#a0a4a8",
    marginBottom: 8,
  },
  cuisineTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cuisineTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cuisineTagText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  detailRowAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#74777f",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  landmarkText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginLeft: 6,
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#eceef0",
    marginVertical: 12,
  },
  navigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  navigateBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
