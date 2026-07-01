import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image, ImageSourcePropType } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

interface Props {
  icon?: string;
  iconFamily?: "Ionicons" | "MaterialCommunityIcons";
  image?: ImageSourcePropType;
  label: string;
  onPress: () => void;
  color?: string;
  active?: boolean;
}

export function ServiceCategory({
  icon,
  iconFamily = "Ionicons",
  image,
  label,
  onPress,
  color,
  active = false,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  // Active icon is white (light mode) or background color (dark mode).
  // Inactive icon is primary color.
  const iconColor = active 
    ? (theme === "light" ? "#ffffff" : colors.background)
    : (color || colors.primary);
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      <View style={[
        styles.iconBox, 
        active ? styles.iconBoxActive : styles.iconBoxInactive
      ]}>
        {image ? (
          <Image source={image} style={styles.iconImage} resizeMode="contain" />
        ) : iconFamily === "MaterialCommunityIcons" ? (
          <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
        ) : (
          <Ionicons name={icon as any} size={24} color={iconColor} />
        )}
      </View>
      <Text style={[
        styles.label, 
        active ? styles.labelActive : styles.labelInactive
      ]}>
        {label.toUpperCase()}
      </Text>
      <View style={[
        styles.bottomLine, 
        { backgroundColor: active ? (theme === "light" ? colors.primary : colors.primary) : "transparent" }
      ]} />
    </TouchableOpacity>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    alignItems: "center",
    width: 64,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  iconBoxInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    shadowOpacity: 0.04,
  },
  iconBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.12,
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 0.2,
  },
  labelInactive: {
    color: colors.primary,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  bottomLine: {
    width: 14,
    height: 2.5,
    borderRadius: 1.25,
    marginTop: 4,
  },
});

