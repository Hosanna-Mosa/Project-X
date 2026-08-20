import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { customFetch } from "@/utils/api/custom-fetch";
import { socketService } from "@/utils/socketService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import * as Location from "expo-location";

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const TASK_TYPES = ["Shifting", "Cleaning", "Queue & errands", "Loading"];

type Step = "compose" | "bidding" | "searching" | "assigned";

export default function HelperTaskScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.task;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);
  const { radius } = useLocalSearchParams<{ radius?: string }>();
  const { driver, currentCoords, currentLocation, setOrderId, setDriver, setServiceType } = useDeliveryStore();

  const [step, setStep] = useState<Step>("compose");
  const [taskType, setTaskType] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeField, setActiveField] = useState<"pickup" | "dropoff" | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isPickupValid, setIsPickupValid] = useState(false);
  const [isDropoffValid, setIsDropoffValid] = useState(false);

  const [durationMode, setDurationMode] = useState<"1hr" | "2hr" | "custom">("1hr");
  const [customHours, setCustomHours] = useState(2);
  const [customMinutes, setCustomMinutes] = useState(30);

  const [description, setDescription] = useState("");
  const [offer, setOffer] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [localOrderId, setLocalOrderId] = useState<string | null>(null);
  const [isIncreasingPrice, setIsIncreasingPrice] = useState<number | null>(null);
  const [currentTaskPrice, setCurrentTaskPrice] = useState<number | null>(null);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [totalContacted, setTotalContacted] = useState(0);
  const [startOtp, setStartOtp] = useState<string | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<any>(null);

  const totalHours = durationMode === "1hr" ? 1 : durationMode === "2hr" ? 2 : customHours + customMinutes / 60 || 1;

  // Same client-computed formula as before this pass — flagged, not
  // changed, in the review notes: the backend trusts totals.total verbatim
  // for helper orders with no server-side recalculation.
  const calculatedFare = useMemo(() => {
    if (!pickupCoords) return 0;
    const baseFare = 40;
    const platformFee = 5;
    let distanceCharge = 0;
    if (dropoffCoords) {
      const distanceKm = getDistanceFromLatLonInKm(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
      distanceCharge = Math.round(Math.max(0, distanceKm - 2) * 15);
    }
    const durationCharge = Math.round(totalHours * 80);
    const subtotal = baseFare + distanceCharge + durationCharge + platformFee;
    return subtotal + Math.round(subtotal * 0.05);
  }, [pickupCoords, dropoffCoords, totalHours]);

  const suggestedLow = Math.round(calculatedFare * 0.85 / 5) * 5;
  const suggestedHigh = Math.round(calculatedFare * 1.15 / 5) * 5;

  React.useEffect(() => {
    let interval: any;
    if (step === "searching" && localOrderId) {
      const fetchStatus = async () => {
        try {
          const orderData = await customFetch<any>(`/api/v1/orders/${localOrderId}`);
          if (orderData) {
            setRejectedCount(orderData.declineReasons ? orderData.declineReasons.length : 0);
            setTotalContacted(orderData.totalCandidatesCount || 0);
            if (orderData.customerPrice) setCurrentTaskPrice(orderData.customerPrice);
            else if (orderData.totalPrice) setCurrentTaskPrice(orderData.totalPrice);
            if (orderData.restaurantPickupCode) setStartOtp(orderData.restaurantPickupCode);
            if ((orderData.status === "DRIVER_ASSIGNED" || orderData.status === "accepted") && orderData.driver) {
              setDriver(orderData.driver);
              setAssignedDriver(orderData.driver);
              setStep("assigned");
            }
          }
        } catch (err) {
          console.warn("Error polling order status:", err);
        }
      };
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [step, localOrderId]);

  const handleUseCurrentLocation = async () => {
    try {
      const storeLocation = useDeliveryStore.getState().currentLocation;
      const storeCoords = useDeliveryStore.getState().currentCoords;
      if (storeLocation && storeCoords?.lat && storeCoords?.lng) {
        setPickupLocation(storeLocation);
        setPickupCoords(storeCoords);
        setIsPickupValid(true);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Please enable location services to find your current location.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
      setPickupCoords(coords);
      const [address] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
      if (address) {
        const formatted = [address.name, address.street, address.district || address.subregion, address.city, address.region, address.postalCode]
          .filter(Boolean)
          .join(", ");
        setPickupLocation(formatted);
        setIsPickupValid(true);
      }
    } catch (error) {
      console.warn("Helper task: GPS fetch failed:", error);
      Alert.alert("Error", "Could not fetch your current location. Please type it manually.");
    }
  };

  const handleSearch = async (text: string, type: "pickup" | "dropoff") => {
    if (type === "pickup") { setPickupLocation(text); setIsPickupValid(false); }
    else { setDropoffLocation(text); setIsDropoffValid(false); }
    setActiveField(type);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    try {
      const data = await customFetch<any[]>(`/api/v1/places/autocomplete?input=${encodeURIComponent(text)}`, { responseType: "json" });
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    }
  };

  const selectResult = async (result: any) => {
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      if (Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lng))) {
        lat = Number(result.lat);
        lng = Number(result.lng);
      } else if (result.id) {
        const details = await customFetch<{ lat: number; lng: number }>(`/api/v1/places/details/${result.id}`);
        if (details?.lat) { lat = details.lat; lng = details.lng; }
      }
      if (currentCoords && radius && lat !== null && lng !== null) {
        const distance = getDistanceFromLatLonInKm(currentCoords.lat, currentCoords.lng, lat, lng);
        if (distance > parseFloat(radius)) {
          Alert.alert("Out of range", `This location is outside your selected ${radius}km radius.`);
          setSearchResults([]);
          setActiveField(null);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch/validate place details:", e);
    }
    const address = result.description || result.name || result.address || "";
    if (activeField === "pickup") {
      setPickupLocation(address);
      if (lat !== null && lng !== null) setPickupCoords({ lat, lng });
      setIsPickupValid(true);
    } else if (activeField === "dropoff") {
      setDropoffLocation(address);
      if (lat !== null && lng !== null) setDropoffCoords({ lat, lng });
      setIsDropoffValid(true);
    }
    setSearchResults([]);
    setActiveField(null);
  };

  const handleIncreasePrice = async (amount: number) => {
    if (!localOrderId) return;
    setIsIncreasingPrice(amount);
    try {
      const updatedOrder = await customFetch<any>(`/api/v1/orders/${localOrderId}/increase-price`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      });
      if (updatedOrder?.customerPrice) setCurrentTaskPrice(updatedOrder.customerPrice);
      else if (updatedOrder?.totalPrice) setCurrentTaskPrice(updatedOrder.totalPrice);
    } catch {
      Alert.alert("Error", "Failed to increase task price.");
    } finally {
      setIsIncreasingPrice(null);
    }
  };

  const handleCancel = () => {
    Alert.alert("Cancel this task?", "This can't be undone.", [
      { text: "Keep task", style: "cancel" },
      {
        text: "Cancel task",
        style: "destructive",
        onPress: async () => {
          if (localOrderId) {
            try {
              await customFetch(`/api/v1/orders/${localOrderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
            } catch (error) {
              console.warn("Failed to cancel order on backend", error);
            }
          }
          setStep("compose");
          setAssignedDriver(null);
          setOrderId(null);
          setLocalOrderId(null);
        },
      },
    ]);
  };

  const goToBidding = () => {
    if (!isPickupValid || !pickupCoords?.lat) {
      Alert.alert("Missing details", "Please select a valid pickup location.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing details", "Please provide a brief description of the work.");
      return;
    }
    setOffer((prev) => prev ?? calculatedFare);
    setStep("bidding");
  };

  const createTask = async () => {
    const finalOffer = offer ?? calculatedFare;
    setIsCreating(true);
    setStep("searching");
    setCurrentTaskPrice(finalOffer);
    try {
      const stops: any[] = [
        { sequence: 1, type: "pickup", address: pickupLocation, lat: pickupCoords?.lat, lng: pickupCoords?.lng, instructions: description },
      ];
      if (isDropoffValid && dropoffCoords?.lat) {
        stops.push({ sequence: 2, type: "drop", address: dropoffLocation, lat: dropoffCoords?.lat, lng: dropoffCoords?.lng });
      }
      const order = await customFetch<{ _id: string; customerPrice?: number; totalPrice?: number }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({ serviceType: "helper", stops, duration: totalHours, totals: { total: finalOffer } }),
      });
      if (!order?._id) throw new Error("Invalid response from server. No order ID returned.");
      setOrderId(order._id);
      setLocalOrderId(order._id);
      setCurrentTaskPrice(order.customerPrice || order.totalPrice || finalOffer);
      socketService.trackOrder(order._id);

      const handleOrderAccepted = (data: any) => {
        if (data.driver) { setDriver(data.driver); setAssignedDriver(data.driver); }
        setServiceType("helper");
        if (data.orderId || order._id) { setOrderId(data.orderId || order._id); setLocalOrderId(data.orderId || order._id); }
        socketService.off("order_accepted", handleOrderAccepted);
        socketService.off("order_status_update", handleOrderStatus);
        setStep("assigned");
      };
      const handleOrderStatus = (data: any) => {
        if (["DRIVER_ASSIGNED", "driver_assigned", "accepted"].includes(data.status)) handleOrderAccepted(data);
      };
      socketService.on("order_accepted", handleOrderAccepted);
      socketService.on("order_status_update", handleOrderStatus);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create task");
      setStep("bidding");
    } finally {
      setIsCreating(false);
    }
  };

  const isProceedDisabled = !isPickupValid || description.trim().length === 0;
  const activeDriver = assignedDriver || driver;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => (step === "compose" ? router.back() : setStep("compose"))}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === "compose" ? "Hire a helper" : step === "bidding" ? "Your offer" : step === "searching" ? "Finding a helper" : "Task assigned"}
        </Text>
      </View>

      {step === "compose" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.headline}>What do you need?</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {TASK_TYPES.map((t) => {
                const isSelected = taskType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, isSelected && { backgroundColor: accent.accent, borderColor: accent.accent }]}
                    onPress={() => setTaskType(isSelected ? null : t)}
                  >
                    <Text style={[styles.typeChipText, isSelected && { color: accent.on }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.section}>
              <View style={styles.locationCard}>
                <View style={styles.railCol}>
                  <View style={styles.pickupDot} />
                  <View style={styles.railLine} />
                  <View style={styles.dropSquare} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
                  <View>
                    <Text style={styles.fieldLabel}>Where the work starts</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.input}
                        placeholder="Pickup location"
                        placeholderTextColor={tokens.muted}
                        value={pickupLocation}
                        onChangeText={(t) => handleSearch(t, "pickup")}
                        onFocus={() => setActiveField("pickup")}
                      />
                      <TouchableOpacity onPress={handleUseCurrentLocation}>
                        <Ionicons name="locate" size={moderateScale(18)} color={accent.accent} />
                      </TouchableOpacity>
                    </View>
                    {activeField === "pickup" && searchResults.length > 0 && (
                      <View style={styles.dropdown}>
                        {searchResults.map((r, i) => (
                          <TouchableOpacity key={r.id || i} style={styles.dropdownRow} onPress={() => selectResult(r)}>
                            <Ionicons name="location-outline" size={15} color={tokens.sec} />
                            <Text style={styles.dropdownText} numberOfLines={1}>{r.description || r.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={{ height: 1, backgroundColor: tokens.border }} />
                  <View>
                    <Text style={styles.fieldLabel}>Where it ends</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.input}
                        placeholder="Drop-off (optional)"
                        placeholderTextColor={tokens.muted}
                        value={dropoffLocation}
                        onChangeText={(t) => handleSearch(t, "dropoff")}
                        onFocus={() => setActiveField("dropoff")}
                      />
                    </View>
                    {activeField === "dropoff" && searchResults.length > 0 && (
                      <View style={styles.dropdown}>
                        {searchResults.map((r, i) => (
                          <TouchableOpacity key={r.id || i} style={styles.dropdownRow} onPress={() => selectResult(r)}>
                            <Ionicons name="location-outline" size={15} color={tokens.sec} />
                            <Text style={styles.dropdownText} numberOfLines={1}>{r.description || r.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Time required</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={styles.timeStepper}>
                  <TouchableOpacity onPress={() => { setDurationMode("custom"); setCustomHours((h) => Math.max(0, h - 1)); }}>
                    <Text style={styles.stepperSign}>−</Text>
                  </TouchableOpacity>
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.stepperValue}>{durationMode === "1hr" ? 1 : durationMode === "2hr" ? 2 : customHours}</Text>
                    <Text style={styles.stepperUnit}>hours</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setDurationMode("custom"); setCustomHours((h) => h + 1); }}>
                    <Text style={styles.stepperSign}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.timeStepper}>
                  <TouchableOpacity onPress={() => { setDurationMode("custom"); setCustomMinutes((m) => (m === 0 ? 45 : m - 15)); }}>
                    <Text style={styles.stepperSign}>−</Text>
                  </TouchableOpacity>
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.stepperValue}>{durationMode === "1hr" ? 0 : durationMode === "2hr" ? 0 : customMinutes}</Text>
                    <Text style={styles.stepperUnit}>minutes</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setDurationMode("custom"); setCustomMinutes((m) => (m === 45 ? 0 : m + 15)); }}>
                    <Text style={styles.stepperSign}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Task description</Text>
              <View style={styles.descBox}>
                <TextInput
                  style={styles.descInput}
                  placeholder="Two people to carry a 3-seater sofa and 4 cartons down from the 4th floor. No lift after 8 PM."
                  placeholderTextColor={tokens.muted}
                  multiline
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
              <Text style={styles.descHint}>Helpers see this before they bid. Mention stairs, weight and anything heavy.</Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            {calculatedFare > 0 && (
              <View style={styles.suggestedRow}>
                <Text style={styles.suggestedLabel}>Suggested offer</Text>
                <Text style={styles.suggestedValue}>₹{suggestedLow} – ₹{suggestedHigh}</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.primaryBtn, isProceedDisabled && { opacity: 0.5 }]} disabled={isProceedDisabled} onPress={goToBidding}>
              <Text style={styles.primaryBtnText}>Set your offer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {step === "bidding" && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.offerBlock}>
              <Text style={styles.offerEyebrow}>Current offer</Text>
              <Text style={styles.offerAmount}>₹{offer ?? calculatedFare}</Text>
              <Text style={styles.offerSub}>
                for {Math.floor(totalHours)}h {Math.round((totalHours % 1) * 60)}m · about ₹{Math.round((offer ?? calculatedFare) / totalHours)}/hour
              </Text>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity style={styles.offerStepBtn} onPress={() => setOffer((o) => Math.max(0, (o ?? calculatedFare) - 20))}>
                  <Text style={styles.offerStepBtnText}>−</Text>
                </TouchableOpacity>
                <View style={styles.offerStepsMid}>
                  <Text style={styles.offerStepsMidText}>₹20 steps</Text>
                </View>
                <TouchableOpacity style={[styles.offerStepBtn, { backgroundColor: accent.accent, borderWidth: 0 }]} onPress={() => setOffer((o) => (o ?? calculatedFare) + 20)}>
                  <Text style={[styles.offerStepBtnText, { color: accent.on }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <Text style={styles.helperCountNote}>Your offer is visible to nearby helpers once you tap Find a helper.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={createTask} disabled={isCreating}>
              <Text style={styles.primaryBtnText}>Find a helper · ₹{offer ?? calculatedFare}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === "searching" && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16, paddingTop: 8 }}>
            <View style={styles.titleRow}>
              <View style={styles.spinner} />
              <Text style={styles.matchingTitle}>Finding a helper</Text>
            </View>
            <Text style={styles.subtitle}>Matching you with helpers nearby.</Text>

            <View style={{ gap: 12, marginTop: 18 }}>
              <View style={styles.checkRow}>
                <View style={styles.checkDone}><Ionicons name="checkmark" size={13} color={accent.on} /></View>
                <Text style={styles.checkText}>Task published · ₹{currentTaskPrice ?? offer ?? calculatedFare}</Text>
              </View>
              {totalContacted > 0 && (
                <View style={styles.checkRow}>
                  <View style={styles.checkDone}><Ionicons name="checkmark" size={13} color={accent.on} /></View>
                  <Text style={styles.checkText}>{totalContacted} helpers notified</Text>
                </View>
              )}
              <View style={styles.checkRow}>
                <View style={styles.checkPending} />
                <Text style={[styles.checkText, { color: accent.accent }]}>Waiting for the first acceptance</Text>
              </View>
            </View>

            {totalContacted > 0 && rejectedCount > 0 && (
              <View style={styles.declineNote}>
                <Text style={styles.declineNoteText}>{rejectedCount} of {totalContacted} contacted helpers have passed so far — consider raising your offer.</Text>
              </View>
            )}

            <View style={{ marginTop: 22 }}>
              <Text style={styles.sectionLabel}>Attract helpers faster</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {[10, 20, 30, 40, 50].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.raiseChip}
                    onPress={() => handleIncreasePrice(amount)}
                    disabled={isIncreasingPrice === amount}
                  >
                    <Text style={styles.raiseChipText}>+₹{amount}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel task</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === "assigned" && activeDriver && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }}>
            {startOtp && (
              <View style={styles.otpCard}>
                <Text style={styles.otpLabel}>Share this OTP to start</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  {String(startOtp).split("").map((digit, i) => (
                    <View key={i} style={styles.otpDigit}><Text style={styles.otpDigitText}>{digit}</Text></View>
                  ))}
                </View>
                <Text style={styles.otpHint}>Don't share this code before the helper arrives.</Text>
              </View>
            )}

            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}><Ionicons name="person" size={22} color={tokens.sec} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.driverName}>{activeDriver.name || "Helper"}</Text>
                <Text style={styles.driverMeta}>{activeDriver.vehicle || activeDriver.vehicleType || "On the way"}</Text>
              </View>
              {(currentTaskPrice ?? offer) != null && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.driverPrice}>₹{currentTaskPrice ?? offer}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginVertical: 14 }}>
              <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${activeDriver.phone || ""}`)}>
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageBtn} onPress={() => router.push("/chat")}>
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
            </View>

            {(pickupLocation || dropoffLocation) && (
              <View style={styles.routeCard}>
                <View style={styles.railColSmall}>
                  <View style={styles.pickupDotSmall} />
                  <View style={styles.railLine} />
                  <View style={styles.dropSquareSmall} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
                  <Text style={styles.routeAddr} numberOfLines={1}>{pickupLocation}</Text>
                  <Text style={styles.routeAddr} numberOfLines={1}>{dropoffLocation || "—"}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel task</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["task"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
    iconBtn: {
      width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20),
      backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    headline: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(28), lineHeight: moderateScale(31), letterSpacing: -0.5, color: tokens.text, paddingHorizontal: 16, marginTop: 4 },
    typeRow: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
    typeChip: { borderWidth: 1, borderColor: tokens.borderStrong, backgroundColor: tokens.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    typeChipText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec },

    section: { paddingHorizontal: 16, paddingTop: 20 },
    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 10 },

    locationCard: { flexDirection: "row", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 14 },
    railCol: { width: 14, alignItems: "center", paddingTop: 14 },
    pickupDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: accent.accent },
    dropSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: tokens.text },
    railLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: tokens.borderStrong, marginVertical: 4 },
    fieldLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
    input: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text, paddingVertical: 4 },
    dropdown: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, marginTop: 6, overflow: "hidden" },
    dropdownRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: tokens.border },
    dropdownText: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },

    timeStepper: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: tokens.surface,
      borderWidth: 1, borderColor: tokens.border, borderRadius: 14, paddingHorizontal: 14, minHeight: 56,
    },
    stepperSign: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(18), color: accent.accent },
    stepperValue: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.3, color: tokens.text },
    stepperUnit: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: tokens.sec },

    descBox: { borderWidth: 2, borderColor: accent.accent, borderRadius: 14, backgroundColor: tokens.surface, padding: 14, minHeight: 104 },
    descInput: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.text, minHeight: 76 },
    descHint: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 8 },

    footer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, borderTopWidth: 1, borderTopColor: tokens.border, backgroundColor: tokens.surface },
    suggestedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
    suggestedLabel: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.sec },
    suggestedValue: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    primaryBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    primaryBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },

    offerBlock: { alignItems: "center", paddingHorizontal: 16, paddingTop: 24 },
    offerEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: accent.accent },
    offerAmount: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(52), lineHeight: moderateScale(54), letterSpacing: -0.8, color: tokens.text, marginTop: 8 },
    offerSub: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 8 },
    offerStepBtn: { width: moderateScale(56), height: moderateScale(56), borderRadius: 18, borderWidth: 1, borderColor: tokens.borderStrong, backgroundColor: tokens.surface, alignItems: "center", justifyContent: "center" },
    offerStepBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(22), color: tokens.text },
    offerStepsMid: { flex: 1, height: moderateScale(56), borderRadius: 18, backgroundColor: accent.skin, borderWidth: 1, borderColor: accent.accent, alignItems: "center", justifyContent: "center" },
    offerStepsMidText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: accent.accent },
    helperCountNote: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), color: tokens.sec, marginBottom: 10, textAlign: "center" },

    titleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
    spinner: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: accent.accent, borderTopColor: "transparent" },
    matchingTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), letterSpacing: -0.2, color: tokens.text },
    subtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.sec, marginTop: 10 },
    checkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    checkDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: accent.accent, alignItems: "center", justifyContent: "center" },
    checkPending: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: accent.accent },
    checkText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },
    declineNote: { marginTop: 16, backgroundColor: tokens.warningSkin, borderRadius: 12, padding: 12 },
    declineNoteText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec },
    raiseChip: { borderWidth: 1, borderColor: accent.accent, backgroundColor: accent.skin, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
    raiseChipText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.accent },

    cancelBtn: { borderWidth: 1, borderColor: tokens.error, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    cancelBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.error },

    otpCard: { backgroundColor: accent.skin, borderWidth: 1, borderColor: accent.accent, borderRadius: 16, padding: 14, marginTop: 8, marginBottom: 14 },
    otpLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: accent.accent },
    otpDigit: { flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: accent.accent, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
    otpDigitText: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), color: tokens.text },
    otpHint: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 10 },

    driverRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: tokens.border },
    driverAvatar: { width: 56, height: 56, borderRadius: 999, backgroundColor: tokens.sunken, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    driverName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), letterSpacing: -0.1, color: tokens.text },
    driverMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 3 },
    driverPrice: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(20), letterSpacing: -0.3, color: tokens.text },

    callBtn: { flex: 1, backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    callBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.on },
    messageBtn: { flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 14, minHeight: moderateScale(48), alignItems: "center", justifyContent: "center" },
    messageBtnText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(14), color: tokens.text },

    routeCard: { flexDirection: "row", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 13 },
    railColSmall: { width: 12, alignItems: "center", paddingTop: 5 },
    pickupDotSmall: { width: 9, height: 9, borderRadius: 5, borderWidth: 2.5, borderColor: accent.accent },
    dropSquareSmall: { width: 9, height: 9, borderRadius: 2, backgroundColor: tokens.text },
    routeAddr: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(14), color: tokens.text },
  });
