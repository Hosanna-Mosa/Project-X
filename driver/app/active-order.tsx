import React, { useEffect, useState, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  Linking,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useDriverStore } from "@/store/driverStore";
import Colors from "@/constants/colors";
import { socketService } from "@/utils/socketService";
import Constants from "expo-constants";

const VEHICLE_BIKE_3D = require('@/assets/images/scooter_blue_top_view.png');

const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

const { width, height } = Dimensions.get("window");

export default function ActiveOrderScreen() {
  const insets = useSafeAreaInsets();
  const { currentOrder, completeOrder, updateOrderStatus, unreadCount, driverPhone, token } = useDriverStore();

  const handleSOS = () => {
    if (!currentOrder) return;

    Alert.alert(
      "Emergency SOS",
      "Are you sure you want to trigger SOS? This will instantly alert our support team and emergency contacts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Trigger SOS",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${apiUrl}/api/v1/orders/${currentOrder.id}/sos`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                },
              });
              if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to trigger SOS");
              }
              Alert.alert(
                "SOS Dispatched",
                "Your emergency alert has been sent. Support is on the way."
              );
            } catch (err: any) {
              console.error("SOS trigger error:", err);
              Alert.alert("Error", err.message || "Failed to trigger SOS. Please call emergency services.");
            }
          }
        }
      ]
    );
  };

  const handleCancelOrder = () => {
    if (!currentOrder) return;

    Alert.alert(
      "Cancel Delivery",
      "Are you sure you want to cancel this delivery? The order will be aborted.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateOrderStatus("CANCELLED" as any);
              useDriverStore.setState({ currentOrder: null, currentStep: 0 });
              Alert.alert("Success", "Delivery has been cancelled.");
            } catch (err: any) {
              console.error("Cancel order error:", err);
              Alert.alert("Error", err.message || "Failed to cancel delivery.");
            }
          }
        }
      ]
    );
  };
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaLambda = (lng2 - lng1) * rad;
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    const theta = Math.atan2(y, x);
    return (theta * (180 / Math.PI) + 360) % 360;
  };

  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverHeading, setDriverHeading] = useState<number>(0);

  // Map Ref
  const mapRef = useRef<MapView | null>(null);

  // GPS Simulation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(0);
  const [simRemainingDist, setSimRemainingDist] = useState(0);
  const [simETA, setSimETA] = useState(0);

  const isHelper = currentOrder?.serviceType?.toLowerCase() === "helper";
  const isRide = ["bike", "auto", "cab", "cab_prime"].includes(currentOrder?.serviceType?.toLowerCase() || "");
  
  const simInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Waiting Compensation States
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(180); // 3 mins prep time
  const [waitTimerSeconds, setWaitTimerSeconds] = useState(0);
  const [waitingComp, setWaitingComp] = useState(0);

  // Helper Task State
  const [taskTimerSeconds, setTaskTimerSeconds] = useState(0);

  // Verification Checklist States
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [sealedChecked, setSealedChecked] = useState(false);
  const [countChecked, setCountChecked] = useState(false);
  const [restaurantOTP, setRestaurantOTP] = useState("");
  const [restaurantOTPError, setRestaurantOTPError] = useState(false);

  // Customer Verification States
  const [deliveryOption, setDeliveryOption] = useState<"door" | "gate" | "contactless">("door");
  const [customerOTP, setCustomerOTP] = useState("");
  const [customerOTPError, setCustomerOTPError] = useState(false);

  // Post Delivery Rating
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  // Get active targets based on order status
  const pickupStop = currentOrder?.stops?.find((s) => s.type === "pickup");
  const deliveryStop = currentOrder?.stops?.find((s) => s.type === "delivery" || s.type === "drop");
  
  // Helper to extract food items from stops list
  const getFoodItems = () => {
    if (!currentOrder?.stops) return [];
    for (const stop of currentOrder.stops) {
      const items = stop.items;
      if (!items) continue;
      
      if (Array.isArray(items) && items.length > 0) {
        return items;
      }
      if (items && typeof items === "object" && (items as any).lines && Array.isArray((items as any).lines) && (items as any).lines.length > 0) {
        return (items as any).lines;
      }
    }
    return [];
  };

  const foodItems = getFoodItems();

  useEffect(() => {
    if (!currentOrder) {
      router.push("/(tabs)");
      return;
    }

    let locationSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const initialLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setDriverLocation(initialLoc);
        if (typeof loc.coords.heading === "number" && loc.coords.heading >= 0) {
          setDriverHeading(loc.coords.heading);
        }

        // 1. Real-time GPS location watcher
        try {
          locationSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 2000,
              distanceInterval: 5,
            },
            (newLoc) => {
              if (newLoc?.coords) {
                setDriverLocation({
                  lat: newLoc.coords.latitude,
                  lng: newLoc.coords.longitude,
                });
                if (typeof newLoc.coords.heading === "number" && newLoc.coords.heading >= 0) {
                  setDriverHeading(newLoc.coords.heading);
                }
              }
            }
          );
        } catch (lErr) {
          console.warn("[Location Watcher] Failed:", lErr);
        }

        // 2. Real-time device compass heading watcher (rotates marker as mobile turns)
        try {
          headingSub = await Location.watchHeadingAsync((headingData) => {
            const trueH = headingData.trueHeading;
            const magH = headingData.magHeading;
            const h = (trueH !== undefined && trueH >= 0) ? trueH : magH;
            if (typeof h === "number" && !isNaN(h)) {
              setDriverHeading(h);
            }
          });
        } catch (headingErr) {
          console.warn("[Heading Watcher] Compass sensor watch failed/unavailable:", headingErr);
        }

        // Focus map to show full route
        const coords: { latitude: number; longitude: number }[] = [];
        coords.push({ latitude: initialLoc.lat, longitude: initialLoc.lng });
        if (pickupStop) coords.push({ latitude: Number(pickupStop.lat), longitude: Number(pickupStop.lng) });
        if (deliveryStop) coords.push({ latitude: Number(deliveryStop.lat), longitude: Number(deliveryStop.lng) });
        
        setTimeout(() => {
          if (coords.length > 1) {
            mapRef.current?.fitToCoordinates(coords, {
              edgePadding: { top: 80, right: 50, bottom: 400, left: 50 },
              animated: true,
            });
          } else {
            mapRef.current?.animateToRegion({
              latitude: initialLoc.lat,
              longitude: initialLoc.lng,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }, 500);
          }
        }, 500);
      } else {
        // Fallback to Bangalore
        setDriverLocation({ lat: 12.9716, lng: 77.5946 });
      }
    })();

    return () => {
      if (locationSub) locationSub.remove();
      if (headingSub) headingSub.remove();
    };
  }, [currentOrder]);

  // Throttle broadcasting compass heading changes
  const lastHeadingSent = useRef<number>(0);
  const lastHeadingTime = useRef<number>(Date.now());
  useEffect(() => {
    if (!currentOrder || !driverLocation) return;
    const now = Date.now();
    // Emit if heading changed by > 10 degrees and > 1000ms has passed since last emit
    if (Math.abs(driverHeading - lastHeadingSent.current) > 10 && now - lastHeadingTime.current > 1000) {
       lastHeadingSent.current = driverHeading;
       lastHeadingTime.current = now;
       socketService.emit("driver_location_update", {
         driverId: driverPhone || "driver-123",
         lat: driverLocation.lat,
         lng: driverLocation.lng,
         heading: driverHeading,
         orderId: currentOrder.id,
       });
    }
  }, [driverHeading, driverLocation, currentOrder, driverPhone]);

  // Clean simulation intervals on unmount
  useEffect(() => {
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, []);

  // Wait Compensation Timer Effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (currentOrder?.status === "picking_items") {
      timer = setInterval(() => {
        setPrepTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
        setWaitTimerSeconds((prev) => {
          const next = prev + 1;
          const comp = (next / 60) * 0.50; // ₹0.50 per min waiting fee
          setWaitingComp(Math.round(comp * 100) / 100);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentOrder?.status]);

  // Helper Task Timer Effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isHelper && currentOrder?.status !== "delivered" && currentOrder?.status !== "completed") {
      timer = setInterval(() => {
        setTaskTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentOrder?.status, isHelper]);

  if (!currentOrder) return null;

  // Simulate movement towards targeted latitude/longitude
  const startGPSSimulator = (targetLat: number, targetLng: number) => {
    if (simInterval.current) {
      clearInterval(simInterval.current);
      simInterval.current = null;
      setIsSimulating(false);
      setSimSpeed(0);
      return;
    }

    setIsSimulating(true);
    setSimSpeed(35);
    const initialDistance = parseFloat(currentOrder.distance || "4.2") || 4.2;
    const initialDuration = parseInt(currentOrder.duration || "15") || 15;
    setSimRemainingDist(initialDistance);
    setSimETA(initialDuration);

    let startLat = driverLocation?.lat || 12.9716;
    let startLng = driverLocation?.lng || 77.5946;

    const calculatedBearing = calculateBearing(startLat, startLng, targetLat, targetLng);
    setDriverHeading(calculatedBearing);

    let step = 0;
    const totalSteps = 10;

    simInterval.current = setInterval(() => {
      step++;
      const ratio = step / totalSteps;
      const curLat = startLat + (targetLat - startLat) * ratio;
      const curLng = startLng + (targetLng - startLng) * ratio;
      
      const newLoc = { lat: curLat, lng: curLng };
      setDriverLocation(newLoc);

      const remainRatio = 1 - ratio;
      setSimRemainingDist(Math.round((initialDistance * remainRatio) * 10) / 10);
      setSimETA(Math.round(initialDuration * remainRatio));
      setSimSpeed(Math.floor(30 + Math.random() * 15));

      // Broadcast location via socket
      socketService.emit("driver_location_update", {
        driverId: driverPhone || "driver-123",
        lat: curLat,
        lng: curLng,
        heading: calculatedBearing || driverHeading || 0,
        orderId: currentOrder.id,
      });

      // Center map on route
      const coords: { latitude: number; longitude: number }[] = [];
      coords.push({ latitude: curLat, longitude: curLng });
      if (pickupStop) coords.push({ latitude: Number(pickupStop.lat), longitude: Number(pickupStop.lng) });
      if (deliveryStop) coords.push({ latitude: Number(deliveryStop.lat), longitude: Number(deliveryStop.lng) });
      
      if (coords.length > 1) {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 50, bottom: 400, left: 50 },
          animated: true,
        });
      } else {
        mapRef.current?.animateToRegion({
          latitude: curLat,
          longitude: curLng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }, 1000);
      }

      if (step >= totalSteps) {
        clearInterval(simInterval.current!);
        simInterval.current = null;
        setIsSimulating(false);
        setSimSpeed(0);
        setSimRemainingDist(0);
        setSimETA(0);
        
        // Auto transition status when arrived
        handleStatusTransition();
      }
    }, 1500);
  };

  const handleStatusTransition = async () => {
    const status = currentOrder?.status?.toLowerCase() || "";

    if (isHelper) {
      if (status !== "delivered" && status !== "completed") {
        try {
          const expectedOTP = currentOrder.deliveryOtp || currentOrder.id.slice(-4).toLowerCase();
          if (customerOTP.toLowerCase() !== expectedOTP.toLowerCase() && customerOTP !== "9999") {
            setCustomerOTPError(true);
            return;
          }
          setCustomerOTPError(false);
          await updateOrderStatus("delivered", customerOTP);
        } catch (err: any) {
          console.warn("Task completion verification failed:", err.message);
          setCustomerOTPError(true);
          Alert.alert("Verification Failed", err.message || "Invalid OTP code. Please verify with the customer.");
          return;
        }
      } else if (status === "delivered" || status === "completed") {
        completeOrder?.();
        router.push("/(tabs)");
      }
      return;
    } else if (isRide) {
      if (status === "accepted" || status === "driver_assigned") {
        await updateOrderStatus("en_route_pickup");
      } else if (status === "en_route_pickup") {
        if (simInterval.current) clearInterval(simInterval.current);
        setIsSimulating(false);
        await updateOrderStatus("arrived_pickup");
      } else if (status === "arrived_pickup") {
        const expectedOTP = currentOrder.restaurantPickupCode || currentOrder.id.slice(-4).toLowerCase();
        if (restaurantOTP.toLowerCase() !== expectedOTP.toLowerCase() && restaurantOTP !== "9999") {
          setRestaurantOTPError(true);
          return;
        }
        setRestaurantOTPError(false);
        await updateOrderStatus("en_route_delivery", restaurantOTP);
      } else if (status === "en_route_delivery") {
        if (simInterval.current) clearInterval(simInterval.current);
        setIsSimulating(false);
        await updateOrderStatus("arrived_delivery");
      } else if (status === "arrived_delivery") {
        try {
          await updateOrderStatus("delivered", customerOTP);
          setCustomerOTPError(false);
        } catch (err: any) {
          console.warn("Trip completion verification failed:", err.message);
          setCustomerOTPError(true);
          Alert.alert("Verification Failed", err.message || "Invalid OTP code. Please verify with the rider.");
          return;
        }
      } else if (status === "delivered") {
        completeOrder?.();
        router.push("/(tabs)");
      }
    } else {
      // Standard Food Delivery sequence
      if (status === "accepted" || status === "driver_assigned") {
        // Start travel to restaurant
        await updateOrderStatus("en_route_pickup");
      } else if (status === "en_route_pickup") {
        // Arrived at restaurant
        if (simInterval.current) clearInterval(simInterval.current);
        setIsSimulating(false);
        await updateOrderStatus("arrived_pickup");
      } else if (status === "arrived_pickup") {
        // Confirm arrival, wait for order
        await updateOrderStatus("picking_items");
      } else if (status === "picking_items") {
        // Enforce all checklist selections and verification OTP (9999)
        const allItemsChecked = foodItems.every((item: any) => checkedItems[item.name]);
        if (!allItemsChecked) {
          Alert.alert("Checklist Incomplete", "Please verify and check off all items in the checklist.");
          return;
        }
        if (!sealedChecked) {
          Alert.alert("Tamper-proof Seal Check", "Please verify and check the sealed packaging box.");
          return;
        }
        if (!countChecked) {
          Alert.alert("Item Count Check", "Please verify and check the item count box.");
          return;
        }
        const expectedOTP = currentOrder.restaurantPickupCode || currentOrder.id.slice(-4).toLowerCase();
        if (restaurantOTP.toLowerCase() !== expectedOTP.toLowerCase() && restaurantOTP !== "9999") {
          setRestaurantOTPError(true);
          return;
        }
        setRestaurantOTPError(false);
        await updateOrderStatus("en_route_delivery", restaurantOTP);
      } else if (status === "en_route_delivery") {
        // Arrived at customer location
        if (simInterval.current) clearInterval(simInterval.current);
        setIsSimulating(false);
        await updateOrderStatus("arrived_delivery");
      } else if (status === "arrived_delivery") {
        // Customer OTP Verification
        try {
          await updateOrderStatus("delivered", customerOTP);
          setCustomerOTPError(false);
        } catch (err: any) {
          console.warn("Delivery verification failed:", err.message);
          setCustomerOTPError(true);
          Alert.alert("Verification Failed", err.message || "Invalid OTP code. Please verify with the customer.");
          return;
        }
      } else if (status === "delivered") {
        // Post-delivery complete
        completeOrder?.();
        router.push("/(tabs)");
      }
    }
  };

  const handleReportIssue = () => {
    Alert.alert(
      "Report Operational Issue",
      "Select an issue to escalate to support:",
      [
        { text: "Excessive Preparation Delay", onPress: () => Alert.alert("Reported", "Escalation ticket raised.") },
        { text: "Vehicle Breakdown", onPress: () => Alert.alert("Assistance Requested", "Support will contact you.") },
        { text: "Restaurant is Closed", onPress: () => Alert.alert("Reported", "Order cancellation initiated.") },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const openRideNavigation = () => {
    const pickupAddress = pickupStop?.address || (pickupStop ? `${pickupStop.lat},${pickupStop.lng}` : "");
    const destinationAddress = deliveryStop?.address || (deliveryStop ? `${deliveryStop.lat},${deliveryStop.lng}` : "");

    if (!pickupAddress || !destinationAddress) {
      Alert.alert("Navigation unavailable", "Pickup or destination address is missing for this ride.");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickupAddress)}&destination=${encodeURIComponent(destinationAddress)}&travelmode=driving`;
    Linking.openURL(url);
  };
  // Calculations for step 12
  const distanceVal = parseFloat(currentOrder.distance || "4.2") || 4.2;
  const distanceFare = Math.round(distanceVal * 6);
  const baseFare = 40;
  const surgeBonus = 15;
  const peakBonus = 10;
  const rainBonus = 20;
  const customerTip = 20;
  const totalEarningsCalculated = baseFare + distanceFare + surgeBonus + peakBonus + rainBonus + waitingComp + customerTip;

  // Render UI for each step inside the bottom card
  const renderCardContent = () => {
    const status = currentOrder?.status?.toLowerCase() || "";

    if (isHelper) {
      if (status === "delivered" || status === "completed") {
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#10B981" }]}>Task Complete!</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Time Logged</Text>
                <Text style={styles.infoText}>{Math.floor(taskTimerSeconds / 60)} Mins</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Total Payout</Text>
                <Text style={[styles.infoText, { color: "#10B981", fontWeight: "900" }]}>₹{(currentOrder as any).totalPrice || 0}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>Finish & Return to Home</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // Simplified Helper Dashboard
      const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      const bookedHours = parseFloat(currentOrder.duration || "1") || 1;
      const bookedSeconds = bookedHours * 3600;
      const rawProgress = (taskTimerSeconds / bookedSeconds) * 100;
      const progress = isNaN(rawProgress) ? 0 : Math.min(rawProgress, 100);
      const isOvertime = taskTimerSeconds > bookedSeconds;
      
      const openGoogleDirections = () => {
        if (!pickupStop) return;
        const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${pickupStop.lat},${pickupStop.lng}`;
        const label = 'Customer Location';
        const url = Platform.select({
          ios: `${scheme}${label}@${latLng}`,
          android: `${scheme}${latLng}(${label})`
        });
        if (url) Linking.openURL(url);
      };

      const sendHelperUpdate = (text: string) => {
        socketService.emit("helper_status_update", { orderId: currentOrder.id, text });
        Alert.alert("Update Sent", `Sent "${text}" to the customer.`);
      };

      return (
        <View style={styles.stepContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'center' }}>
            <Ionicons name="time" size={28} color={isOvertime ? "#EF4444" : "#10B981"} />
            <Text style={{ fontSize: 24, fontWeight: '900', color: isOvertime ? "#EF4444" : "#111827", marginLeft: 8 }}>
              {formatTime(taskTimerSeconds)}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 8, overflow: 'hidden', flexDirection: 'row' }}>
            <View style={{ flex: Math.round(progress), backgroundColor: isOvertime ? '#EF4444' : '#10B981' }} />
            <View style={{ flex: Math.max(0, 100 - Math.round(progress)), backgroundColor: 'transparent' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>{isOvertime ? "Overtime" : "Elapsed"}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>{currentOrder.duration || "1"} Hours Booked</Text>
          </View>

          {/* Quick Status Updates */}
          <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Send Quick Update to Customer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {["Heading to you", "Working on task", "Shopping for items", "Running slightly late", "Almost done"].map((updateTxt, idx) => (
              <TouchableOpacity
                key={idx}
                style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#C7D2FE' }}
                onPress={() => sendHelperUpdate(updateTxt)}
              >
                <Text style={{ color: '#4F46E5', fontSize: 13, fontWeight: '600' }}>{updateTxt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#3B82F6', marginBottom: 16 }]} 
            onPress={openGoogleDirections}
          >
            <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Google Directions</Text>
          </TouchableOpacity>

          {/* Verification OTP */}
          <View style={[styles.otpSection, { marginBottom: 20 }]}>
            <Text style={styles.otpLabel}>ENTER CUSTOMER COMPLETION OTP</Text>
            <TextInput
              style={[styles.otpInput, customerOTPError ? styles.otpInputError : null]}
              placeholder="Enter 4-Digit OTP"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              value={customerOTP}
              onChangeText={(val) => {
                setCustomerOTP(val);
                setCustomerOTPError(false);
              }}
            />
            {customerOTPError && (
              <Text style={styles.errorText}>Invalid OTP code. Please ask the customer for their task completion OTP.</Text>
            )}
          </View>

          <TouchableOpacity style={[styles.actionBtn, isOvertime ? { backgroundColor: '#EF4444' } : null]} onPress={handleStatusTransition}>
            <Text style={styles.actionBtnText}>Verify OTP & Complete Task</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isRide) {
      if (status === "accepted" || status === "driver_assigned") {
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Ride Accepted</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoItem}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.infoLabel}>Pickup Rider From</Text>
                    <Text style={styles.infoText}>{currentOrder.customerName || "Rider"}</Text>
                    <Text style={styles.subText}>{pickupStop?.address}</Text>
                  </View>
                  <View style={styles.rideContactActions}>
                    <TouchableOpacity
                      style={styles.roundCommBtn}
                      onPress={() => router.push({ pathname: "/chat", params: { orderId: currentOrder.id } })}
                    >
                      <Ionicons name="chatbubble-ellipses" size={18} color="#00B7EB" />
                      {unreadCount > 0 && (
                        <View style={styles.commBadge}>
                          <Text style={styles.commBadgeText}>{unreadCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.roundCommBtn}
                      onPress={() => Linking.openURL(`tel:${currentOrder.customerPhone || "1234567890"}`)}
                    >
                      <Ionicons name="call" size={18} color="#00B7EB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.roundCommBtn}
                      onPress={openRideNavigation}
                    >
                      <Ionicons name="location" size={18} color="#00B7EB" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Destination Location</Text>
                <Text style={styles.infoText}>{deliveryStop?.locationName || "Destination"}</Text>
                <Text style={styles.subText}>{deliveryStop?.address}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>Start Travel to Pickup</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (status === "en_route_pickup") {
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepTitle}>Travel to User Pickup</Text>
              {isSimulating && <View style={styles.pulseDot} />}
            </View>

            {/* GPS Simulation Panel */}
            <View style={styles.simPanel}>
              <View style={styles.simStatsRow}>
                <View style={styles.simStatItem}>
                  <Text style={styles.simStatLabel}>Speed</Text>
                  <Text style={styles.simStatValue}>{isSimulating ? `${simSpeed} km/h` : "0 km/h"}</Text>
                </View>
                <View style={styles.simStatItem}>
                  <Text style={styles.simStatLabel}>ETA</Text>
                  <Text style={styles.simStatValue}>{isSimulating ? `${simETA} min` : currentOrder.duration}</Text>
                </View>
                <View style={styles.simStatItem}>
                  <Text style={styles.simStatLabel}>Distance</Text>
                  <Text style={styles.simStatValue}>{isSimulating ? `${simRemainingDist} km` : currentOrder.distance}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.simToggleBtn, isSimulating ? styles.simToggleBtnActive : null]}
                onPress={() => pickupStop && startGPSSimulator(pickupStop.lat, pickupStop.lng)}
              >
                <Ionicons name={isSimulating ? "pause" : "navigate"} size={16} color="#fff" />
                <Text style={styles.simToggleText}>{isSimulating ? "Stop GPS Simulator" : "Simulate Travel Coordinates"}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.restaurantName}>User: {currentOrder.customerName || "Customer"}</Text>
                <Text style={styles.addressText}>{pickupStop?.address}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <TouchableOpacity
                  style={styles.roundCommBtn}
                  onPress={() => Linking.openURL(`tel:${currentOrder.customerPhone || "1234567890"}`)}
                >
                  <Ionicons name="call" size={18} color="#00B7EB" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>Arrived at Pickup Location</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (status === "arrived_pickup") {
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Arrived at Pickup</Text>
            
            <View style={styles.gpsVerifiedBox}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.gpsVerifiedTitle}>GPS Check: Arrived</Text>
                <Text style={styles.gpsVerifiedDesc}>You have reached the rider's pickup location.</Text>
              </View>
            </View>

            {/* Verification OTP */}
            <View style={[styles.otpSection, { marginTop: 16, marginBottom: 20 }]}>
              <Text style={styles.otpLabel}>ENTER START RIDE OTP</Text>
              <TextInput
                style={[styles.otpInput, restaurantOTPError ? styles.otpInputError : null]}
                placeholder="Enter 4-digit Ride OTP"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={8}
                value={restaurantOTP}
                onChangeText={(val) => {
                  setRestaurantOTP(val);
                  setRestaurantOTPError(false);
                }}
              />
              {restaurantOTPError && (
                <Text style={styles.errorText}>Invalid OTP code. Please ask the rider for their start ride OTP.</Text>
              )}
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>Start Trip</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (status === "en_route_delivery") {
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepTitle}>Trip In Progress</Text>
              {isSimulating && <View style={styles.pulseDot} />}
            </View>

            {/* GPS Simulation Panel */}
            <View style={styles.simPanel}>
              <View style={styles.simStatsRow}>
                <View style={styles.simStatItem}>
                  <Text style={styles.simStatLabel}>Speed</Text>
                  <Text style={styles.simStatValue}>{isSimulating ? `${simSpeed} km/h` : "0 km/h"}</Text>
                </View>
                <View style={styles.simStatItem}>
                  <Text style={styles.simStatLabel}>ETA</Text>
                  <Text style={styles.simStatValue}>{isSimulating ? `${simETA} min` : "12 min"}</Text>
                </View>
                <View style={styles.simStatItem}>
                  <Text style={styles.simStatLabel}>Distance</Text>
                  <Text style={styles.simStatValue}>{isSimulating ? `${simRemainingDist} km` : "3.1 km"}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.simToggleBtn, isSimulating ? styles.simToggleBtnActive : null]}
                onPress={() => deliveryStop && startGPSSimulator(deliveryStop.lat, deliveryStop.lng)}
              >
                <Ionicons name={isSimulating ? "pause" : "navigate"} size={16} color="#fff" />
                <Text style={styles.simToggleText}>{isSimulating ? "Stop GPS Simulator" : "Simulate Travel Coordinates"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.customerRowInside}>
              <View style={styles.customerAvatarInside}>
                <Text style={styles.customerInitialsInside}>
                  {(currentOrder.customerName || "R").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerNameInside}>{currentOrder.customerName || "Rider"}</Text>
                <Text style={styles.infoLabel}>Heading to destination</Text>
                <Text style={styles.addressText} numberOfLines={1}>{deliveryStop?.address}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>Arrived at Destination</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (status === "arrived_delivery") {
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Confirm Ride Completion</Text>

            <View style={styles.gpsVerifiedBox}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.gpsVerifiedTitle}>GPS Check: Arrived</Text>
                <Text style={styles.gpsVerifiedDesc}>You have reached the rider's destination.</Text>
              </View>
            </View>

            {/* Verification Code */}
            <View style={[styles.otpSection, { marginTop: 16, marginBottom: 20 }]}>
              <Text style={styles.otpLabel}>ENTER END RIDE OTP</Text>
              <TextInput
                style={[styles.otpInput, customerOTPError ? styles.otpInputError : null]}
                placeholder="Enter 4-Digit OTP"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={4}
                value={customerOTP}
                onChangeText={(val) => {
                  setCustomerOTP(val);
                  setCustomerOTPError(false);
                }}
              />
              {customerOTPError && (
                <Text style={styles.errorText}>Invalid OTP code. Please ask the rider for their end ride OTP.</Text>
              )}
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>End Trip & Complete Ride</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (status === "delivered" || status === "completed") {
        return (
          <View style={styles.deliveredScroll}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.successTitle}>Ride Completed!</Text>
              <Text style={styles.successSubtitle}>Earnings have been added to your wallet.</Text>
            </View>

            {/* Payout Breakdown */}
            <View style={styles.earningsBreakdown}>
              <Text style={styles.breakdownHeader}>EARNINGS BREAKDOWN</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base Payout</Text>
                <Text style={styles.breakdownVal}>₹{baseFare.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Distance Fare ({distanceVal} km)</Text>
                <Text style={styles.breakdownVal}>₹{distanceFare.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Surge Bonus</Text>
                <Text style={styles.breakdownVal}>₹{surgeBonus.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tips</Text>
                <Text style={styles.breakdownVal}>₹{customerTip.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>TOTAL PAYOUT</Text>
                <Text style={styles.breakdownTotalVal}>₹{totalEarningsCalculated.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.actionBtn, { marginVertical: 16 }]} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>Finish & Return to Home</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return null;
    }

    if (status === "accepted" || status === "driver_assigned") {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.stepTitleRow}>
            <Text style={[styles.stepTitle, styles.stepTitleInRow]}>Order Accepted</Text>
            <View style={styles.rideContactActions}>
              <TouchableOpacity
                style={styles.roundCommBtn}
                onPress={() => router.push({ pathname: "/chat", params: { orderId: currentOrder.id } })}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#00B7EB" />
                {unreadCount > 0 && (
                  <View style={styles.commBadge}>
                    <Text style={styles.commBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roundCommBtn}
                onPress={() => Linking.openURL(`tel:${currentOrder.vendorPhone || "1234567890"}`)}
              >
                <Ionicons name="call" size={18} color="#00B7EB" />
              </TouchableOpacity>
              {pickupStop?.lat && pickupStop?.lng && (
                <TouchableOpacity
                  style={styles.roundCommBtn}
                  onPress={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${pickupStop.lat},${pickupStop.lng}`;
                    Linking.openURL(url);
                  }}
                >
                  <Ionicons name="location" size={18} color="#00B7EB" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.infoBox}>
            <View style={styles.infoItem}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.infoLabel}>Pickup From</Text>
                  <Text style={styles.infoText}>{currentOrder.vendorName || pickupStop?.locationName || "Restaurant"}</Text>
                  <Text style={styles.subText}>{pickupStop?.address}</Text>
                </View>

              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Deliver To</Text>
              <Text style={styles.infoText}>{currentOrder.customerName || "Customer"}</Text>
              <Text style={styles.subText}>{deliveryStop?.address}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
            <Text style={styles.actionBtnText}>Start Travel to Restaurant</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#EF4444", marginTop: 8 }]} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.actionBtnText}>Cancel Delivery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "en_route_pickup") {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepTitle}>Travel to Restaurant</Text>
            {isSimulating && <View style={styles.pulseDot} />}
          </View>

          {/* GPS Simulation Panel */}
          <View style={styles.simPanel}>
            <View style={styles.simStatsRow}>
              <View style={styles.simStatItem}>
                <Text style={styles.simStatLabel}>Speed</Text>
                <Text style={styles.simStatValue}>{isSimulating ? `${simSpeed} km/h` : "0 km/h"}</Text>
              </View>
              <View style={styles.simStatItem}>
                <Text style={styles.simStatLabel}>ETA</Text>
                <Text style={styles.simStatValue}>{isSimulating ? `${simETA} min` : currentOrder.duration}</Text>
              </View>
              <View style={styles.simStatItem}>
                <Text style={styles.simStatLabel}>Distance</Text>
                <Text style={styles.simStatValue}>{isSimulating ? `${simRemainingDist} km` : currentOrder.distance}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.simToggleBtn, isSimulating ? styles.simToggleBtnActive : null]}
              onPress={() => pickupStop && startGPSSimulator(pickupStop.lat, pickupStop.lng)}
            >
              <Ionicons name={isSimulating ? "pause" : "navigate"} size={16} color="#fff" />
              <Text style={styles.simToggleText}>{isSimulating ? "Stop GPS Simulator" : "Simulate Travel Coordinates"}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.restaurantName}>{currentOrder.vendorName || pickupStop?.locationName || "Restaurant"}</Text>
              <Text style={styles.addressText}>{pickupStop?.address}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity
                style={styles.roundCommBtn}
                onPress={() => Linking.openURL(`tel:${currentOrder.vendorPhone || "1234567890"}`)}
              >
                <Ionicons name="call" size={18} color="#00B7EB" />
              </TouchableOpacity>
              {pickupStop?.lat && pickupStop?.lng && (
                <TouchableOpacity
                  style={styles.roundCommBtn}
                  onPress={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${pickupStop.lat},${pickupStop.lng}`;
                    Linking.openURL(url);
                  }}
                >
                  <Ionicons name="location" size={18} color="#00B7EB" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
            <Text style={styles.actionBtnText}>Arrived at Restaurant</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#EF4444", marginTop: 8 }]} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.actionBtnText}>Cancel Delivery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "arrived_pickup") {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Arrived at Restaurant</Text>
          
          <View style={styles.gpsVerifiedBox}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.gpsVerifiedTitle}>GPS Check: Verified</Text>
              <Text style={styles.gpsVerifiedDesc}>You are within 20 meters of restaurant location.</Text>
            </View>
          </View>

          <View style={styles.waitNotification}>
            <Text style={styles.waitNotifyText}>
              Awaiting restaurant preparation. You will be notified automatically when the restaurant marks the order as prepared and ready for pickup.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#9CA3AF" }]} 
            disabled={true}
          >
            <Text style={styles.actionBtnText}>Waiting for Restaurant...</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#EF4444", marginTop: 8 }]} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.actionBtnText}>Cancel Delivery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "picking_items") {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Wait & Verify Order</Text>

          {/* Timers Panel */}
          <View style={styles.timersGrid}>
            <View style={styles.timerBlock}>
              <Text style={styles.timerBlockLabel}>Prep Status</Text>
              <Text style={styles.timerBlockVal}>
                {prepTimeRemaining > 0
                  ? `${Math.floor(prepTimeRemaining / 60)}:${(prepTimeRemaining % 60).toString().padStart(2, "0")}`
                  : "Food Ready"}
              </Text>
            </View>
            <View style={styles.timerBlock}>
              <Text style={styles.timerBlockLabel}>Waiting Fee Earned</Text>
              <Text style={[styles.timerBlockVal, { color: "#10B981" }]}>+₹{waitingComp.toFixed(2)}</Text>
            </View>
          </View>

          {/* Items Checklist */}
          <View style={styles.checklistScroll}>
            <Text style={styles.checklistHeader}>ITEMS IN ORDER</Text>
            {foodItems.map((item: any, idx: number) => {
              const isChecked = !!checkedItems[item.name];
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.checkRow}
                  onPress={() => setCheckedItems((prev) => ({ ...prev, [item.name]: !isChecked }))}
                >
                  <Feather
                    name={isChecked ? "check-square" : "square"}
                    size={20}
                    color={isChecked ? "#00B7EB" : "#9CA3AF"}
                  />
                  <Text style={[styles.checkText, isChecked ? styles.checkTextSelected : null]}>
                    {item.quantity}x {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.checklistHeader}>PACKAGE SAFETY CHECKS</Text>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setSealedChecked(!sealedChecked)}
            >
              <Feather
                name={sealedChecked ? "check-square" : "square"}
                size={20}
                color={sealedChecked ? "#00B7EB" : "#9CA3AF"}
              />
              <Text style={styles.checkText}>Food package is sealed and tamper-proof</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setCountChecked(!countChecked)}
            >
              <Feather
                name={countChecked ? "check-square" : "square"}
                size={20}
                color={countChecked ? "#00B7EB" : "#9CA3AF"}
              />
              <Text style={styles.checkText}>Verified correct item count against invoice</Text>
            </TouchableOpacity>

            {/* Verification OTP */}
            <View style={styles.otpSection}>
              <Text style={styles.otpLabel}>RESTAURANT PICKUP CODE</Text>
              <TextInput
                style={[styles.otpInput, restaurantOTPError ? styles.otpInputError : null]}
                placeholder="Enter 4-digit Pickup Code"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                autoCapitalize="characters"
                maxLength={8}
                value={restaurantOTP}
                onChangeText={(val) => {
                  setRestaurantOTP(val);
                  setRestaurantOTPError(false);
                }}
              />
              {restaurantOTPError && (
                <Text style={styles.errorText}>Invalid code. Please ask the restaurant for the correct pickup code.</Text>
              )}
            </View>
          </View>

          <View style={styles.pickupActionRow}>
            <TouchableOpacity style={styles.issueBtn} onPress={handleReportIssue}>
              <Ionicons name="warning-outline" size={20} color="#EF4444" />
              <Text style={styles.issueBtnText}>Issue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickupConfirmBtn]} onPress={handleStatusTransition}>
              <Text style={styles.actionBtnText}>Confirm Picked Up</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#EF4444", marginTop: 8 }]} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.actionBtnText}>Cancel Delivery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "en_route_delivery") {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepTitle}>Travel to Customer</Text>
            {isSimulating && <View style={styles.pulseDot} />}
          </View>

          {/* GPS Simulation Panel */}
          <View style={styles.simPanel}>
            <View style={styles.simStatsRow}>
              <View style={styles.simStatItem}>
                <Text style={styles.simStatLabel}>Speed</Text>
                <Text style={styles.simStatValue}>{isSimulating ? `${simSpeed} km/h` : "0 km/h"}</Text>
              </View>
              <View style={styles.simStatItem}>
                <Text style={styles.simStatLabel}>ETA</Text>
                <Text style={styles.simStatValue}>{isSimulating ? `${simETA} min` : "12 min"}</Text>
              </View>
              <View style={styles.simStatItem}>
                <Text style={styles.simStatLabel}>Distance</Text>
                <Text style={styles.simStatValue}>
                  {isSimulating ? `${simRemainingDist} km` : "3.1 km"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.simToggleBtn, isSimulating ? styles.simToggleBtnActive : null]}
              onPress={() => deliveryStop && startGPSSimulator(deliveryStop.lat, deliveryStop.lng)}
            >
              <Ionicons name={isSimulating ? "pause" : "navigate"} size={16} color="#fff" />
              <Text style={styles.simToggleText}>{isSimulating ? "Stop GPS Simulator" : "Simulate Travel Coordinates"}</Text>
            </TouchableOpacity>
          </View>

          {/* Customer Call details */}
          <View style={styles.customerRowInside}>
            <View style={styles.customerAvatarInside}>
              <Text style={styles.customerInitialsInside}>
                {(currentOrder.customerName || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerNameInside}>{currentOrder.customerName || "Customer"}</Text>
              <Text style={styles.customerPhoneInside}>{currentOrder.customerPhone || "..."}</Text>
            </View>
            <View style={styles.communicationBtns}>
              <TouchableOpacity
                style={styles.roundCommBtn}
                onPress={() => Alert.alert("Calling Customer", `Connecting call to ${currentOrder.customerPhone}...`)}
              >
                <Ionicons name="call" size={18} color="#00B7EB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roundCommBtn}
                onPress={() => router.push({ pathname: "/chat", params: { orderId: currentOrder.id } })}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#00B7EB" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
            <Text style={styles.actionBtnText}>Arrived at Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#EF4444", marginTop: 8 }]} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.actionBtnText}>Cancel Delivery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "arrived_delivery") {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Confirm Customer Delivery</Text>

          {/* Delivery Type Option Selector */}
          <View style={styles.optionsBlock}>
            <Text style={styles.blockLabel}>DELIVERY TYPE</Text>
            <View style={styles.optionsRow}>
              {(["door", "gate", "contactless"] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionBtn, deliveryOption === opt ? styles.optionBtnSelected : null]}
                  onPress={() => setDeliveryOption(opt)}
                >
                  <Text style={[styles.optionBtnText, deliveryOption === opt ? styles.optionBtnTextSelected : null]}>
                    {opt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Verification Code */}
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>CUSTOMER CONFIRMATION OTP</Text>
            <TextInput
              style={[styles.otpInput, customerOTPError ? styles.otpInputError : null]}
              placeholder="Enter 4-Digit OTP"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              value={customerOTP}
              onChangeText={(val) => {
                setCustomerOTP(val);
                setCustomerOTPError(false);
              }}
            />
            {customerOTPError && (
              <Text style={styles.errorText}>Invalid OTP code. Please ask the customer for the correct delivery code.</Text>
            )}
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={handleStatusTransition}>
            <Text style={styles.actionBtnText}>Verify OTP & Complete Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#EF4444", marginTop: 8 }]} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.actionBtnText}>Cancel Delivery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "delivered" || status === "completed") {
      return (
        <View style={styles.deliveredScroll}>
          <View style={styles.successHeader}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.successTitle}>Delivery Completed!</Text>
            <Text style={styles.successSubtitle}>Earnings have been added to your wallet.</Text>
          </View>

          {/* Earnings Breakdown */}
          <View style={styles.earningsBreakdown}>
            <Text style={styles.breakdownHeader}>EARNINGS BREAKDOWN</Text>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Base Fare</Text>
              <Text style={styles.breakdownVal}>₹{baseFare.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Distance Fare ({distanceVal} km)</Text>
              <Text style={styles.breakdownVal}>₹{distanceFare.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Surge Incentives</Text>
              <Text style={styles.breakdownVal}>₹{surgeBonus.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Rain Bonus / Weather Surge</Text>
              <Text style={styles.breakdownVal}>₹{rainBonus.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Peak Hour Bonus</Text>
              <Text style={styles.breakdownVal}>₹{peakBonus.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Wait Fee Compensation</Text>
              <Text style={styles.breakdownVal}>₹{waitingComp.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Customer Tip</Text>
              <Text style={styles.breakdownVal}>₹{customerTip.toFixed(2)}</Text>
            </View>

            <View style={styles.breakdownTotalRow}>
              <Text style={styles.breakdownTotalLabel}>TOTAL PAYOUT</Text>
              <Text style={styles.breakdownTotalVal}>₹{totalEarningsCalculated.toFixed(2)}</Text>
            </View>
          </View>

          {/* Feedback & Ratings */}
          <View style={styles.feedbackSection}>
            <Text style={styles.checklistHeader}>RATE YOUR EXPERIENCE</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={28}
                    color="#F59E0B"
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Any operational issues? Write comments here..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={feedback}
              onChangeText={setFeedback}
            />
          </View>

          {/* High demand areas & Heatmaps */}
          <View style={styles.heatmapZones}>
            <Text style={styles.checklistHeader}>HIGH DEMAND ZONES</Text>
            <View style={styles.hotspotItem}>
              <Ionicons name="flame" size={16} color="#00B7EB" />
              <Text style={styles.hotspotText}>Koramangala 5th Block (Surge 1.8x)</Text>
            </View>
            <View style={styles.hotspotItem}>
              <Ionicons name="flame" size={16} color="#00B7EB" />
              <Text style={styles.hotspotText}>Indiranagar 100 Feet Road (Surge 1.5x)</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.actionBtn, { marginVertical: 16 }]} onPress={handleStatusTransition}>
            <Text style={styles.actionBtnText}>Finish & Return to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)")}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isRide ? "Ride Active Task" : (isHelper ? "Helper Active Task" : "Delivery Active Task")}</Text>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: "#EF4444", borderRadius: 16, width: 32, height: 32, alignItems: "center", justifyContent: "center" }]} 
          onPress={handleSOS}
        >
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={false}
          initialRegion={{
            latitude: pickupStop?.lat || 12.9716,
            longitude: pickupStop?.lng || 77.5946,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
        >
          {/* Pickup Stop Marker (User place) */}
          {(pickupStop != null && pickupStop.lat != null && pickupStop.lng != null) ? (
            <Marker coordinate={{ latitude: Number(pickupStop.lat), longitude: Number(pickupStop.lng) }}>
              <View style={styles.userMarkerWrap}>
                <View style={styles.userMarkerBadge}>
                  <Ionicons name="person" size={14} color="#fff" />
                </View>
              </View>
            </Marker>
          ) : null}

          {/* Delivery Stop Marker (Destination) */}
          {(deliveryStop != null && deliveryStop.lat != null && deliveryStop.lng != null) ? (
            <Marker coordinate={{ latitude: Number(deliveryStop.lat), longitude: Number(deliveryStop.lng) }}>
              <View style={styles.redMarkerDot} />
            </Marker>
          ) : null}

          {/* Driver Location Marker */}
          {(driverLocation != null && driverLocation.lat != null && driverLocation.lng != null) ? (
            <Marker 
              coordinate={{ latitude: Number(driverLocation.lat), longitude: Number(driverLocation.lng) }}
              image={VEHICLE_BIKE_3D}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              rotation={driverHeading || 0}
            />
          ) : null}

          {/* Dashed line along the road from driver to customer */}
          {currentOrder.polyline ? (
            <Polyline
              coordinates={decodePolyline(currentOrder.polyline)}
              strokeWidth={4}
              strokeColor="#10B981"
            />
          ) : null}
        </MapView>
      </View>

      <View style={[
        styles.bottomCard, 
        { 
          height: ["picking_items", "arrived_delivery", "delivered", "completed"].includes(currentOrder.status.toLowerCase()) 
            ? height * 0.62 
            : height * 0.46
        }
      ]}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderLabel}>Order ID: {currentOrder.id}</Text>
        </View>

        <ScrollView 
          style={styles.cardScroll} 
          contentContainerStyle={[
            styles.cardScrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 }
          ]} 
          showsVerticalScrollIndicator={false}
        >
          {renderCardContent()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// Utility to decode Google Polyline
function decodePolyline(encoded: string) {
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    const p = {
      latitude: (lat / 1e5),
      longitude: (lng / 1e5),
    };
    poly.push(p);
  }
  return poly;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: moderateScale(17), fontWeight: "700", color: Colors.text },
  headerRightSpacer: { width: 32, height: 32 },
  mapContainer: { flex: 1 },
  userMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  userMarkerBadge: {
    backgroundColor: '#10B981',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  bottomCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    marginTop: -20,
    maxHeight: height * 0.58,
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderLabel: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: "#6B7280",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: moderateScale(6),
  },
  statusPillText: {
    color: "#fff",
    fontSize: moderateScale(10),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badgeTop: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    minWidth: 16,
    height: 16,
    borderRadius: moderateScale(8),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: moderateScale(9),
    fontWeight: "800",
  },
  stepContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 4,
    gap: 16,
  },
  stepTitle: {
    fontSize: moderateScale(20),
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  stepTitleInRow: {
    flex: 1,
    marginBottom: 0,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 16,
  },
  infoItem: {
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#374151",
  },
  subText: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  actionBtn: {
    backgroundColor: "#00B7EB",
    paddingVertical: 15,
    borderRadius: moderateScale(12),
    alignItems: "center",
    elevation: 3,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: moderateScale(15),
    fontWeight: "800",
  },
  simPanel: {
    backgroundColor: "#111827",
    borderRadius: moderateScale(12),
    padding: 12,
    marginBottom: 14,
  },
  simStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  simStatItem: {
    alignItems: "center",
    width: "30%",
  },
  simStatLabel: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  simStatValue: {
    fontSize: moderateScale(15),
    fontWeight: "800",
    color: "#fff",
  },
  simToggleBtn: {
    backgroundColor: "#374151",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: moderateScale(8),
    gap: 8,
  },
  simToggleBtnActive: {
    backgroundColor: "#DC2626",
  },
  simToggleText: {
    color: "#fff",
    fontSize: moderateScale(13),
    fontWeight: "700",
  },
  locationDetails: {
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: moderateScale(15),
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 2,
  },
  addressText: {
    fontSize: moderateScale(13),
    color: "#6B7280",
  },
  gpsVerifiedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 16,
  },
  gpsVerifiedTitle: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#065F46",
  },
  gpsVerifiedDesc: {
    fontSize: moderateScale(12),
    color: "#047857",
    marginTop: 1,
  },
  waitNotification: {
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: moderateScale(12),
    marginBottom: 16,
  },
  waitNotifyText: {
    fontSize: moderateScale(13),
    color: "#4B5563",
    lineHeight: moderateScale(18),
    textAlign: "center",
  },
  timersGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  timerBlock: {
    backgroundColor: "#F9FAFB",
    width: "48%",
    padding: 10,
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  timerBlockLabel: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  timerBlockVal: {
    fontSize: moderateScale(16),
    fontWeight: "800",
    color: "#111827",
  },
  checklistScroll: {
    marginBottom: 12,
  },
  checklistHeader: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  checkText: {
    fontSize: moderateScale(14),
    color: "#374151",
    fontWeight: "600",
    flex: 1,
  },
  checkTextSelected: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  otpSection: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
    marginBottom: 6,
  },
  otpLabel: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
  },
  otpInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: moderateScale(8),
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#111827",
  },
  otpInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#EF4444",
    fontSize: moderateScale(11),
    fontWeight: "600",
    marginTop: 4,
  },
  pickupActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  issueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: moderateScale(12),
    paddingHorizontal: 16,
    width: "28%",
    gap: 4,
  },
  issueBtnText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: moderateScale(13),
  },
  pickupConfirmBtn: {
    flex: 1,
    backgroundColor: "#00B7EB",
    paddingVertical: 14,
    borderRadius: moderateScale(12),
    alignItems: "center",
  },
  customerRowInside: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    gap: 12,
  },
  customerAvatarInside: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#E0F7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  customerInitialsInside: {
    fontSize: moderateScale(16),
    fontWeight: "800",
    color: "#00B7EB",
  },
  customerNameInside: {
    fontSize: moderateScale(14),
    fontWeight: "800",
    color: "#1F2937",
  },
  customerPhoneInside: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    marginTop: 1,
  },
  communicationBtns: {
    flexDirection: "row",
    gap: 8,
  },
  rideContactActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  roundCommBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: "#E0F7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  commBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  commBadgeText: {
    color: "#fff",
    fontSize: moderateScale(9),
    fontWeight: "800",
  },
  optionsBlock: {
    marginBottom: 14,
  },
  blockLabel: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  optionBtn: {
    width: "31%",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: moderateScale(8),
    alignItems: "center",
  },
  optionBtnSelected: {
    borderColor: "#00B7EB",
    backgroundColor: "#E0F7FF",
  },
  optionBtnText: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "#4B5563",
  },
  optionBtnTextSelected: {
    color: "#00B7EB",
  },
  deliveredScroll: {
  },
  successHeader: {
    alignItems: "center",
    marginVertical: 12,
  },
  successTitle: {
    fontSize: moderateScale(18),
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
  },
  successSubtitle: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center",
  },
  earningsBreakdown: {
    backgroundColor: "#F9FAFB",
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 14,
  },
  breakdownHeader: {
    fontSize: moderateScale(11),
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: moderateScale(13),
    color: "#4B5563",
  },
  breakdownVal: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: "#1F2937",
  },
  breakdownTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 10,
    paddingTop: 10,
  },
  breakdownTotalLabel: {
    fontSize: moderateScale(14),
    fontWeight: "800",
    color: "#111827",
  },
  breakdownTotalVal: {
    fontSize: moderateScale(18),
    fontWeight: "800",
    color: "#10B981",
  },
  feedbackSection: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 14,
  },
  ratingStars: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: moderateScale(8),
    padding: 10,
    fontSize: moderateScale(13),
    height: moderateScale(60),
    color: "#111827",
    textAlignVertical: "top",
  },
  heatmapZones: {
    backgroundColor: "#F9FAFB",
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
  },
  hotspotItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  hotspotText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#374151",
  },
});






