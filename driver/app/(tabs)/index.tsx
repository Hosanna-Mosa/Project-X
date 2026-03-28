import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IncomingOrderModal from "@/components/IncomingOrderModal";
import MapView from "@/components/MapView";
import SOSButton from "@/components/SOSButton";
import { Colors } from "@/constants/colors";
import {
  useDriverStore,
  useMockIncomingOrder,
} from "@/store/driverStore";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    isOnline,
    goOnline,
    goOffline,
    earnings,
    currentOrder,
    incomingOrder,
    acceptOrder,
    rejectOrder,
    setIncomingOrder,
    driverName,
  } = useDriverStore();

  const [toggling, setToggling] = useState(false);
  const onlineAnim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;
  const mockOrderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(onlineAnim, {
      toValue: isOnline ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();

    if (isOnline && !currentOrder) {
      mockOrderTimeout.current = setTimeout(() => {
        const mockOrder = useMockIncomingOrder();
        setIncomingOrder(mockOrder);
      }, 6000);
    }

    return () => {
      if (mockOrderTimeout.current) {
        clearTimeout(mockOrderTimeout.current);
      }
    };
  }, [isOnline]);

  const handleToggle = () => {
    if (toggling) return;
    setToggling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      isOnline ? goOffline() : goOnline();
      setToggling(false);
    }, 300);
  };

  const bgColor = onlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.surfaceAlt, Colors.primaryLight],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mapBackground, { backgroundColor: bgColor }]}>
        <MapView style={styles.map} />
      </Animated.View>

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {isOnline ? "You're Online" : "You're Offline"}
          </Text>
          <Text style={styles.driverName}>{driverName || "Driver"}</Text>
        </View>
        <View style={styles.headerRight}>
          <SOSButton />
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push("/profile")}
          >
            <Feather name="user" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.onlineCard}>
          <View style={styles.onlineCardLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.online : Colors.offline },
              ]}
            />
            <View>
              <Text style={styles.statusTitle}>
                {isOnline ? "Accepting Orders" : "Not Accepting"}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isOnline
                  ? "Waiting for incoming orders..."
                  : "Go online to start earning"}
              </Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggle}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={isOnline ? Colors.primary : Colors.textMuted}
            ios_backgroundColor={Colors.border}
          />
        </View>

        {currentOrder ? (
          <TouchableOpacity
            style={styles.activeOrderCard}
            onPress={() => router.push("/order-navigation")}
          >
            <View style={styles.activeOrderHeader}>
              <View style={styles.activeOrderBadge}>
                <View style={styles.activePulse} />
                <Text style={styles.activeOrderBadgeText}>Active Order</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.activeOrderId}>{currentOrder.id}</Text>
            <View style={styles.activeOrderStats}>
              <View style={styles.activeOrderStat}>
                <Feather name="map-pin" size={14} color={Colors.textSecondary} />
                <Text style={styles.activeOrderStatText}>
                  {currentOrder.stops.length} stops
                </Text>
              </View>
              <View style={styles.activeOrderStat}>
                <Feather name="dollar-sign" size={14} color={Colors.success} />
                <Text style={[styles.activeOrderStatText, { color: Colors.success }]}>
                  ₹{currentOrder.earnings}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.earningsGrid}>
            <View style={[styles.earningsCard, { backgroundColor: Colors.primaryLight }]}>
              <View style={[styles.earningsIcon, { backgroundColor: Colors.primary }]}>
                <Feather name="dollar-sign" size={20} color={Colors.white} />
              </View>
              <Text style={styles.earningsValue}>₹{earnings.today}</Text>
              <Text style={styles.earningsLabel}>Today's Earnings</Text>
            </View>
            <View style={[styles.earningsCard, { backgroundColor: "#EDE9FE" }]}>
              <View style={[styles.earningsIcon, { backgroundColor: "#8B5CF6" }]}>
                <Feather name="trending-up" size={20} color={Colors.white} />
              </View>
              <Text style={styles.earningsValue}>₹{earnings.week}</Text>
              <Text style={styles.earningsLabel}>This Week</Text>
            </View>
          </View>
          <View style={styles.deliveryCard}>
            <Feather name="package" size={18} color={Colors.textSecondary} />
            <Text style={styles.deliveryCount}>{earnings.totalDeliveries}</Text>
            <Text style={styles.deliveryLabel}>Total Deliveries</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/(tabs)/earnings")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.successLight }]}>
                <Feather name="bar-chart-2" size={22} color={Colors.success} />
              </View>
              <Text style={styles.actionLabel}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/(tabs)/history")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
                <Feather name="clock" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.actionLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/profile")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#EDE9FE" }]}>
                <Feather name="user" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.actionLabel}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <IncomingOrderModal
        order={incomingOrder}
        onAccept={() => {
          acceptOrder();
          router.push("/order-navigation");
        }}
        onReject={rejectOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  map: {
    flex: 1,
    height: 280,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  driverName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileBtn: {
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
  scrollView: {
    flex: 1,
    marginTop: 160,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
    paddingTop: 20,
  },
  onlineCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  onlineCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  statusSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activeOrderCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary + "40",
    gap: 10,
  },
  activeOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeOrderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  activeOrderBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  activeOrderId: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  activeOrderStats: {
    flexDirection: "row",
    gap: 20,
  },
  activeOrderStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeOrderStatText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  earningsSection: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  earningsGrid: {
    flexDirection: "row",
    gap: 14,
  },
  earningsCard: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  earningsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
  },
  earningsLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  deliveryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deliveryCount: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
  },
  deliveryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  quickActions: {
    gap: 14,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
});
