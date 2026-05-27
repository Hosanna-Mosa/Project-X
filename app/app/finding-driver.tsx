import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { socketService } from "@/utils/socketService";
import { Ionicons } from "@expo/vector-icons";
import { useDeliveryStore } from "@/contexts/deliveryStore";

export default function FindingDriverScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (!orderId) {
      router.push("/(tabs)");
      return;
    }

    socketService.connect();
    socketService.trackOrder(orderId);

    const handleOrderAccepted = (data: any) => {
      console.log("Order accepted by driver:", data.driver);
      // Hydrate global deliveryStore state
      const { setDriver, setStatus } = useDeliveryStore.getState();
      setDriver(data.driver);
      setStatus("driver_assigned");
      
      router.push("/tracking");
    };

    socketService.on("order_accepted", handleOrderAccepted);

    return () => {
      socketService.off("order_accepted", handleOrderAccepted);
    };
  }, [orderId]);

  const handleCancel = () => {
    router.push("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.radarContainer}>
        <Animated.View 
          style={[
            styles.radar, 
            { 
              borderColor: colors.primary, 
              transform: [{ scale }], 
              opacity 
            }
          ]} 
        />
        <View style={[styles.radarCenter, { backgroundColor: colors.primary }]}>
            <Ionicons name="search" size={32} color="#fff" />
        </View>
      </View>
      <Text style={[styles.text, { color: colors.text }]}>Finding your driver...</Text>
      
      <View style={styles.cancelButtonContainer}>
         <Text style={[styles.cancelText, { color: colors.error }]} onPress={handleCancel}>Cancel Request</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  radarCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  radar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    borderWidth: 4, 
    position: "absolute" 
  },
  text: { fontSize: 20, fontWeight: "700", marginTop: 40 },
  cancelButtonContainer: {
    position: "absolute",
    bottom: 50,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    padding: 10,
  }
});
