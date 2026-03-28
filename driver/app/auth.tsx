import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";

type AuthStep = "phone" | "otp";

const MOCK_OTP = "123456";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const setAuthenticated = useDriverStore((s) => s.setAuthenticated);

  const handleSendOTP = () => {
    if (phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your name");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    }, 1200);
  };

  const handleOTPChange = (text: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = text;
    setOtp(newOtp);
    if (text && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
    if (idx === 5 && text) {
      const fullOtp = [...newOtp].join("");
      handleVerifyOTP(fullOtp);
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyOTP = (enteredOtp?: string) => {
    const fullOtp = enteredOtp || otp.join("");
    if (fullOtp.length < 6) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (fullOtp === MOCK_OTP) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAuthenticated(name, `+91 ${phone}`);
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Invalid OTP", `Use ${MOCK_OTP} for demo`);
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
      >
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Feather name="truck" size={40} color={Colors.white} />
          </View>
          <Text style={styles.appName}>DeliverPro</Text>
          <Text style={styles.tagline}>Driver Partner App</Text>
        </View>

        {step === "phone" ? (
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Welcome, Driver!</Text>
            <Text style={styles.formSubtitle}>
              Enter your details to get started
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.primaryButtonText}>Sending OTP...</Text>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Get OTP</Text>
                  <Feather name="arrow-right" size={20} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.formSection,
              {
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep("phone");
                setOtp(["", "", "", "", "", ""]);
              }}
            >
              <Feather name="arrow-left" size={20} color={Colors.text} />
            </TouchableOpacity>

            <Text style={styles.formTitle}>Verify OTP</Text>
            <Text style={styles.formSubtitle}>
              Enter the 6-digit code sent to{"\n"}+91 {phone}
            </Text>
            <Text style={styles.demoHint}>Demo OTP: {MOCK_OTP}</Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => (otpRefs.current[idx] = r)}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  value={digit}
                  onChangeText={(t) => handleOTPChange(t.slice(-1), idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={() => handleVerifyOTP()}
              disabled={loading || otp.join("").length < 6}
            >
              {loading ? (
                <Text style={styles.primaryButtonText}>Verifying...</Text>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Verify & Login</Text>
                  <Feather name="check" size={20} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleSendOTP}
            >
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 40,
  },
  logoSection: {
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  formSection: {
    gap: 20,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: -8,
  },
  demoHint: {
    fontSize: 13,
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    fontWeight: "500",
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  otpContainer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginVertical: 8,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "600",
  },
});
