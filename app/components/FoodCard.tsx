import React from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  image: ImageSourcePropType;
  name: string;
  rating: number;
  time: string;
  category: string;
  onPress?: () => void;
}

export function FoodCard({ image, name, rating, time, category, onPress }: Props) {
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
          <Feather name="clock" size={11} color={Colors.light.textMuted} />
          <Text style={styles.metaText}>{time}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    marginRight: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    width: "100%",
    height: 160,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.text,
  },
  content: {
    padding: 16,
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  dot: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
});
