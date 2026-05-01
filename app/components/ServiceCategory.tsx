import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
}

export function ServiceCategory({
  icon,
  label,
  onPress,
  color,
  backgroundColor,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const finalColor = color || colors.primary;
  const finalBg = backgroundColor || colors.surfaceSecondary;
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconBox, { backgroundColor: finalBg }]}>
        <FontAwesome5 name={icon as any} size={14} color={finalColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}


const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.05 : 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
});
