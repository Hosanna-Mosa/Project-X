import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions } from "react-native";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";

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
  const styles = React.useMemo(() => createStyles(colors), [theme]);

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
    router.push({
      pathname: "/restaurant-menu",
      params: { id: _id, name, image, rating, reviews, isMeat: isMeat ? "true" : "false" }
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

      <TouchableOpacity style={styles.details} activeOpacity={0.95} onPress={handlePress}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
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

        {/* Rating, Distance, Delivery Time, and Delivery Fee Row (Combined) */}
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
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
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
    fontSize: 20,
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
});
