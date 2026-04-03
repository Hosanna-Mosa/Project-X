import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView from "@/components/MapView";
import SlideButton from "@/components/SlideButton";
import SOSButton from "@/components/SOSButton";
import StopCard from "@/components/StopCard";
import { Colors } from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";

const STEP_ACTIONS: {
  label: string;
  icon: "navigation" | "check-circle" | "package" | "arrow-right" | "home";
  color: string;
  subLabel: string;
}[] = [
  {
    label: "Slide to Arrived",
    icon: "navigation",
    color: Colors.primary,
    subLabel: "At Pickup Location",
  },
  {
    label: "Slide to Picked Items",
    icon: "package",
    color: "#8B5CF6",
    subLabel: "Items Collected",
  },
  {
    label: "Slide to Next Stop",
    icon: "arrow-right",
    color: Colors.warning,
    subLabel: "Heading to Next Stop",
  },
  {
    label: "Slide to Arrived",
    icon: "navigation",
    color: Colors.primary,
    subLabel: "At Second Pickup",
  },
  {
    label: "Slide to Picked Items",
    icon: "package",
    color: "#8B5CF6",
    subLabel: "Items Collected",
  },
  {
    label: "Slide to Next Stop",
    icon: "arrow-right",
    color: Colors.warning,
    subLabel: "Heading to Delivery",
  },
  {
    label: "Slide to Arrived",
    icon: "home",
    color: Colors.success,
    subLabel: "At Delivery Location",
  },
  {
    label: "Slide to Delivered",
    icon: "check-circle",
    color: Colors.success,
    subLabel: "Order Complete!",
  },
];

export default function OrderNavigationScreen() {
  const insets = useSafeAreaInsets();
  const { currentOrder, currentStep, updateStep, completeOrder } =
    useDriverStore();
  const [eta, setEta] = useState("12 min");
  const [distance, setDistance] = useState("2.4 km");
  const [showDetails, setShowDetails] = useState(false);
  const etaAnim = useRef(new Animated.Value(1)).current;
  
  const handleNavigate = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const broadcastStatus = (step: number) => {
    let statusToBroadCast = "";
    switch (step) {
      case 0: statusToBroadCast = "en_route_pickup"; break;
      case 1: statusToBroadCast = "arrived_pickup"; break;
      case 2: statusToBroadCast = "picking_items"; break;
      case 3: statusToBroadCast = "en_route_pickup"; break; // second pickup
      case 4: statusToBroadCast = "arrived_pickup"; break;
      case 5: statusToBroadCast = "picking_items"; break;
      case 6: statusToBroadCast = "en_route_delivery"; break;
      case 7: statusToBroadCast = "delivered"; break;
      default: statusToBroadCast = "en_route_pickup";
    }
    if (statusToBroadCast && currentOrder) {
      socketService.emit("order_status_update", {
        orderId: currentOrder.id,
        status: statusToBroadCast
      });
    }
  };

  useEffect(() => {
    if (!currentOrder) {
      router.replace("/(tabs)");
      return;
    }

    const interval = setInterval(() => {
      const minutes = Math.max(1, parseInt(eta) - 1);
      const km = Math.max(0.1, parseFloat(distance) - 0.15).toFixed(1);
      setEta(`${minutes} min`);
      setDistance(`${km} km`);

      Animated.sequence([
        Animated.timing(etaAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(etaAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, 8000);

    return () => clearInterval(interval);
  }, [eta, distance, currentOrder]);

  if (!currentOrder) return null;

  const totalSteps = STEP_ACTIONS.length;
  const actionIndex = Math.min(currentStep, totalSteps - 1);
  const currentAction = STEP_ACTIONS[actionIndex];

  const currentStopIndex = Math.floor(currentStep / 3);
  const activeStop = currentOrder.stops[Math.min(currentStopIndex, currentOrder.stops.length - 1)];

  const handleSlideComplete = () => {
    if (currentStep >= totalSteps - 1) {
      Alert.alert(
        "Order Complete!",
        `You've earned ₹${currentOrder.earnings}!`,
        [
          {
            text: "View Summary",
            onPress: () => {
              completeOrder();
              router.replace("/(tabs)");
            },
          },
        ]
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextStep = currentStep + 1;
    updateStep(nextStep);
    broadcastStatus(nextStep);
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          stops={currentOrder.stops}
          currentStep={currentStopIndex}
          style={styles.map}
        />
      </View>

      <View
        style={[
          styles.header,
          {
            top: insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.orderIdText}>{currentOrder.id}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push("/chat")}
          >
            <Feather name="message-circle" size={20} color={Colors.primary} />
            <View style={styles.chatBadge} />
          </TouchableOpacity>
          <SOSButton />
        </View>
      </View>

      <View
        style={[
          styles.bottomSheet,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16,
          },
        ]}
      >
        <View style={styles.sheetHandle} />

        <View style={styles.etaRow}>
          <Animated.View
            style={[styles.etaCard, { transform: [{ scale: etaAnim }] }]}
          >
            <Feather name="clock" size={18} color={Colors.primary} />
            <Text style={styles.etaValue}>{eta}</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </Animated.View>
          <Animated.View
            style={[styles.etaCard, { transform: [{ scale: etaAnim }] }]}
          >
            <Feather name="map-pin" size={18} color={Colors.primary} />
            <Text style={styles.etaValue}>{distance}</Text>
            <Text style={styles.etaLabel}>Distance</Text>
          </Animated.View>
          <View style={styles.etaCard}>
            <Feather name="dollar-sign" size={18} color={Colors.success} />
            <Text style={[styles.etaValue, { color: Colors.success }]}>
              ₹{currentOrder.earnings}
            </Text>
            <Text style={styles.etaLabel}>Earnings</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>

        {activeStop && (
          <View style={styles.currentStopCard}>
            <View style={styles.currentStopHeader}>
              <View style={[styles.stopTypeBadge, { backgroundColor: Colors.primaryLight }]}>
                <Feather
                  name={activeStop.type === "pickup" ? "package" : "home"}
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.stopTypeBadgeText}>
                  {currentAction.subLabel}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetails(!showDetails)}>
                <Text style={styles.showDetailsText}>
                  {showDetails ? "Hide" : "Details"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.currentLocationName}>
              {activeStop.locationName}
            </Text>
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={14} color={Colors.textSecondary} />
              <Text style={styles.addressText} numberOfLines={1}>
                {activeStop.address}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.navigateBtn} 
              onPress={() => handleNavigate(activeStop.lat, activeStop.lng, activeStop.locationName)}
            >
              <Feather name="navigation" size={16} color={Colors.white} />
              <Text style={styles.navigateBtnText}>Navigate Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {showDetails && (
          <ScrollView
            style={styles.stopsScroll}
            showsVerticalScrollIndicator={false}
          >
            {currentOrder.stops.map((stop, idx) => (
              <StopCard
                key={stop.id}
                stop={stop}
                index={idx}
                isActive={idx === currentStopIndex}
                isCompleted={idx < currentStopIndex}
                onNavigate={() => handleNavigate(stop.lat, stop.lng, stop.locationName)}
              />
            ))}
          </ScrollView>
        )}

        <SlideButton
          label={currentAction.label}
          onSlideComplete={handleSlideComplete}
          color={currentAction.color}
          icon={currentAction.icon}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "flex-start",
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    position: "relative",
  },
  chatBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
  },
  etaRow: {
    flexDirection: "row",
    gap: 12,
  },
  etaCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  etaValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  etaLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  progressSection: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
    textAlign: "right",
  },
  currentStopCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  currentStopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stopTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  stopTypeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  showDetailsText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
  currentLocationName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  addressText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  navigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  navigateBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
  },
  stopsScroll: {
    maxHeight: 220,
    paddingHorizontal: 4,
  },
});
