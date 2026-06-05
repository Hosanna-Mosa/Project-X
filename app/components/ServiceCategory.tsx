import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image, ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

interface Props {
  icon?: string;
  image?: ImageSourcePropType;
  label: string;
  onPress: () => void;
  color?: string;
  active?: boolean;
}

export function ServiceCategory({
  icon,
  image,
  label,
  onPress,
  color,
  active = false,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const finalColor = active ? colors.primary : (color || colors.text);
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBox}>
        {image ? (
          <Image source={image} style={styles.iconImage} resizeMode="contain" />
        ) : (
          <Ionicons name={icon as any} size={28} color={finalColor} />
        )}
      </View>
      <Text style={[styles.label, active && { color: colors.primary, fontWeight: '700' }]}>{label}</Text>
      <View style={[styles.bottomLine, { backgroundColor: active ? colors.primary : 'transparent' }]} />
    </TouchableOpacity>
  );
}


const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
    width: 60,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'transparent',
  },
  iconImage: {
    width: 38,
    height: 38,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  bottomLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
});
