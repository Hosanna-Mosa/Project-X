import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 15;
const ITEM_WIDTH = (width - HORIZONTAL_PADDING * 2 - COLUMN_GAP * 2) / 3;

const SERVICES = [
  { id: "parcel", name: "Parcel", image: require("@/assets/images/services/parcel.png") },
  { id: "auto", name: "Auto", image: require("@/assets/images/services/auto.png") },
  { id: "cab-economy", name: "Cab Economy", image: require("@/assets/images/services/cab.png") },
  { id: "bike", name: "Bike", image: require("@/assets/images/services/bike.png") },
  { id: "bike-lite", name: "Bike Lite", image: require("@/assets/images/services/bike.png"), isLite: true },
  { id: "cab-premium", name: "Cab Premium", image: require("@/assets/images/services/cab.png"), isPremium: true },
  { id: "travel", name: "Travel", image: require("@/assets/images/services/travel.png") },
];

export default function AllServicesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 44 }]}>
        <Text style={styles.headerTitle}>All Services</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {SERVICES.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.serviceItem}
              onPress={() => router.push({ pathname: "/drop-location", params: { serviceId: service.id, name: service.name } })}
            >
              <View style={styles.iconContainer}>
                <Image source={service.image} style={styles.serviceIcon} resizeMode="contain" />
                {service.isLite && (
                  <View style={styles.badge}>
                    <Ionicons name="pricetag" size={10} color="#fff" />
                  </View>
                )}
                {service.isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="sparkles" size={10} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={styles.serviceName}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingBottom: 20,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
    },
    scrollContent: {
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingBottom: 40,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: COLUMN_GAP,
      rowGap: 16,
    },
    serviceItem: {
      width: ITEM_WIDTH,
      alignItems: "center",
      marginBottom: 2,
    },
    iconContainer: {
      width: ITEM_WIDTH,
      height: 68,
      backgroundColor: "#F8FAFC",
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    serviceIcon: {
      width: 48,
      height: 48,
    },
    serviceName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginTop: 7,
    },
    badge: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "#16A34A",
      padding: 4,
      borderRadius: 8,
    },
    premiumBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "#F59E0B",
      padding: 4,
      borderRadius: 8,
    },
  });
