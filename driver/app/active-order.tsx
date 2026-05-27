import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useDriverStore } from "@/store/driverStore";
import Colors from "@/constants/colors";
import { socketService } from "@/utils/socketService";

const { width, height } = Dimensions.get("window");

const mapStyle = [
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#7c93a3" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.stroke",
    "stylers": [
      { "visibility": "on" },
      { "color": "#ffffff" },
      { "weight": 2 },
      { "gamma": 0.84 }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [{ "color": "#f1f5f9" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#cbd5e1" }]
  }
];

export default function ActiveOrderScreen() {
  const insets = useSafeAreaInsets();
  const { currentOrder, completeOrder, updateOrderStatus, unreadCount } = useDriverStore();
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!currentOrder) {
      router.push("/(tabs)");
      return;
    }

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setDriverLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, [currentOrder]);

  if (!currentOrder) return null;

  const userStop = currentOrder.stops?.[0];
  const userLocation = userStop ? { lat: userStop.lat, lng: userStop.lng } : null;
  const isHelper = currentOrder.serviceType?.toLowerCase() === "helper";
  const radiusMeters = currentOrder.radius ? currentOrder.radius * 1000 : 2000;

  const handleComplete = () => {
    completeOrder?.();
    router.push("/(tabs)");
  };

  const handleStatusTransition = async () => {
    const status = currentOrder.status;

    if (isHelper) {
      if (status === "accepted" || status === "driver_assigned") {
        await updateOrderStatus("en_route_pickup");
      } else if (status === "en_route_pickup") {
        await updateOrderStatus("arrived_pickup");
      } else if (status === "arrived_pickup") {
        await updateOrderStatus("picking_items"); // Start Helper Work
      } else if (status === "picking_items") {
        await updateOrderStatus("delivered"); // Complete Helper Work
      } else if (status === "delivered") {
        handleComplete();
      }
    } else {
      // Ride/Delivery standard sequence
      if (status === "accepted" || status === "driver_assigned") {
        await updateOrderStatus("en_route_pickup");
      } else if (status === "en_route_pickup") {
        await updateOrderStatus("arrived_pickup");
      } else if (status === "arrived_pickup") {
        await updateOrderStatus("picking_items");
      } else if (status === "picking_items") {
        await updateOrderStatus("en_route_delivery");
      } else if (status === "en_route_delivery") {
        await updateOrderStatus("arrived_delivery");
      } else if (status === "arrived_delivery") {
        await updateOrderStatus("delivered");
      } else if (status === "delivered") {
        handleComplete();
      }
    }
  };

  const getButtonText = () => {
    const status = currentOrder.status;
    
    if (isHelper) {
      if (status === "accepted" || status === "driver_assigned") return "Go to Work Location";
      if (status === "en_route_pickup") return "Arrived at Location";
      if (status === "arrived_pickup") return "Start Helper Task";
      if (status === "picking_items") return "Complete Helper Task";
      if (status === "delivered") return "Finish & Return";
    } else {
      if (status === "accepted" || status === "driver_assigned") return "Go to Pickup Location";
      if (status === "en_route_pickup") return "Arrived at Pickup";
      if (status === "arrived_pickup") return "Start Cargo Load";
      if (status === "picking_items") return "Start Delivery Route";
      if (status === "en_route_delivery") return "Arrived at Delivery";
      if (status === "arrived_delivery") return "Confirm Delivery Completed";
      if (status === "delivered") return "Finish & Return";
    }
    return "Next Step";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
      case "driver_assigned":
        return "#3B82F6"; // Blue
      case "en_route_pickup":
      case "en_route_delivery":
        return "#F59E0B"; // Amber
      case "arrived_pickup":
      case "arrived_delivery":
        return "#8B5CF6"; // Purple
      case "picking_items":
        return "#EC4899"; // Pink
      case "delivered":
      case "completed":
        return "#10B981"; // Green
      default:
        return "#6B7280";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)")}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Task</Text>
        <TouchableOpacity 
          style={styles.chatBtnTop} 
          onPress={() => router.push({ pathname: "/chat", params: { orderId: currentOrder.id } })}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={Colors.primary} />
          {unreadCount > 0 && (
            <View style={styles.badgeTop}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          customMapStyle={Platform.OS === 'web' ? undefined : mapStyle}
          initialRegion={{
            latitude: userLocation?.lat || 28.6139,
            longitude: userLocation?.lng || 77.2090,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {userLocation && (
            <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}>
              <View style={styles.userMarker}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {userLocation && isHelper && (
            <Circle
              center={{ latitude: userLocation.lat, longitude: userLocation.lng }}
              radius={radiusMeters}
              fillColor="rgba(16, 185, 129, 0.15)"
              strokeColor="rgba(16, 185, 129, 0.6)"
              strokeWidth={2}
            />
          )}

          {driverLocation && (
            <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}>
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={18} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bottomCardContent}
        >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={styles.taskTitle}>{isHelper ? "Helper Task" : "Delivery / Ride"}</Text>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(currentOrder.status) }]}>
            <Text style={styles.statusPillText}>{currentOrder.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color={Colors.error} />
          <Text style={styles.infoText}>{userStop?.address || "Customer Location"}</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>{currentOrder.distance || "N/A"}</Text>
          </View>
          {currentOrder.radius !== undefined && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Radius Boundary</Text>
              <Text style={styles.metricValue}>{currentOrder.radius} km</Text>
            </View>
          )}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Duration</Text>
            <Text style={styles.metricValue}>{currentOrder.duration || "N/A"}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Earnings</Text>
            <Text style={[styles.metricValue, { color: "#10B981" }]}>₹{currentOrder.earnings || "0"}</Text>
          </View>
        </View>

        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerInitials}>
              {(currentOrder.customerName || "C").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{currentOrder.customerName || "Customer"}</Text>
            <Text style={styles.customerPhone}>{currentOrder.customerPhone || "..."}</Text>
          </View>
          <TouchableOpacity 
            style={styles.chatActionBtn}
            onPress={() => router.push({ pathname: "/chat", params: { orderId: currentOrder.id } })}
          >
            <Ionicons name="chatbubble" size={18} color="#fff" />
            <Text style={styles.chatActionText}>Chat</Text>
            {unreadCount > 0 && (
              <View style={styles.badgeBottom}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={handleStatusTransition}>
          <Text style={styles.completeBtnText}>{getButtonText()}</Text>
        </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    padding: 16, 
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    zIndex: 10
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  chatBtnTop: { padding: 4 },
  mapContainer: { flex: 1 },
  userMarker: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#10B981",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
    elevation: 4,
  },
  driverMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
    elevation: 4,
  },
  bottomCard: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    marginTop: -20, // Overlap map slightly
    maxHeight: height * 0.58,
  },
  bottomCardContent: {
    paddingBottom: 4,
  },
  taskTitle: { fontSize: 20, fontWeight: "800", color: Colors.text, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  infoText: { fontSize: 15, color: Colors.textSecondary, flex: 1 },
  customerRow: { 
    flexDirection: "row", alignItems: "center", 
    backgroundColor: Colors.background,
    padding: 12, borderRadius: 16, marginBottom: 24
  },
  customerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginRight: 12
  },
  customerInitials: { fontSize: 18, fontWeight: "700", color: Colors.primaryDark },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  customerPhone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  chatActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 20,
  },
  chatActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  completeBtn: {
    backgroundColor: "#111827",
    paddingVertical: 16, borderRadius: 16,
    alignItems: "center",
  },
  completeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    rowGap: 12,
  },
  metricItem: {
    width: "46%",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  badgeTop: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeBottom: {
    backgroundColor: Colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});
