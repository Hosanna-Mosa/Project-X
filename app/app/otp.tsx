import React, { useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";
import { Alert } from "react-native";
import { ScreenWrapper } from "@/components/ScreenWrapper";

export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<Array<TextInput | null>>([]);
  const { verifyOTP, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

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
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Verification failed");
    }
  };

  const isFilled = otp.every((d) => d.length === 1);

  return (
    <ScreenWrapper style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={22} color={colors.text} />
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
            selectionColor={colors.primary}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.verifyBtn, (!isFilled || loading) && styles.verifyBtnDisabled]}
        onPress={handleVerify}
        disabled={!isFilled || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Text style={styles.verifyBtnText}>Verify &amp; Continue</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendBtn}>
        <Text style={styles.resendText}>
          Didn't receive code?{" "}
          <Text style={styles.resendLink}>Resend</Text>
        </Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 32,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  otpInput: {
    width: 38,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.surface,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  verifyBtnDisabled: {
    backgroundColor: colors.textMuted,
    shadowOpacity: 0,
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  resendBtn: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: "600",
  },
});
