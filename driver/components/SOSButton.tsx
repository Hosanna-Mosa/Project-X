import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useRef } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { Colors } from "@/constants/colors";

export default function SOSButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [activated, setActivated] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSOSPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowConfirm(true);
  };

  const handleActivate = () => {
    setShowConfirm(false);
    setActivated(true);
    setCountdown(5);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    let count = 5;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        pulse.stop();
        setActivated(false);
        Alert.alert(
          "SOS Sent",
          "Emergency services and our support team have been notified. Help is on the way.",
          [{ text: "OK" }]
        );
      }
    }, 1000);
  };

  const handleCancel = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    setActivated(false);
    setShowConfirm(false);
    setCountdown(5);
    pulseAnim.setValue(1);
  };

  return (
    <>
      <Animated.View style={[activated && { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.sosButton, activated && styles.sosButtonActive]}
          onPress={activated ? handleCancel : handleSOSPress}
        >
          {activated ? (
            <View style={styles.sosActiveContent}>
              <Text style={styles.sosCountdown}>{countdown}</Text>
            </View>
          ) : (
            <Text style={styles.sosText}>SOS</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Modal
        transparent
        visible={showConfirm}
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <View style={styles.warningIcon}>
              <Feather name="alert-triangle" size={36} color={Colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Send SOS Alert?</Text>
            <Text style={styles.confirmText}>
              This will alert emergency services and our support team with your
              current location.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activateBtn}
                onPress={handleActivate}
              >
                <Text style={styles.activateBtnText}>Send SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  sosButtonActive: {
    backgroundColor: Colors.error,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sosActiveContent: {
    alignItems: "center",
  },
  sosCountdown: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  sosText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    gap: 16,
  },
  warningIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.errorLight,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  confirmText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  activateBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  activateBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
});
