import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

interface Props {
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
}

export function RestaurantListItem({
  name,
  rating,
  reviews,
  time,
  distance,
  categories,
  location,
  image,
  offer,
  isPureVeg,
  bestIn,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.9}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: image }} style={styles.image} />
        {offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{offer}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn}>
          <Feather name="heart" size={18} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.details}>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            {bestIn && (
              <View style={styles.bestInBadge}>
                <MaterialIcons name="stars" size={14} color="#E11D48" />
                <Text style={styles.bestInText}>Best in {bestIn}</Text>
              </View>
            )}
             {isPureVeg && (
              <View style={styles.pureVegBadge}>
                <MaterialIcons name="eco" size={14} color="#16A34A" />
                <Text style={styles.pureVegText}>Pure Veg</Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
          </View>
          <TouchableOpacity>
            <Feather name="more-vertical" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.ratingRow}>
          <View style={styles.ratingCircle}>
            <Feather name="star" size={10} color="white" />
          </View>
          <Text style={styles.ratingText}>{rating} ({reviews})</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{time}</Text>
        </View>

        <Text style={styles.categoriesText} numberOfLines={1}>{categories}</Text>
        <Text style={styles.locationText} numberOfLines={1}>{location} • {distance}</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 16,
    borderRadius: 20,
    gap: 12,
  },
  imageWrapper: {
    width: 120,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  offerBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  offerText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  details: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  bestInBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bestInText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  pureVegBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pureVegText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  dot: {
    fontSize: 14,
    color: colors.textMuted,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  categoriesText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
