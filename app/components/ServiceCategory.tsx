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
      <View style={[styles.iconBox, active && { backgroundColor: colors.primary + '18' }]}>
        {image ? (
          <Image source={image} style={styles.iconImage} resizeMode="contain" />
        ) : (
          <Ionicons name={icon as any} size={24} color={finalColor} />
        )}
      </View>
      <Text style={[styles.label, active && { color: colors.primary, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}


const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 3,
    width: 50,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'transparent',
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    textAlign: "center",
  },
});
