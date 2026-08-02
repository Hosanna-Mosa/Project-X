import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions } from "react-native";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";

import { Modal, Pressable, Animated, Easing } from "react-native";

interface Props {
  _id: string;
  name: string;
  rating: number;
  reviews: string;
  time: string;
  distance: string;
  categories: string;
  location: string;
  image: string;
  offer?: string;
  isPureVeg?: boolean;
  bestIn?: string;
  isMeat?: boolean;
  deliveryFee?: number;
}

export function RestaurantListItem({
  _id,
  name,
  rating,
  reviews,
  time,
  distance,
  image,
  offer,
  isPureVeg,
  isMeat,
  deliveryFee,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors, theme), [theme]);

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.35)).current;
  const translateYAnim = React.useRef(new Animated.Value(90)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const openModal = () => {
    setIsModalVisible(true);
    scaleAnim.setValue(0.35);
    translateYAnim.setValue(90);
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        bounciness: 16,
        speed: 12,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        bounciness: 16,
        speed: 12,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.4,
        duration: 200,
        easing: Easing.in(Easing.back(1)),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 60,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsModalVisible(false);
      if (callback) callback();
    });
  };

  const user = useAuthStore((s) => s.user);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);

  const isFavorite = React.useMemo(() => {
    return user?.favorites?.includes(_id) || false;
  }, [user?.favorites, _id]);

  // Generate a stable sponsored state based on restaurant ID hash
  const isSponsored = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < _id.length; i++) {
      hash = _id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 5 === 0; // Mark roughly 20% of restaurants as Sponsored
  }, [_id]);

  const handlePress = () => {
    closeModal(() => {
      router.push({
        pathname: "/restaurant-menu",
        params: { id: _id, name, image, rating, reviews, isMeat: isMeat ? "true" : "false" }
      });
    });
  };

  const CARD_WIDTH = Dimensions.get('window').width - 32;
  const [activeIndex, setActiveIndex] = React.useState(0);

  const carouselImages = React.useMemo(() => {
    return [
      image,
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
      "https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=800&q=80"
    ];
  }, [image]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      {/* Image click opens details page directly */}
      <View style={styles.imageWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ width: CARD_WIDTH, height: 220 }}
        >
          {carouselImages.map((img, idx) => (
            <TouchableOpacity key={idx} activeOpacity={0.9} onPress={handlePress} style={{ width: CARD_WIDTH, height: 220, overflow: 'hidden' }}>
              <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isPureVeg && (
          <View style={styles.pureVegBadge}>
            <View style={styles.pureVegDot} />
            <Text style={styles.pureVegText}>PURE VEG</Text>
          </View>
        )}
        <View style={styles.paginationRow}>
          {carouselImages.map((_, i) => (
            <View key={i} style={[styles.paginationDot, i === activeIndex && styles.paginationDotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.nameRow}>
          {/* Clicking ONLY restaurant name opens dialogue form modal */}
          <TouchableOpacity activeOpacity={0.7} onPress={openModal} style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => toggleFavorite(_id)}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? "#EF4444" : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Rating, Distance, Delivery Time, and Delivery Fee Row */}
        <View style={styles.metadataRow}>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{rating}</Text>
            <MaterialIcons name="star" size={12} color={colors.textSecondary} style={styles.starIcon} />
            <Text style={styles.statsText}>({reviews})</Text>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.statsText}>
              {distance.replace(" metres", " m").replace(" km", " km")}
            </Text>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.statsText}>
              {time.replace(" mins", " min").replace(" min", " min")}
            </Text>
          </View>
          <Text style={styles.feeText}>₹{deliveryFee || 25} delivery fee</Text>
        </View>

        {/* Sponsored tag if applicable */}
        {isSponsored && (
          <View style={styles.sponsoredRow}>
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>
        )}
      </View>

      {/* Restaurant Details Dialogue Form Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeModal()}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }} onPress={() => closeModal()}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  transform: [
                    { translateY: translateYAnim },
                    { scale: scaleAnim }
                  ],
                  opacity: fadeAnim
                }
              ]}
              onStartShouldSetResponder={() => true}
            >
              {/* Header with image, name & price rating */}
              <View style={styles.modalHeaderRow}>
                <Image source={{ uri: image }} style={styles.modalImage} resizeMode="cover" />
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>{name}</Text>
                  <View style={styles.modalRatingRow}>
                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.modalRatingText}>{rating} ({reviews} ratings)</Text>
                  </View>
                </View>
              </View>

              {/* Customers say / Info card */}
              <View style={styles.modalInfoBox}>
                <Text style={styles.modalInfoTitle}>Customers say</Text>
                <Text style={styles.modalInfoDescription}>
                  Customers find {name} to be a top dining choice, with fresh ingredients, quick delivery, and rich authentic taste...
                </Text>
                <Text style={styles.modalAiTag}>✨ Top rated by food lovers nearby</Text>

                <View style={styles.modalFeaturesRow}>
                  <View style={styles.modalFeatureItem}>
                    <Ionicons name="checkmark" size={14} color="#10B981" />
                    <Text style={styles.modalFeatureText}>Hygiene Verified</Text>
                  </View>
                  <View style={styles.modalFeatureItem}>
                    <Ionicons name="checkmark" size={14} color="#10B981" />
                    <Text style={styles.modalFeatureText}>Fast Prep</Text>
                  </View>
                </View>

                <View style={styles.modalBadgesLine}>
                  <Text style={styles.modalBadgeText}>— Delivery in {time}</Text>
                  <Text style={styles.modalBadgeText}>— Distance: {distance}</Text>
                  <Text style={styles.modalBadgeText}>— Premium Quality</Text>
                </View>
              </View>

              {/* See all details button */}
              <TouchableOpacity style={styles.modalSeeDetailsBtn} activeOpacity={0.8} onPress={handlePress}>
                <Text style={styles.modalSeeDetailsText}>See all details</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light, theme: "light" | "dark") => StyleSheet.create({
  container: {
    marginBottom: 20,
    marginHorizontal: 16,
  },
  imageWrapper: {
    width: "100%",
    height: 220,
    position: "relative",
    borderRadius: 17,
    overflow: 'hidden',
  },
  image: {
    width: "100%",
    height: "100%",
  },
  paginationRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  paginationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  paginationDotActive: {
    backgroundColor: "rgba(255,255,255,1)",
    width: 10,
  },
  pureVegBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  pureVegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
  },
  pureVegText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
  },
  details: {
    paddingTop: 12,
    paddingBottom: 0,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  starIcon: {
    marginHorizontal: 2,
    marginTop: -1,
  },
  statsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  bullet: {
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  feeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  sponsoredRow: {
    marginTop: 3,
  },
  sponsoredText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  // Modal Styles matching reference design
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
  },
  modalHeaderTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  modalRatingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalRatingText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: 4,
  },
  modalInfoBox: {
    backgroundColor: theme === "light" ? "#DCE4EC" : "#242E38",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  modalInfoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  modalInfoDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 8,
  },
  modalAiTag: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 12,
  },
  modalFeaturesRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  modalFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalFeatureText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  modalBadgesLine: {
    gap: 4,
  },
  modalBadgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  modalSeeDetailsBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  modalSeeDetailsText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});
