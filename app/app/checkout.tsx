import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore } from "@/contexts/cartStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { LocationPickerSheet } from "@/components/LocationPickerSheet";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { socketService } from "@/utils/socketService";
import MapView, { Marker } from "react-native-maps";
import { Modal } from "react-native";

const DELIVERY_FEE_ORIGINAL = 199;
const DELIVERY_FEE = 39; 
const TAXES_AND_FEES = 85;
const SERVICE_FEE = 49;
const DISCOUNT = 160;

const getMockCustomization = (itemName: string) => {
  if (itemName.toLowerCase().includes("pancake")) {
    return "Pancakes, Bacon, Coffee - Medium, Hash Brown Sticks";
  }
  if (itemName.toLowerCase().includes("burger")) {
    return "Small Bun (4\"), Two Small Beef Patties, Tomato, Lettuce, Pickles, Diced Onions, Mustard";
  }
  return "Standard preparation";
};

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { vendorName } = useLocalSearchParams();
  const { getItemCount, vendorId, items, getTotalPrice, clearCart } = useCartStore();
  const { user, token } = useAuthStore();
  const { setOrderId, setStatus, setServiceType } = useDeliveryStore();
  
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<any>(null);
  const [selectedTip, setSelectedTip] = React.useState<number>(100);
  const [isOtherTip, setIsOtherTip] = React.useState(false);
  const [otherTipValue, setOtherTipValue] = React.useState("");
  const [fetchedVendorName, setFetchedVendorName] = React.useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = React.useState<"standard" | "scheduled">("standard");
  const [scheduledTime, setScheduledTime] = React.useState<string | null>(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = React.useState(false);
  const [dropOffOption, setDropOffOption] = React.useState("Leave at door");
  const [isDropOffPickerOpen, setIsDropOffPickerOpen] = React.useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  
  const [customSelectedDate, setCustomSelectedDate] = React.useState("Today");
  const [customSelectedHour, setCustomSelectedHour] = React.useState("12");
  const [customSelectedMinute, setCustomSelectedMinute] = React.useState("00");
  const [customSelectedAmPm, setCustomSelectedAmPm] = React.useState("PM");

  const handleCustomTimeApply = () => {
    const formatted = `${customSelectedDate}, ${customSelectedHour}:${customSelectedMinute} ${customSelectedAmPm}`;
    setScheduledTime(formatted);
    setDeliveryMode("scheduled");
    setShowDatePicker(false);
    setIsTimePickerOpen(false);
  };

  React.useEffect(() => {
    if (vendorId) {
      customFetch<any>(`/api/v1/vendors/${vendorId}`)
        .then(v => {
          if (v && v.name) setFetchedVendorName(v.name);
        })
        .catch(() => {});
    }
  }, [vendorId]);

  const displayVendorName = vendorName ? String(vendorName) : (fetchedVendorName || "Restaurant");

  const subtotal = getTotalPrice();
  const baseTotal = Math.round((subtotal + TAXES_AND_FEES + DELIVERY_FEE + SERVICE_FEE - DISCOUNT) * 100) / 100;
  const originalTotal = Math.round((subtotal + TAXES_AND_FEES + DELIVERY_FEE_ORIGINAL + SERVICE_FEE + selectedTip) * 100) / 100;
  const finalTotal = baseTotal + selectedTip;

  const userId = React.useMemo(() => String(user?.id || user?._id || ""), [user?.id, user?._id]);
  const hasValidAddress = Boolean(selectedAddress?.addressLine && selectedAddress?.phone);

  const dropLat = Number(selectedAddress?.coordinates?.lat ?? selectedAddress?.location?.coordinates?.[1] ?? 17.0005);
  const dropLng = Number(selectedAddress?.coordinates?.lng ?? selectedAddress?.location?.coordinates?.[0] ?? 81.804);

  React.useEffect(() => {
    if (!userId) return;
    socketService.connect();
    socketService.emit("join", { userId, role: "USER" });
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          const activeStr = await AsyncStorage.getItem("active_address");
          if (activeStr) {
            setSelectedAddress(JSON.parse(activeStr));
          }
        } catch (e) {
          console.error("Failed to load active address:", e);
        }
      })();
    }, [])
  );

  const placeOrder = async () => {
    if (getItemCount() === 0) {
      Alert.alert("Cart is empty", "Please add at least one item.");
      return;
    }
    if (!user || !token) {
      Alert.alert("Login required", "Please log in before placing your order.");
      router.push("/login");
      return;
    }
    if (!hasValidAddress) {
      Alert.alert("Address required", "Please select a delivery address with a contact number.");
      return;
    }
    if (!vendorId) {
      Alert.alert("Restaurant missing", "Please choose a restaurant again.");
      return;
    }

    const deliveryAddressObj = {
      label: selectedAddress.label || "",
      addressLine: selectedAddress.addressLine,
      phone: selectedAddress.phone || "",
      receiverName: selectedAddress.receiverName || "",
      formattedAddress: selectedAddress.addressLine,
    };

    setIsPlacingOrder(true);
    try {
      let vendor: { name?: string; address?: string; location?: { coordinates?: number[] } } | null = null;
      try {
        vendor = await customFetch<any>(`/api/v1/vendors/${vendorId}`);
      } catch {
        // Fallback
      }

      const vendorCoords = vendor?.location?.coordinates;
      const pickupLng = Number(vendorCoords?.[0] ?? dropLng + 0.004);
      const pickupLat = Number(vendorCoords?.[1] ?? dropLat + 0.004);
      
      const orderItems = items.map((item) => ({
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      }));

      const order = await customFetch<{ _id?: string; id?: string }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          serviceType: "delivery",
          vendorId,
          totals: { subtotal, taxes: TAXES_AND_FEES, deliveryFee: DELIVERY_FEE, total: finalTotal, tip: selectedTip },
          scheduledDelivery: deliveryMode === "scheduled" && scheduledTime ? { type: "scheduled", time: scheduledTime } : { type: "now" },
          stops: [
            {
              id: "vendor-pickup",
              address: vendor?.address || "Restaurant pickup",
              storeName: vendor?.name || "Restaurant",
              latitude: pickupLat,
              longitude: pickupLng,
              type: "pickup",
              items: [],
            },
            {
              id: "customer-drop",
              address: deliveryAddressObj.formattedAddress,
              deliveryAddress: deliveryAddressObj,
              latitude: dropLat,
              longitude: dropLng,
              type: "drop",
              items: orderItems,
            },
          ],
        }),
      });

      const finalOrderId = order._id || order.id;
      if (!finalOrderId) throw new Error("Order was created but no order ID was returned.");

      setOrderId(finalOrderId);
      setServiceType("delivery");
      setStatus("pending");
      clearCart();

      router.replace({
        pathname: "/finding-driver",
        params: { orderId: finalOrderId },
      });
    } catch (error: any) {
      Alert.alert("Order failed", error.message || "Unable to place your order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Header Layout */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>Checkout</Text>
          <Text style={styles.headerTitle}>{displayVendorName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.divider} />

        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.addressSectionTitle}>Address details</Text>
          
          <View style={styles.addressCardDoorDash}>
            {/* Map Preview Area */}
            <View style={{ position: "relative", zIndex: 10 }}>
              {hasValidAddress ? (
                <View pointerEvents="none" style={styles.mapPreviewArea}>
                  <MapView 
                    style={StyleSheet.absoluteFillObject}
                    initialRegion={{
                      latitude: dropLat,
                      longitude: dropLng,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    showsUserLocation={false}
                    showsPointsOfInterest={false}
                    showsCompass={false}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    <Marker coordinate={{ latitude: dropLat, longitude: dropLng }} />
                  </MapView>
                </View>
              ) : (
                <View style={styles.mapPreviewArea}>
                  <View style={styles.mapPinShadow} />
                  <View style={styles.mapPreviewBg}>
                    <Ionicons name="location" size={24} color="#ffffff" />
                  </View>
                </View>
              )}
              <View style={styles.adjustPinContainer}>
                <TouchableOpacity style={styles.adjustPinBtn} onPress={() => setIsAddressSheetOpen(true)}>
                  <Text style={styles.adjustPinText}>Adjust pin</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Address Row */}
            <TouchableOpacity 
              style={styles.ddAddressRow}
              onPress={() => router.push("/delivery/saved-addresses")}
            >
              <Ionicons name="location-outline" size={24} color="#000000" />
              <View style={styles.ddAddressInfo}>
                <Text style={styles.ddAddressLine1} numberOfLines={1}>
                  {selectedAddress ? selectedAddress.addressLine?.split(',')[0] : "Select delivery address"}
                </Text>
                {selectedAddress && (
                  <Text style={styles.ddAddressLine2} numberOfLines={1}>
                    {selectedAddress.addressLine?.substring(selectedAddress.addressLine.indexOf(',') + 1).trim()}
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={20} color="#000000" />
            </TouchableOpacity>

            {/* Warning Box */}
            <View style={styles.ddWarningBox}>
              <View style={styles.ddWarningHeader}>
                <Ionicons name="warning-outline" size={20} color="#a16207" />
                <Text style={styles.ddWarningText}>
                  Adding apartment number and drop-off details will help Dashers efficiently deliver your order.
                </Text>
              </View>
              <TouchableOpacity style={styles.ddEditAddressBtn} onPress={() => router.push("/delivery/saved-addresses")}>
                <Text style={styles.ddEditAddressText}>Edit address</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ddSeparator} />

            {/* Drop-off Option */}
            <TouchableOpacity 
              style={styles.ddActionRow}
              onPress={() => setIsDropOffPickerOpen(true)}
            >
              <Feather name={dropOffOption === "Leave at door" ? "package" : "user"} size={20} color="#000000" />
              <View style={styles.ddActionInfo}>
                <Text style={styles.ddActionTitle}>{dropOffOption}</Text>
                <Text style={styles.ddActionSubtitle} numberOfLines={1}>
                  {dropOffOption === "Leave at door" ? "Please call me when you pick o..." : "Meet at the door"}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#000000" />
            </TouchableOpacity>

            <View style={styles.ddSeparator} />

            {/* Phone */}
            <TouchableOpacity style={styles.ddActionRow}>
              <Feather name="phone" size={20} color="#000000" />
              <View style={styles.ddActionInfo}>
                <Text style={styles.ddActionTitle}>
                  {selectedAddress?.phone || "Add phone number"}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.thickDivider} />

        {/* Delivery Time Section */}
        <View style={styles.section}>
          <Text style={styles.addressSectionTitle}>delivery time</Text>
          
          <View style={styles.addressCardDoorDash}>
            {/* Standard */}
            <TouchableOpacity 
              style={styles.ddActionRow} 
              onPress={() => setDeliveryMode("standard")}
            >
              <View style={[styles.ddActionInfo, { marginLeft: 0 }]}>
                <Text style={[styles.ddActionTitle, { color: deliveryMode === "standard" ? "#000000" : "#a1a1aa", fontWeight: "700" }]}>Standard</Text>
                <Text style={[styles.ddActionSubtitle, { color: deliveryMode === "standard" ? "#000000" : "#a1a1aa", fontWeight: "600" }]}>15-25 min</Text>
              </View>
              <View style={[styles.radioOuter, { borderColor: deliveryMode === "standard" ? "#000000" : "#d4d4d8" }]}>
                {deliveryMode === "standard" && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

            <View style={[styles.ddSeparator, { marginLeft: 16 }]} />

            {/* Schedule Ahead */}
            <TouchableOpacity 
              style={styles.ddActionRow}
              onPress={() => setIsTimePickerOpen(true)}
            >
              <View style={[styles.ddActionInfo, { marginLeft: 0 }]}>
                <Text style={[styles.ddActionTitle, { color: deliveryMode === "scheduled" ? "#000000" : "#a1a1aa", fontWeight: "700" }]}>Schedule Ahead</Text>
                <Text style={[styles.ddActionSubtitle, { color: deliveryMode === "scheduled" ? "#000000" : "#a1a1aa", fontWeight: "600" }]}>
                  {scheduledTime || "Choose a time"}
                </Text>
              </View>
              {deliveryMode === "scheduled" ? (
                <View style={[styles.radioOuter, { borderColor: "#000000" }]}>
                  <View style={styles.radioInner} />
                </View>
              ) : (
                <Feather name="chevron-right" size={20} color="#a1a1aa" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.thickDivider} />

        {/* Cart Summary List */}
        <View style={styles.section}>
          <View style={styles.cartSummaryHeaderRow}>
            <Feather name="shopping-cart" size={20} color="#000000" />
            <Text style={styles.cartSummaryTitle}>Cart Summary</Text>
            <View style={{ flex: 1 }} />
            <Feather name="chevron-up" size={20} color="#000000" />
          </View>
          <Text style={styles.cartSummarySubtitle}>
            {displayVendorName} • {items.length} items
          </Text>

          <View style={styles.itemsListContainer}>
            {items.map((item, index) => (
              <View key={item._id} style={styles.itemRow}>
                <Text style={styles.itemQty}>{item.quantity} x </Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCustomization}>{getMockCustomization(item.name)}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.thickDivider} />

        {/* Order Summary Card */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryTitle}>Summary</Text>
          </View>
          
          <TouchableOpacity style={styles.dealsRow}>
            <Ionicons name="pricetag-outline" size={20} color="#000000" />
            <Text style={styles.dealsText}>Deals</Text>
            <View style={{ flex: 1 }} />
            <Feather name="chevron-right" size={20} color="#000000" />
          </TouchableOpacity>

          <View style={styles.summarySeparator} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <TouchableOpacity 
              style={styles.labelContainer}
              onPress={() => Alert.alert("Estimated Tax", "Taxes are estimated based on your location and the restaurant's location.")}
            >
              <Text style={styles.summaryLabel}>Estimated Tax</Text>
              <Feather name="info" size={12} color="#74777f" />
            </TouchableOpacity>
            <Text style={styles.summaryValue}>₹{TAXES_AND_FEES.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <TouchableOpacity 
              style={styles.labelContainer}
              onPress={() => Alert.alert("Delivery fee", "This fee helps cover delivery costs and keeps drivers on the road.")}
            >
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Feather name="info" size={12} color="#74777f" />
            </TouchableOpacity>
            <View style={styles.feeContainer}>
              <Text style={styles.crossedOutValue}>₹{DELIVERY_FEE_ORIGINAL.toFixed(2)}</Text>
              <Text style={styles.summaryValue}>₹{DELIVERY_FEE.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <TouchableOpacity 
              style={styles.labelContainer}
              onPress={() => Alert.alert("Service Fee", "This fee helps us operate the platform and provide support for your orders.")}
            >
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Feather name="info" size={12} color="#74777f" />
            </TouchableOpacity>
            <Text style={styles.summaryValue}>₹{SERVICE_FEE.toFixed(2)}</Text>
          </View>

          <View style={styles.summarySeparator} />

          {/* Dasher Tip */}
          <View style={styles.summaryRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.summaryLabelBold}>Dasher Tip</Text>
            </View>
            <Text style={styles.summaryValueBold}>₹{selectedTip.toFixed(2)}</Text>
          </View>

          <View style={styles.tipBubblesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <TouchableOpacity
                style={[styles.tipBubble, selectedTip === 0 && !isOtherTip ? styles.tipBubbleActive : null]}
                onPress={() => { setSelectedTip(0); setIsOtherTip(false); }}
              >
                <Text style={[styles.tipBubbleText, selectedTip === 0 && !isOtherTip ? styles.tipBubbleTextActive : null]}>None</Text>
              </TouchableOpacity>
              {[50, 100, 150].map((tipValue) => (
                <TouchableOpacity
                  key={tipValue}
                  style={[styles.tipBubble, selectedTip === tipValue && !isOtherTip ? styles.tipBubbleActive : null]}
                  onPress={() => { setSelectedTip(tipValue); setIsOtherTip(false); }}
                >
                  <Text style={[styles.tipBubbleText, selectedTip === tipValue && !isOtherTip ? styles.tipBubbleTextActive : null]}>
                    ₹{tipValue.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
              {isOtherTip ? (
                <View style={styles.otherTipInputContainer}>
                  <Text style={styles.otherTipCurrency}>₹</Text>
                  <TextInput
                    style={styles.otherTipInput}
                    keyboardType="numeric"
                    autoFocus
                    placeholder="0"
                    value={otherTipValue}
                    onChangeText={(val) => {
                      setOtherTipValue(val);
                      const num = parseInt(val) || 0;
                      setSelectedTip(num);
                    }}
                  />
                  <TouchableOpacity onPress={() => setIsOtherTip(false)}>
                    <Feather name="check" size={16} color="#000000" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.tipBubble}
                  onPress={() => { setIsOtherTip(true); setOtherTipValue(""); setSelectedTip(0); }}
                >
                  <Text style={styles.tipBubbleText}>Other</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
          <Text style={styles.tipHint}>100% of the tip goes to your Dasher.</Text>

          <View style={styles.summarySeparator} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.totalValueContainer}>
              <Text style={styles.crossedOutTotal}>₹{originalTotal.toFixed(2)}</Text>
              <Text style={styles.finalTotalValue}>₹{finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        {!hasValidAddress && (
          <Text style={styles.footerHint}>Select a delivery address to place order</Text>
        )}
        <View style={styles.savingsBanner}>
          <Ionicons name="pricetag" size={18} color="#000000" />
          <Text style={styles.savingsText}>Saving ₹{DISCOUNT.toFixed(2)} with Deals</Text>
        </View>
        <TouchableOpacity 
          style={[styles.continueBtn, (!hasValidAddress || isPlacingOrder) && styles.continueBtnDisabled]}
          onPress={placeOrder}
          disabled={!hasValidAddress || isPlacingOrder}
          activeOpacity={0.9}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.continueBtnText}>
              {deliveryMode === "scheduled" && !scheduledTime ? "Select delivery time" : "Place order"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <LocationPickerSheet
        isOpen={isAddressSheetOpen}
        onClose={() => setIsAddressSheetOpen(false)}
        onSelectAddress={setSelectedAddress}
      />

      <Modal visible={isTimePickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 40 }]}>
            <View style={styles.timePickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.timePickerTitle}>Select a time</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ marginLeft: 16, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                  <Text style={{ color: '#000', fontWeight: '600', fontSize: 13 }}>Custom</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setIsTimePickerOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {["Today, 12:00 PM - 12:30 PM", "Today, 12:30 PM - 1:00 PM", "Today, 1:00 PM - 1:30 PM", "Today, 1:30 PM - 2:00 PM", "Tomorrow, 12:00 PM - 12:30 PM"].map((time) => (
                <TouchableOpacity 
                  key={time} 
                  style={styles.timeSlotRow} 
                  onPress={() => { setScheduledTime(time); setDeliveryMode("scheduled"); setIsTimePickerOpen(false); }}
                >
                  <Text style={styles.timeSlotText}>{time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Date/Time Picker Modal */}
      <Modal visible={showDatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 40 }]}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Custom Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={{ fontWeight: "700", marginBottom: 10 }}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
                {["Today", "Tomorrow", "In 2 Days", "In 3 Days"].map((date) => (
                  <TouchableOpacity 
                    key={date} 
                    style={[styles.tipBubble, customSelectedDate === date && styles.tipBubbleActive]}
                    onPress={() => setCustomSelectedDate(date)}
                  >
                    <Text style={[styles.tipBubbleText, customSelectedDate === date && styles.tipBubbleTextActive]}>{date}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={{ fontWeight: "700", marginBottom: 10, marginTop: 10 }}>Time</Text>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                {/* Hour */}
                <ScrollView style={{ height: 120 }} showsVerticalScrollIndicator={false}>
                  {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((hr) => (
                    <TouchableOpacity key={hr} onPress={() => setCustomSelectedHour(hr)} style={{ padding: 10, backgroundColor: customSelectedHour === hr ? "#000" : "transparent", borderRadius: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 16, color: customSelectedHour === hr ? "#fff" : "#000", fontWeight: customSelectedHour === hr ? "700" : "400" }}>{hr}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={{ fontSize: 20, fontWeight: "bold" }}>:</Text>
                {/* Minute */}
                <ScrollView style={{ height: 120 }} showsVerticalScrollIndicator={false}>
                  {["00", "15", "30", "45"].map((min) => (
                    <TouchableOpacity key={min} onPress={() => setCustomSelectedMinute(min)} style={{ padding: 10, backgroundColor: customSelectedMinute === min ? "#000" : "transparent", borderRadius: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 16, color: customSelectedMinute === min ? "#fff" : "#000", fontWeight: customSelectedMinute === min ? "700" : "400" }}>{min}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* AM/PM */}
                <View style={{ gap: 10 }}>
                  {["AM", "PM"].map((ampm) => (
                    <TouchableOpacity key={ampm} onPress={() => setCustomSelectedAmPm(ampm)} style={{ padding: 15, backgroundColor: customSelectedAmPm === ampm ? "#000" : "#f3f4f6", borderRadius: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 16, color: customSelectedAmPm === ampm ? "#fff" : "#000", fontWeight: "700" }}>{ampm}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={[styles.continueBtn, { marginTop: 30 }]} onPress={handleCustomTimeApply}>
                <Text style={styles.continueBtnText}>Apply Custom Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Drop-off Picker Modal */}
      <Modal visible={isDropOffPickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 40 }]}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Drop-off options</Text>
              <TouchableOpacity onPress={() => setIsDropOffPickerOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {["Leave at door", "Hand it to me", "Meet outside"].map((option) => (
                <TouchableOpacity 
                  key={option} 
                  style={styles.timeSlotRow} 
                  onPress={() => { setDropOffOption(option); setIsDropOffPickerOpen(false); }}
                >
                  <Text style={styles.timeSlotText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    paddingLeft: 4,
    paddingTop: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#43474e",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
    marginTop: 4,
  },
  content: {
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#eceef0",
    width: "100%",
  },
  thickDivider: {
    height: 8,
    backgroundColor: "#f5f5f5",
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eceef0",
  },
  section: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addressSectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
    marginBottom: 16,
  },
  addressCardDoorDash: {
    borderWidth: 1,
    borderColor: "#eceef0",
    borderRadius: 16,
    overflow: "hidden",
  },
  mapPreviewArea: {
    height: 120,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  mapPreviewBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  mapPinShadow: {
    position: 'absolute',
    width: 12,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    bottom: 45,
    transform: [{ scaleX: 2 }],
  },
  adjustPinContainer: {
    position: "absolute",
    bottom: -18,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  adjustPinBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  adjustPinText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  ddAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 32,
  },
  ddAddressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ddAddressLine1: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  ddAddressLine2: {
    fontSize: 14,
    color: "#74777f",
    marginTop: 2,
  },
  ddWarningBox: {
    backgroundColor: "#fef3c7",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  ddWarningHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ddWarningText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#43474e",
    lineHeight: 20,
  },
  ddEditAddressBtn: {
    backgroundColor: "#fcd34d",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    marginLeft: 30,
  },
  ddEditAddressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  ddSeparator: {
    height: 1,
    backgroundColor: "#eceef0",
    marginLeft: 48,
  },
  ddActionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  ddActionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ddActionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },
  ddActionSubtitle: {
    fontSize: 14,
    color: "#74777f",
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#d4d4d8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#000000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  timePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eceef0",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  timeSlotRow: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eceef0",
  },
  timeSlotText: {
    fontSize: 16,
    color: "#000",
  },
  cartSummaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cartSummaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },
  cartSummarySubtitle: {
    fontSize: 14,
    color: "#74777f",
    marginBottom: 16,
  },
  itemsListContainer: {
    gap: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemQty: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    marginRight: 8,
    marginTop: 2,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  itemCustomization: {
    fontSize: 14,
    color: "#74777f",
    marginTop: 4,
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginTop: 2,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
  },
  dealsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dealsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  summarySeparator: {
    height: 1,
    backgroundColor: "#eceef0",
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#43474e",
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },
  feeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crossedOutValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#74777f",
    textDecorationLine: "line-through",
  },
  tipBubblesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  tipBubble: {
    backgroundColor: "#eceef0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tipBubbleActive: {
    backgroundColor: "#191c1e",
  },
  tipBubbleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  tipBubbleTextActive: {
    color: "#ffffff",
  },
  otherTipInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eceef0",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    minWidth: 80,
  },
  otherTipCurrency: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    marginRight: 4,
  },
  otherTipInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    paddingVertical: 0,
    minWidth: 40,
  },
  tipHint: {
    fontSize: 13,
    color: "#74777f",
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
  },
  totalValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crossedOutTotal: {
    fontSize: 18,
    color: "#74777f",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  finalTotalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 4,
    borderColor: "#000000",
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },
  continueBtn: {
    backgroundColor: "#000000", 
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  footerHint: {
    fontSize: 12,
    color: "#74777f",
    marginBottom: 12,
    textAlign: "center",
  }
});
