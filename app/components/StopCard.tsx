import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { DeliveryStop } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";

interface Props {
  stop: DeliveryStop;
  index: number;
  onRemove: (id: string) => void;
  onPress?: (stop: DeliveryStop) => void;
}

export function StopCard({ stop, index, onRemove, onPress }: Props) {
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.delivery;
  const styles = React.useMemo(() => createStyles(tokens, accent), [theme]);

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress?.(stop)} activeOpacity={0.85}>
      <View style={styles.stopIndicator}>
        <View style={styles.dot}>
          <Text style={styles.dotText}>{index + 1}</Text>
        </View>
      </View>
      <View style={styles.content}>
        {stop.storeName && <Text style={styles.storeName} numberOfLines={1}>{stop.storeName}</Text>}
        <Text style={styles.address} numberOfLines={1}>{stop.address}</Text>
        {stop.items && stop.items.length > 0 && (
          <Text style={styles.itemCount}>{stop.items.length} item{stop.items.length !== 1 ? "s" : ""}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(stop.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={13} color={tokens.sec} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["delivery"]) =>
  StyleSheet.create({
    container: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, padding: 10,
    },
    stopIndicator: { alignItems: "center" },
    dot: {
      width: moderateScale(18), height: moderateScale(18), borderRadius: moderateScale(9),
      backgroundColor: accent.accent, alignItems: "center", justifyContent: "center",
    },
    dotText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), color: accent.on },
    content: { flex: 1, minWidth: 0 },
    storeName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },
    address: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(12), color: tokens.sec, marginTop: 1 },
    itemCount: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: accent.accent, marginTop: 3 },
    removeBtn: {
      width: moderateScale(22), height: moderateScale(22), borderRadius: moderateScale(11),
      backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center",
    },
  });
