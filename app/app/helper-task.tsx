import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { customFetch } from "@/utils/api/custom-fetch";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function HelperTaskScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const { radius } = useLocalSearchParams<{ radius?: string }>();
  const colors = Colors[theme];
  const { driver, currentCoords } = useDeliveryStore();

  const [taskType, setTaskType] = useState<"pickup_drop" | "general_work" | null>(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [activeField, setActiveField] = useState<"pickup" | "dropoff" | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isPickupValid, setIsPickupValid] = useState(false);
  const [isDropoffValid, setIsDropoffValid] = useState(false);

  const handleSearch = async (text: string, type: "pickup" | "dropoff") => {
    if (type === "pickup") {
      setPickupLocation(text);
      setIsPickupValid(false);
    } else {
      setDropoffLocation(text);
      setIsDropoffValid(false);
    }
    
    setActiveField(type);
    
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const data = await customFetch<any[]>(`/api/v1/places/autocomplete?input=${encodeURIComponent(text)}`, { responseType: "json" });
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setSearchResults([]);
    }
  };

  const selectResult = async (result: any) => {
    if (currentCoords && radius) {
      try {
        let lat: number | null = null;
        let lng: number | null = null;
        
        if (Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lng))) {
          lat = Number(result.lat);
          lng = Number(result.lng);
        } else if (result.id) {
          const details = await customFetch<{ lat: number, lng: number }>(`/api/v1/places/details/${result.id}`);
          if (details && details.lat) {
            lat = details.lat;
            lng = details.lng;
          }
        }

        if (lat !== null && lng !== null) {
          const distance = getDistanceFromLatLonInKm(currentCoords.lat, currentCoords.lng, lat, lng);
          
          if (distance > parseFloat(radius)) {
            Alert.alert("Out of Range", `This location is outside your selected ${radius}km radius.`);
            setSearchResults([]);
            setActiveField(null);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to validate place distance:", e);
      }
    }

    const address = result.description || result.name || result.address || "";
    if (activeField === "pickup") {
      setPickupLocation(address);
      setIsPickupValid(true);
    } else if (activeField === "dropoff") {
      setDropoffLocation(address);
      setIsDropoffValid(true);
    }
    setSearchResults([]);
    setActiveField(null);
  };

  const handleProceed = () => {
    // In a real app, we would save the task details to the order or send them via chat automatically
    // For now, just navigate to the chat screen so they can interact
    router.push("/chat");
  };

  const isProceedDisabled = taskType === null || 
    (taskType === "pickup_drop" && (!isPickupValid || !isDropoffValid));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Assign Task</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.introSection}>
            <Text style={[styles.introTitle, { color: colors.text }]}>What do you need help with?</Text>
            <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>
              {driver?.name ? `${driver.name} is ready` : "Your helper is ready"} to assist you. Select the type of task below.
            </Text>
          </View>

          {/* Task Type Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[
                styles.optionCard, 
                { backgroundColor: colors.surface, borderColor: colors.border },
                taskType === "pickup_drop" && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}10` }
              ]}
              onPress={() => setTaskType("pickup_drop")}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIconBadge, { backgroundColor: taskType === "pickup_drop" ? colors.primary : colors.surfaceSecondary }]}>
                <Feather name="package" size={20} color={taskType === "pickup_drop" ? "#fff" : colors.text} />
              </View>
              <View style={styles.optionTextContent}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Pickup & Drop of an item</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>Deliver keys, documents, or small packages securely.</Text>
              </View>
              {taskType === "pickup_drop" ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.optionCard, 
                { backgroundColor: colors.surface, borderColor: colors.border },
                taskType === "general_work" && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}10` }
              ]}
              onPress={() => setTaskType("general_work")}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIconBadge, { backgroundColor: taskType === "general_work" ? colors.primary : colors.surfaceSecondary }]}>
                <Feather name="briefcase" size={20} color={taskType === "general_work" ? "#fff" : colors.text} />
              </View>
              <View style={styles.optionTextContent}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>General Work</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>Help with lifting, moving, or any manual task nearby.</Text>
              </View>
              {taskType === "general_work" ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>
          </View>

          {/* Dynamic Content based on Selection */}
          {taskType === "pickup_drop" && (
            <View style={styles.dynamicSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location Details</Text>
              
              <View style={{ zIndex: 2000, marginBottom: 4 }}>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput 
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter Pickup Location"
                    placeholderTextColor={colors.textSecondary}
                    value={pickupLocation}
                    onChangeText={(t) => handleSearch(t, "pickup")}
                    onFocus={() => {
                      setActiveField("pickup");
                      if (pickupLocation.length >= 2) handleSearch(pickupLocation, "pickup");
                    }}
                  />
                </View>

                {activeField === "pickup" && searchResults.length > 0 && (
                  <View style={[styles.customDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {searchResults.map((result, idx) => (
                      <TouchableOpacity 
                        key={`${result.place_id || result.id || 'res'}-${idx}`} 
                        style={[styles.customDropdownRow, idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                        onPress={() => selectResult(result)}
                      >
                        <Ionicons name="location" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                        <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{result.description || result.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.dottedLine, { zIndex: 1000 }]}>
                <View style={[styles.dot, { backgroundColor: colors.border }]} />
                <View style={[styles.dot, { backgroundColor: colors.border }]} />
                <View style={[styles.dot, { backgroundColor: colors.border }]} />
              </View>

              <View style={{ zIndex: 1000, marginTop: 4 }}>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                  </View>
                  <TextInput 
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter Drop-off Location"
                    placeholderTextColor={colors.textSecondary}
                    value={dropoffLocation}
                    onChangeText={(t) => handleSearch(t, "dropoff")}
                    onFocus={() => {
                      setActiveField("dropoff");
                      if (dropoffLocation.length >= 2) handleSearch(dropoffLocation, "dropoff");
                    }}
                  />
                </View>
                
                {activeField === "dropoff" && searchResults.length > 0 && (
                  <View style={[styles.customDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {searchResults.map((result, idx) => (
                      <TouchableOpacity 
                        key={`${result.place_id || result.id || 'res'}-${idx}`} 
                        style={[styles.customDropdownRow, idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                        onPress={() => selectResult(result)}
                      >
                        <Ionicons name="location" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                        <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{result.description || result.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {taskType === "general_work" && (
            <View style={styles.dynamicSection}>
               <View style={[styles.infoCard, { backgroundColor: `${colors.primary}15` }]}>
                 <Ionicons name="information-circle" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                 <Text style={[styles.infoCardText, { color: colors.text }]}>
                   You can explain the exact requirements to your helper directly in the chat or over a call.
                 </Text>
               </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 24, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[
            styles.proceedBtn, 
            { backgroundColor: isProceedDisabled ? colors.surfaceSecondary : colors.primary }
          ]}
          onPress={handleProceed}
          disabled={isProceedDisabled}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubbles" size={20} color={isProceedDisabled ? colors.textSecondary : "#fff"} style={{ marginRight: 8 }} />
          <Text style={[
            styles.proceedBtnText, 
            { color: isProceedDisabled ? colors.textSecondary : "#fff" }
          ]}>
            Proceed to Chat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  introSection: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionTextContent: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  dynamicSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  dottedLine: {
    width: 2,
    height: 24,
    marginLeft: 26,
    flexDirection: "column",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginVertical: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  proceedBtn: {
    flexDirection: "row",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  proceedBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  customDropdown: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  customDropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
});
