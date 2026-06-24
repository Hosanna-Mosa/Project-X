import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

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
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const handlePress = () => {
    router.push({
      pathname: "/restaurant-menu",
      params: { id: _id, name, image, rating, reviews, isMeat: isMeat ? "true" : "false" }
    });
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.95} onPress={handlePress}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: image }} style={styles.image} />
        {isPureVeg && (
          <View style={styles.pureVegBadge}>
            <View style={styles.pureVegDot} />
            <Text style={styles.pureVegText}>PURE VEG</Text>
          </View>
        )}
        <View style={styles.paginationRow}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.paginationDot, i === 1 && styles.paginationDotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="heart" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{rating}</Text>
          <MaterialIcons name="star" size={14} color={colors.textSecondary} style={styles.starIcon} />
          <Text style={styles.statsText}>({reviews})</Text>
          <View style={styles.dot} />
          <Text style={styles.statsText}>{distance.replace(' metres', ' metres').replace(' km', ' km')}</Text>
          <View style={styles.dot} />
          <Text style={styles.statsText}>{time.replace(' mins', ' min').replace(' min', ' min')}</Text>
        </View>


      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    marginBottom: 8,
    marginHorizontal: 16,
  },
  imageWrapper: {
    width: "100%",
    height: 220,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius:17
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
    marginBottom: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  starIcon: {
    marginHorizontal: 2,
    marginTop: -1,
  },
  statsText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: 8,
  },

});
