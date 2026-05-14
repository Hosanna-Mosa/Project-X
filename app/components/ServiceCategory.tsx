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
}

export function ServiceCategory({
  icon,
  image,
  label,
  onPress,
  color,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const finalColor = color || colors.text;
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBox}>
        {image ? (
          <Image source={image} style={styles.iconImage} resizeMode="contain" />
        ) : (
          <Ionicons name={icon as any} size={24} color={finalColor} />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
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
