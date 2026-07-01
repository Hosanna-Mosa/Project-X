import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GoOnlineModalProps {
  visible: boolean;
  onClose: () => void;
  onGoOnline: (services: ("food" | "ride")[]) => void;
}

export function GoOnlineModal({ visible, onClose, onGoOnline }: GoOnlineModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedServices, setSelectedServices] = React.useState<("food" | "ride")[]>(["ride", "food"]);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const toggleService = (service: "food" | "ride") => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleGoOnline = () => {
    if (selectedServices.length === 0) return;
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onGoOnline(selectedServices);
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setSelectedServices(["ride", "food"]);
    setShowSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {showSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrap}>
                <Feather name="check-circle" size={56} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>You're Online!</Text>
              <Text style={styles.successText}>
                You'll receive orders for {selectedServices.join(" & ")}
              </Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <Text style={styles.title}>Go Online</Text>
              <Text style={styles.subtitle}>
                Select the services you want to be available for
              </Text>

              {/* Service Options */}
              <View style={styles.servicesContainer}>
                <Pressable
                  style={[
                    styles.serviceCard,
                    selectedServices.includes("ride") && styles.serviceCardActive,
                  ]}
                  onPress={() => toggleService("ride")}
                >
                  <View style={styles.serviceLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        selectedServices.includes("ride") && styles.checkboxActive,
                      ]}
                    >
                      {selectedServices.includes("ride") && (
                        <Feather name="check" size={14} color={Colors.white} />
                      )}
                    </View>
                    <View style={styles.serviceInfo}>
                      <View style={styles.serviceIconWrap}>
                        <Feather name="navigation" size={18} color={selectedServices.includes("ride") ? Colors.primary : Colors.textMuted} />
                      </View>
                      <View>
                        <Text style={[styles.serviceName, selectedServices.includes("ride") && styles.serviceNameActive]}>
                          Ride Hailing
                        </Text>
                        <Text style={styles.serviceDesc}>
                          Passenger pick-up & drop-off
                        </Text>
                      </View>
                    </View>
                  </View>
                  {selectedServices.includes("ride") && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>Selected</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.serviceCard,
                    selectedServices.includes("food") && styles.serviceCardActive,
                  ]}
                  onPress={() => toggleService("food")}
                >
                  <View style={styles.serviceLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        selectedServices.includes("food") && styles.checkboxActive,
                      ]}
                    >
                      {selectedServices.includes("food") && (
                        <Feather name="check" size={14} color={Colors.white} />
                      )}
                    </View>
                    <View style={styles.serviceInfo}>
                      <View style={[styles.serviceIconWrap, styles.serviceIconFood]}>
                        <Feather name="shopping-bag" size={18} color={selectedServices.includes("food") ? Colors.primary : Colors.textMuted} />
                      </View>
                      <View>
                        <Text style={[styles.serviceName, selectedServices.includes("food") && styles.serviceNameActive]}>
                          Food Delivery
                        </Text>
                        <Text style={styles.serviceDesc}>
                          Restaurant orders to customers
                        </Text>
                      </View>
                    </View>
                  </View>
                  {selectedServices.includes("food") && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>Selected</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Info note */}
              {selectedServices.length === 0 && (
                <Text style={styles.errorText}>
                  Please select at least one service
                </Text>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.goOnlineBtn,
                    selectedServices.length === 0 && styles.goOnlineBtnDisabled,
                  ]}
                  onPress={handleGoOnline}
                  disabled={selectedServices.length === 0}
                >
                  <Feather name="wifi" size={18} color={Colors.white} />
                  <Text style={styles.goOnlineBtnText}>
                    Go Online
                    {selectedServices.length > 0 && ` (${selectedServices.length})`}
                  </Text>
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handleRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  servicesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  serviceCardActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  serviceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIconFood: {
    backgroundColor: Colors.primaryLight,
  },
  serviceName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  serviceNameActive: {
    color: Colors.primaryDark,
  },
  serviceDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  selectedBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.white,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  actions: {
    gap: 12,
  },
  goOnlineBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  goOnlineBtnDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  goOnlineBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.white,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 8,
  },
  successText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
