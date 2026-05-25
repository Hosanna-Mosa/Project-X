import React from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";

const { height } = Dimensions.get("window");

const normalizeServiceType = (serviceId?: string) => {
  if (serviceId === "bike-lite") return "bike";
  if (serviceId === "cab-prime") return "cab_prime";
  if (serviceId === "bike" || serviceId === "auto" || serviceId === "cab") {
    return serviceId;
  }
  return "cab";
};

const parseFare = (value?: string, fallback?: string) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric);

  const fromPrice = Number(String(fallback || "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(fromPrice) && fromPrice > 0) return Math.round(fromPrice);

  return 25;
};

const CANCEL_REASONS = [
  "Selected Wrong Pickup Location",
  "Selected Wrong Drop Location",
  "Booked by mistake",
  "Selected different service/vehicle",
  "Taking too long to confirm the ride",
  "Got a ride elsewhere",
  "Others",
];

export default function RideSearchingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors, insets), [colors, insets]);
  const setCurrentOrderId = useDeliveryStore((s) => s.setOrderId);
  const mapRef = React.useRef<MapView>(null);

  const params = useLocalSearchParams<{
    serviceId: string;
    rideId: string;
    rideName: string;
    ridePrice: string;
    pickupName: string;
    dropName: string;
    pickupLat: string;
    pickupLng: string;
    dropLat: string;
    dropLng: string;
    fareTotal?: string;
    estimatedMinutes?: string;
    distanceInKm?: string;
  }>();
  const [detailsVisible, setDetailsVisible] = React.useState(false);
  const [bookAgainVisible, setBookAgainVisible] = React.useState(false);
  const [cancelReasonVisible, setCancelReasonVisible] = React.useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = React.useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = React.useState("");

  const pickupCoords = React.useMemo(
    () => ({
      latitude: parseFloat(params.pickupLat || "0"),
      longitude: parseFloat(params.pickupLng || "0"),
    }),
    [params.pickupLat, params.pickupLng],
  );
  const dropCoords = React.useMemo(
    () => ({
      latitude: parseFloat(params.dropLat || "0"),
      longitude: parseFloat(params.dropLng || "0"),
    }),
    [params.dropLat, params.dropLng],
  );

  const fare = parseFare(params.fareTotal, params.ridePrice);
  const rideFare = Math.max(0, Math.round(fare * 0.85 * 100) / 100);
  const surcharge = Math.max(0, Math.round((fare - rideFare) * 100) / 100);
  const pickupTitle = String(params.pickupName || "Pickup").split(",")[0];
  const dropTitle = String(params.dropName || "Drop").split(",")[0];
  const cancelUsesDrop = selectedCancelReason.toLowerCase().includes("drop");
  const cancelLocationTitle = cancelUsesDrop ? dropTitle : pickupTitle;
  const cancelLocationAddress = cancelUsesDrop ? params.dropName : params.pickupName;
  const cancelLocationLabel = cancelUsesDrop ? "drop" : "pickup";

  const fitTripMarkers = React.useCallback(() => {
    const validCoords =
      Number.isFinite(pickupCoords.latitude) &&
      Number.isFinite(pickupCoords.longitude) &&
      Number.isFinite(dropCoords.latitude) &&
      Number.isFinite(dropCoords.longitude);

    if (!validCoords) return;

    mapRef.current?.fitToCoordinates([pickupCoords, dropCoords], {
      edgePadding: { top: 48, right: 90, bottom: 56, left: 90 },
      animated: false,
    });
  }, [dropCoords, pickupCoords]);

  React.useEffect(() => {
    const timer = setTimeout(fitTripMarkers, 250);
    return () => clearTimeout(timer);
  }, [fitTripMarkers]);

  React.useEffect(() => {
    const createRideOrder = async () => {
      try {
        const order = await customFetch<any>("/api/v1/orders", {
          method: "POST",
          responseType: "json",
          body: JSON.stringify({
            serviceType: normalizeServiceType(params.serviceId),
            stops: [
              {
                address: params.pickupName,
                latitude: pickupCoords.latitude,
                longitude: pickupCoords.longitude,
                type: "PICKUP",
              },
              {
                address: params.dropName,
                latitude: dropCoords.latitude,
                longitude: dropCoords.longitude,
                type: "DROP",
              },
            ],
          }),
        });

        const id = order?._id || order?.id;
        if (id) {
          setCurrentOrderId(id);
        }
      } catch (error: any) {
        console.error("Create ride order error:", error);
        Alert.alert("Ride request", error?.message || "Could not request this ride.");
      }
    };

    createRideOrder();
  }, [
    dropCoords.latitude,
    dropCoords.longitude,
    params.dropName,
    params.pickupName,
    params.serviceId,
    pickupCoords.latitude,
    pickupCoords.longitude,
    setCurrentOrderId,
  ]);

  const showTripDetails = () => setDetailsVisible(true);
  const showCancelReasons = () => {
    setCancelConfirmVisible(false);
    setCancelReasonVisible(true);
  };
  const selectCancelReason = (reason: string) => {
    setSelectedCancelReason(reason);
    setCancelReasonVisible(false);
    setCancelConfirmVisible(true);
  };
  const keepSearching = () => {
    setCancelConfirmVisible(false);
    setCancelReasonVisible(false);
  };
  const cancelRide = () => {
    setCancelConfirmVisible(false);
    setCancelReasonVisible(false);
    setBookAgainVisible(false);
  };
  /* void [
      `${params.pickupName}\n\nTo\n\n${params.dropName}\n\nRide: ${params.rideName || "Bike Ride"}\nFare: ₹${fare}`,

  ]; */

  return (
    <View style={styles.root}>
      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            ...pickupCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsCompass={false}
          showsMyLocationButton={false}
          onMapReady={fitTripMarkers}
        >
          <Circle
            center={pickupCoords}
            radius={170}
            fillColor="rgba(61, 132, 215, 0.12)"
            strokeColor="rgba(61, 132, 215, 0.08)"
            strokeWidth={1}
          />
          <Circle
            center={pickupCoords}
            radius={86}
            fillColor="rgba(61, 132, 215, 0.22)"
            strokeColor="rgba(61, 132, 215, 0.18)"
            strokeWidth={1}
          />
          <Marker coordinate={dropCoords} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.dropMarker}>
              <View style={styles.dropMarkerInner} />
            </View>
          </Marker>
          <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.pickupMarkerWrap}>
              <View style={styles.pickupMarker}>
                <View style={styles.pickupDot} />
              </View>
              <View style={styles.pickupStem} />
            </View>
          </Marker>
        </MapView>
      </View>

      <View style={styles.panel}>
        <View style={styles.handle} />

        <Text style={styles.title}>
          <Text style={styles.titleCount}>31 of 32</Text> captains didn't accept your ride
        </Text>

        <View style={styles.progressTrack}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBlock,
                index === 0 && styles.progressBlockFirst,
                index === 17 && styles.progressBlockLast,
              ]}
            />
          ))}
          <View style={styles.progressTail} />
        </View>

        <View style={styles.fareCard}>
          <View style={styles.bikeBadge}>
            <MaterialCommunityIcons name="motorbike" size={28} color="#0f172a" />
          </View>
          <View style={styles.fareTextGroup}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            <Text style={styles.fareValue}>₹{fare}</Text>
          </View>
          <TouchableOpacity style={styles.tripButton} onPress={showTripDetails}>
            <Text style={styles.tripButtonText}>Trip Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dashedLine} />

        <View style={styles.suggestionCard}>
          <View style={styles.suggestionHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={25} color="#0f172a" />
            </View>
            <Text style={styles.suggestionTitle}>
              Captains aren't accepting at ₹{fare}.{"\n"}Try adding more
            </Text>
          </View>

          <View style={styles.addFareRow}>
            {["+ ₹10", "+ ₹15", "+ ₹20", "+"].map((label) => (
              <TouchableOpacity key={label} style={styles.addFarePill}>
                <Text style={styles.addFareText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.bookAgainButton}
            onPress={() => setBookAgainVisible(true)}
          >
            <Text style={styles.bookAgainText}>Book again</Text>
          </TouchableOpacity>
        </View>
      </View>

      {bookAgainVisible && (
        <View style={styles.bookAgainOverlay}>
          <TouchableOpacity
            style={styles.bookAgainBackdrop}
            activeOpacity={1}
            onPress={() => setBookAgainVisible(false)}
          />
          <TouchableOpacity
            style={styles.bookAgainBackFloating}
            onPress={() => setBookAgainVisible(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.bookAgainSheet}>
            <Text style={styles.bookAgainTitle}>Searching for below services...</Text>

            <View style={styles.serviceSummaryCard}>
              <View style={styles.serviceLeft}>
                <View style={styles.serviceBikeBadge}>
                  <MaterialCommunityIcons name="motorbike" size={30} color="#0f172a" />
                </View>
                <Text style={styles.serviceName}>Bike</Text>
              </View>
              <Text style={styles.serviceFare}>₹{fare}</Text>
            </View>

            <View style={styles.bookDashedLine} />

            <Text style={styles.locationTitle}>Location Details</Text>
            <View style={styles.locationRows}>
              <View style={styles.locationRail}>
                <View style={styles.pickupSmallDot} />
                <View style={styles.locationDashes} />
                <View style={styles.dropSmallDot} />
              </View>
              <View style={styles.locationTextColumn}>
                <View style={styles.locationRow}>
                  <Text style={styles.locationName} numberOfLines={1}>
                    {pickupTitle}
                  </Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {params.pickupName}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Text style={styles.locationName} numberOfLines={1}>
                    {dropTitle}
                  </Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {params.dropName}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.totalFareRow}>
              <Text style={styles.totalFareLabel}>Total Fare</Text>
              <Text style={styles.totalFareValue}>₹{fare}</Text>
            </View>

            <View style={styles.paymentRow}>
              <Ionicons name="cash-outline" size={20} color="#334155" />
              <Text style={styles.paymentText}>Paying via cash</Text>
            </View>

            <TouchableOpacity
              style={styles.backYellowButton}
              onPress={() => setBookAgainVisible(false)}
            >
              <Text style={styles.backYellowText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelRideButton}
              onPress={showCancelReasons}
            >
              <Text style={styles.cancelRideText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>

          {cancelReasonVisible && (
            <View style={styles.cancelFlowOverlay}>
              <TouchableOpacity
                style={styles.cancelFlowBackdrop}
                activeOpacity={1}
                onPress={() => setCancelReasonVisible(false)}
              />
              <TouchableOpacity
                style={styles.cancelFlowBackButton}
                onPress={() => setCancelReasonVisible(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>

              <View style={styles.cancelReasonSheet}>
                <View style={styles.cancelSheetHandle} />
                <Text style={styles.cancelReasonTitle}>Why do you want to cancel?</Text>
                <Text style={styles.cancelReasonSubtitle}>
                  Please provide the reason for cancellation
                </Text>
                <View style={styles.cancelReasonDivider} />

                {CANCEL_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={styles.cancelReasonRow}
                    onPress={() => selectCancelReason(reason)}
                  >
                    <Text style={styles.cancelReasonText}>{reason}</Text>
                    <Ionicons name="chevron-forward" size={22} color="#0f172a" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {cancelConfirmVisible && (
            <View style={styles.cancelFlowOverlay}>
              <TouchableOpacity
                style={styles.cancelFlowBackdrop}
                activeOpacity={1}
                onPress={keepSearching}
              />

              <TouchableOpacity style={styles.cancelConfirmClose} onPress={keepSearching}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>

              <View style={styles.cancelConfirmSheet}>
                <View style={styles.cancelSheetHandle} />
                <Text style={styles.cancelConfirmTitle}>
                  Are you sure you want to cancel{"\n"}this ride?
                </Text>
                <View style={styles.cancelReasonDivider} />

                <Text style={styles.cancelConfirmCopy}>
                  {cancelUsesDrop
                    ? "Drop location can be changed before booking another ride."
                    : "Pickup location can be changed up to a radius of 200m even after the captain is assigned."}
                </Text>

                <View style={styles.selectedReasonBox}>
                  <Text style={styles.selectedReasonLabel}>Reason</Text>
                  <Text style={styles.selectedReasonText}>{selectedCancelReason}</Text>
                </View>

                <Text style={styles.currentAddressLabel}>
                  Your current {cancelLocationLabel} address is
                </Text>
                <View style={styles.cancelAddressRow}>
                  <View style={styles.cancelAddressDot} />
                  <View style={styles.cancelAddressTextGroup}>
                    <Text style={styles.cancelAddressTitle} numberOfLines={1}>
                      {cancelLocationTitle}
                    </Text>
                    <Text style={styles.cancelAddressDetail} numberOfLines={1}>
                      {cancelLocationAddress}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.cancelMyRideButton} onPress={cancelRide}>
                  <Text style={styles.cancelMyRideText}>Cancel my ride</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.keepSearchingButton} onPress={keepSearching}>
                  <Text style={styles.keepSearchingText}>Keep searching</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {detailsVisible && (
        <View style={styles.detailsOverlay}>
          <TouchableOpacity
            style={styles.detailsBackdrop}
            activeOpacity={1}
            onPress={() => setDetailsVisible(false)}
          />
          <TouchableOpacity
            style={styles.detailsClose}
            onPress={() => setDetailsVisible(false)}
          >
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>

          <View style={styles.detailsSheet}>
            <View style={styles.detailsHandle} />
            <View style={styles.detailsHeader}>
              <MaterialCommunityIcons name="motorbike" size={24} color="#0f172a" />
              <Text style={styles.detailsTitle}>Bike Fare Details</Text>
            </View>

            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>
                Total Estimated fare price including{"\n"}taxes.
              </Text>
              <Text style={styles.estimateValue}>₹{fare}*</Text>
            </View>

            <View style={styles.detailDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Ride Fare</Text>
              <Text style={styles.breakdownValue}>₹{rideFare.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Surcharge</Text>
              <Text style={styles.breakdownValue}>₹{surcharge.toFixed(2)}</Text>
            </View>

            <Text style={styles.detailsNote}>
              *Price may vary based on final pickup or drop location, time taken, final route and toll area.
            </Text>
            <Text style={styles.detailsPolicy}>
              22 Base Fare upto 2 kms, 6 Rs/km upto 6 kms post 6 kms 8Rs/km
            </Text>
            <Text style={styles.detailsPolicy}>
              Waiting charges after 3 mins of captain arrival is ₹1/min
            </Text>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={() => setDetailsVisible(false)}
            >
              <Text style={styles.gotItText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: typeof Colors.light, insets: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    mapArea: {
      height: height * 0.43,
      backgroundColor: "#eef1f4",
    },
    pickupMarkerWrap: {
      alignItems: "center",
    },
    pickupMarker: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#1f8f49",
      borderWidth: 3,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    pickupDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: "#fff",
    },
    pickupStem: {
      width: 3,
      height: 24,
      backgroundColor: "#64748b",
      marginTop: -1,
    },
    dropMarker: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "#d73c32",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    dropMarkerInner: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: "#fff",
    },
    panel: {
      flex: 1,
      marginTop: -13,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 16,
    },
    handle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#e1e8ef",
      alignSelf: "center",
      marginBottom: 11,
    },
    title: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
    },
    titleCount: {
      color: "#0a4f9d",
      fontWeight: "900",
    },
    progressTrack: {
      height: 18,
      borderRadius: 9,
      backgroundColor: "#d9e8f8",
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "stretch",
      gap: 3,
      paddingRight: 3,
      marginBottom: 10,
    },
    progressBlock: {
      width: 13,
      backgroundColor: "#0c5aa7",
    },
    progressBlockFirst: {
      borderTopLeftRadius: 9,
      borderBottomLeftRadius: 9,
    },
    progressBlockLast: {
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
    },
    progressTail: {
      flex: 1,
    },
    fareCard: {
      height: 64,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#dce4ee",
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    bikeBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#f8fafc",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      borderWidth: 1,
      borderColor: "#edf2f7",
    },
    fareTextGroup: {
      flex: 1,
    },
    fareLabel: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 3,
    },
    fareValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "800",
    },
    tripButton: {
      height: 34,
      paddingHorizontal: 18,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: "#cfd9e6",
      alignItems: "center",
      justifyContent: "center",
    },
    tripButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    dashedLine: {
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: "#d7e0ea",
      marginHorizontal: -16,
      marginBottom: 12,
    },
    suggestionCard: {
      borderWidth: 1,
      borderColor: "#dce4ee",
      backgroundColor: "#f8fbff",
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingTop: 13,
      paddingBottom: 14,
      minHeight: 158,
    },
    suggestionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#f8d4c8",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      overflow: "hidden",
    },
    suggestionTitle: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.text,
    },
    addFareRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
    },
    addFarePill: {
      minWidth: 62,
      height: 30,
      borderRadius: 15,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },
    addFareText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    bookAgainButton: {
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingVertical: 6,
    },
    bookAgainText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    bookAgainOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 45,
      justifyContent: "flex-end",
    },
    bookAgainBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.68)",
    },
    bookAgainBackFloating: {
      position: "absolute",
      left: 18,
      bottom: 600,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    bookAgainSheet: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 32,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 34 : 58,
    },
    bookAgainTitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "900",
      color: "#0f172a",
      marginBottom: 10,
    },
    serviceSummaryCard: {
      height: 52,
      borderRadius: 10,
      backgroundColor: "#f8fafc",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    serviceLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    serviceBikeBadge: {
      width: 42,
      height: 38,
      borderRadius: 19,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },
    serviceName: {
      fontSize: 14,
      fontWeight: "900",
      color: "#0f172a",
    },
    serviceFare: {
      fontSize: 14,
      fontWeight: "900",
      color: "#0f172a",
    },
    bookDashedLine: {
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: "#cfd8e3",
      marginBottom: 10,
    },
    locationTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: "#0f172a",
      marginBottom: 9,
    },
    locationRows: {
      flexDirection: "row",
      paddingBottom: 10,
    },
    locationRail: {
      width: 24,
      alignItems: "center",
      paddingTop: 3,
      marginRight: 8,
    },
    pickupSmallDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#14a05d",
      borderWidth: 4,
      borderColor: "#eafff3",
    },
    locationDashes: {
      width: 1,
      height: 35,
      borderLeftWidth: 1,
      borderStyle: "dashed",
      borderColor: "#cbd5e1",
      marginVertical: 2,
    },
    dropSmallDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#d84b3f",
      borderWidth: 4,
      borderColor: "#fff0ee",
    },
    locationTextColumn: {
      flex: 1,
    },
    locationRow: {
      minHeight: 51,
    },
    locationName: {
      fontSize: 14,
      fontWeight: "900",
      color: "#0f172a",
      marginBottom: 2,
    },
    locationAddress: {
      fontSize: 12,
      lineHeight: 16,
      color: "#64748b",
    },
    totalFareRow: {
      height: 44,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#e2e8f0",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: -18,
      paddingHorizontal: 18,
      marginBottom: 0,
    },
    totalFareLabel: {
      fontSize: 16,
      fontWeight: "900",
      color: "#0f172a",
    },
    totalFareValue: {
      fontSize: 16,
      fontWeight: "900",
      color: "#0f172a",
    },
    paymentRow: {
      height: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: -18,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderColor: "#e2e8f0",
      marginBottom: 22,
    },
    paymentText: {
      fontSize: 14,
      color: "#334155",
    },
    backYellowButton: {
      height: 48,
      borderRadius: 24,
      backgroundColor: "#ffc928",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    backYellowText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#000",
    },
    cancelRideButton: {
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: "#9b241b",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    cancelRideText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#8f1f17",
    },
    cancelFlowOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 70,
      justifyContent: "flex-end",
    },
    cancelFlowBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.42)",
    },
    cancelFlowBackButton: {
      position: "absolute",
      left: 14,
      bottom: 562,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 7,
      elevation: 8,
    },
    cancelReasonSheet: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 22 : 28,
      minHeight: 520,
    },
    cancelSheetHandle: {
      width: 48,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#e2e8f0",
      alignSelf: "center",
      marginBottom: 22,
    },
    cancelReasonTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "900",
      color: "#0f172a",
      marginBottom: 6,
    },
    cancelReasonSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: "#0f172a",
      marginBottom: 10,
    },
    cancelReasonDivider: {
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: "#cfd8e3",
      marginBottom: 14,
    },
    cancelReasonRow: {
      height: 54,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
    },
    cancelReasonText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
      color: "#0f172a",
      paddingRight: 10,
    },
    cancelConfirmClose: {
      position: "absolute",
      right: 16,
      bottom: 476,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 7,
      elevation: 8,
      zIndex: 75,
    },
    cancelConfirmSheet: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 22 : 34,
      minHeight: 462,
    },
    cancelConfirmTitle: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "900",
      color: "#0f172a",
      marginBottom: 12,
    },
    cancelConfirmCopy: {
      fontSize: 15,
      lineHeight: 20,
      color: "#0f172a",
      marginBottom: 18,
    },
    selectedReasonBox: {
      backgroundColor: "#f8fafc",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 18,
    },
    selectedReasonLabel: {
      fontSize: 12,
      lineHeight: 16,
      color: "#64748b",
      marginBottom: 2,
    },
    selectedReasonText: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      color: "#0f172a",
    },
    currentAddressLabel: {
      fontSize: 15,
      lineHeight: 20,
      color: "#0f172a",
      marginBottom: 10,
    },
    cancelAddressRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    cancelAddressDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#16a34a",
      borderWidth: 4,
      borderColor: "#dcfce7",
      marginHorizontal: 6,
      marginRight: 18,
    },
    cancelAddressTextGroup: {
      flex: 1,
    },
    cancelAddressTitle: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "900",
      color: "#0f172a",
      marginBottom: 1,
    },
    cancelAddressDetail: {
      fontSize: 12,
      lineHeight: 16,
      color: "#334155",
    },
    cancelMyRideButton: {
      height: 46,
      borderRadius: 23,
      backgroundColor: "#ffc928",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    cancelMyRideText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#000",
    },
    keepSearchingButton: {
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: "#0f172a",
      alignItems: "center",
      justifyContent: "center",
    },
    keepSearchingText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#0f172a",
    },
    detailsOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 50,
      justifyContent: "flex-end",
    },
    detailsBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.68)",
    },
    detailsClose: {
      position: "absolute",
      right: 16,
      bottom: 455,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    detailsSheet: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 9,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 26 : 48,
      minHeight: 430,
    },
    detailsHandle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#e1e8ef",
      alignSelf: "center",
      marginBottom: 36,
    },
    detailsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 28,
    },
    detailsTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: "#0f172a",
    },
    estimateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    estimateLabel: {
      flex: 1,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      color: "#0f172a",
    },
    estimateValue: {
      fontSize: 26,
      fontWeight: "900",
      color: "#0f172a",
    },
    detailDivider: {
      height: 1,
      backgroundColor: "#d1d5db",
      marginBottom: 10,
    },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    breakdownLabel: {
      fontSize: 14,
      color: "#24324a",
    },
    breakdownValue: {
      fontSize: 14,
      fontWeight: "800",
      color: "#24324a",
    },
    detailsNote: {
      fontSize: 12,
      lineHeight: 16,
      color: "#334155",
      marginTop: 2,
      marginBottom: 12,
    },
    detailsPolicy: {
      fontSize: 12,
      lineHeight: 16,
      color: "#334155",
      marginBottom: 12,
    },
    gotItButton: {
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: "#0f172a",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      marginBottom: Platform.OS === "ios" ? 0 : 8,
    },
    gotItText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#0f172a",
    },
  });
