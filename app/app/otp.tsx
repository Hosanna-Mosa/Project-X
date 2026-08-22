import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";

const RESEND_SECONDS = 30;

function formatPhone(phone: string) {
  // "9849021734" -> "98490 21734"
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  // name/email/password are only present when this screen was reached from
  // the create-account form — carrying them through lets verifyOTP finish
  // registration as soon as the real code checks out, instead of the old
  // flow where "Create account" skipped OTP verification entirely.
  const { phone, name, email, password } = useLocalSearchParams<{
    phone: string;
    name?: string;
    email?: string;
    password?: string;
  }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  const { verifyOTP, requestOTP, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleChange = (text: string, index: number) => {
    const digit = text.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
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
    if (code.length < 6 || !phone) return;
    try {
      const result = await verifyOTP(phone, code, "USER", name, email, password);
      if (result.isNewUser) {
        // Reached by entering a phone straight on the sign-in screen — it
        // checks out but there's no account yet, so go collect the rest.
        router.push({ pathname: "/signup", params: { phone } });
      } else {
        // Either a normal sign-in verification, or — when name/email/password
        // were carried through from the create-account form — the account was
        // just created by this same call.
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      Alert.alert("Verification failed", error.message || "That code didn't work. Please try again.");
    }
  };

  const handleResend = async () => {
    if (!phone || secondsLeft > 0) return;
    setResending(true);
    try {
      await requestOTP(phone);
      setSecondsLeft(RESEND_SECONDS);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch (error: any) {
      Alert.alert("Couldn't resend", error.message || "Please try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  const handleCallInstead = () => {
    Alert.alert("Call requested", "We'll ring you with your code shortly.");
  };

  const isFilled = otp.every((d) => d.length === 1);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Back button — same treatment as screen 2 */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 24) + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={moderateScale(22)} color={tokens.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { minHeight: "100%" }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Same centered hero treatment as screens 1 & 2 */}
        <View style={styles.heroBlock}>
          <Text style={styles.headline} numberOfLines={1}>Verify your number</Text>
          <Text style={styles.subhead}>
            We sent a 6-digit code to{" "}
            <Text style={styles.subheadStrong}>+91 {formatPhone(phone || "")}</Text>.{" "}
            <Text style={styles.subheadLink} onPress={() => router.back()}>
              Change
            </Text>
          </Text>
        </View>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => {
                inputs.current[i] = ref;
              }}
              style={[
                styles.otpCell,
                (digit.length > 0 || focusedIndex === i) && styles.otpCellActive,
              ]}
              value={digit}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              onFocus={() => setFocusedIndex(i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor={accent.accent}
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <Text style={styles.resendMuted}>Resend code in 0:{String(secondsLeft).padStart(2, "0")}</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
              {resending ? (
                <ActivityIndicator size="small" color={accent.accent} />
              ) : (
                <Text style={styles.resendActive}>Resend</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, (!isFilled || loading) && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={!isFilled || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={accent.on} />
          ) : (
            <Text style={styles.verifyBtnText}>Verify &amp; continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.callRow} onPress={handleCallInstead} activeOpacity={0.7}>
          <Text style={styles.callText}>
            Didn't get it? <Text style={styles.callHighlight}>Get a call instead</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ServiceTokens) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  backBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Same cap as screens 1 & 2's hero blocks.
    maxHeight: moderateScale(200),
    minHeight: moderateScale(120),
  },
  headline: {
    // Same size as screens 1 & 2's headlines — kept identical on purpose.
    fontFamily: fontFamilies.heading.bold,
    fontSize: moderateScale(38),
    lineHeight: moderateScale(40),
    letterSpacing: -1.4,
    color: tokens.text,
    textAlign: "center",
  },
  subhead: {
    fontFamily: fontFamilies.body.regular,
    marginTop: 12,
    fontSize: moderateScale(15),
    lineHeight: moderateScale(21),
    color: tokens.sec,
    textAlign: "center",
  },
  subheadStrong: {
    fontFamily: fontFamilies.body.semibold,
    color: tokens.text,
  },
  subheadLink: {
    fontFamily: fontFamilies.body.semibold,
    color: accent.accent,
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
  },
  otpCell: {
    flex: 1,
    height: moderateScale(58),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    backgroundColor: tokens.surface,
    fontFamily: fontFamilies.heading.bold,
    fontSize: moderateScale(24),
    color: tokens.text,
  },
  otpCellActive: {
    borderWidth: 2,
    borderColor: accent.accent,
  },
  resendRow: {
    marginTop: 18,
    alignItems: "center",
  },
  resendMuted: {
    fontFamily: fontFamilies.body.medium,
    fontSize: moderateScale(14),
    color: tokens.sec,
  },
  resendActive: {
    fontFamily: fontFamilies.body.semibold,
    fontSize: moderateScale(14),
    color: accent.accent,
  },
  verifyBtn: {
    marginTop: 24,
    height: moderateScale(52),
    borderRadius: moderateScale(14),
    backgroundColor: accent.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    fontFamily: fontFamilies.body.bold,
    color: accent.on,
    fontSize: moderateScale(15),
  },
  callRow: {
    marginTop: 16,
    alignItems: "center",
  },
  callText: {
    fontFamily: fontFamilies.body.regular,
    fontSize: moderateScale(14),
    color: tokens.sec,
  },
  callHighlight: {
    fontFamily: fontFamilies.body.semibold,
    color: accent.accent,
  },
});
