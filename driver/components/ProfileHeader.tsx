import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface ProfileHeaderProps {
  name: string;
  memberSince: string;
  rating: number;
  photoUri?: string;
}

export function ProfileHeader({ name, memberSince, rating, photoUri }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.photoContainer}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.memberSince}>Member since {memberSince}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 20,
  },
  photoContainer: {
    position: "relative",
    marginBottom: 12,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  photoInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.primary,
  },
  ratingBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  ratingStar: {
    fontSize: 12,
    color: Colors.white,
  },
  ratingText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.white,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  memberSince: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
});
