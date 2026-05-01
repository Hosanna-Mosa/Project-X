import React from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

interface Props {
  image: ImageSourcePropType;
  name: string;
  rating: number;
  time: string;
  category: string;
  onPress?: () => void;
}

export function FoodCard({ image, name, rating, time, category, onPress }: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image source={image} style={styles.image} resizeMode="cover" />
        <View style={styles.ratingBadge}>
          <Feather name="star" size={10} color="#F59E0B" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.meta}>
          <Feather name="clock" size={11} color={colors.textMuted} />
          <Text style={styles.metaText}>{time}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    width: 140,
    marginRight: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.06 : 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    height: 75,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.05 : 0.2,
    shadowRadius: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  dot: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
