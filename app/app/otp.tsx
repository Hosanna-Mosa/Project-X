import React, { useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { Alert } from "react-native";

export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<Array<TextInput | null>>([]);
  const { verifyOTP, loading } = useAuthStore();

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    try {
      const result = await verifyOTP(phone!, code, "USER");
      if (result.isNewUser) {
        router.push({
          pathname: "/signup",
          params: { phone }
        });
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Verification failed");
    }
  };

  const isFilled = otp.every((d) => d.length === 1);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={22} color={Colors.light.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to your phone number
        </Text>
      </View>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => {
              inputs.current[i] = ref;
            }}
            style={[styles.otpInput, digit && styles.otpInputFilled]}
            value={digit}
            onChangeText={(text) => handleChange(text.slice(-1), i)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(nativeEvent.key, i)
            }
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            selectionColor={Colors.light.primary}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.verifyBtn, !isFilled && styles.verifyBtnDisabled]}
        onPress={handleVerify}
        disabled={!isFilled}
        activeOpacity={0.85}
      >
        <Text style={styles.verifyBtnText}>Verify & Continue</Text>
        <Feather name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendBtn}>
        <Text style={styles.resendText}>
          Didn't receive code?{" "}
          <Text style={styles.resendLink}>Resend</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 28,
    gap: 32,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.light.text,
    backgroundColor: Colors.light.surface,
  },
  otpInputFilled: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}10`,
  },
  verifyBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  verifyBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  resendBtn: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  resendLink: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
});
