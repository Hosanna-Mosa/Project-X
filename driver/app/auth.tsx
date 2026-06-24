import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as React from "react";
import { useRef, useState } from "react";
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
import Constants from "expo-constants";

const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
const MOCK_OTP = "123456";

type AuthMode = "signin" | "signup";
type AuthStep = "form" | "otp";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<AuthStep>("form");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { loginWithPassword } = useDriverStore();

  // ── Sign In ──────────────────────────────────────────────────

  const handleSignIn = async () => {
    if (phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number");
      return;
    }
    if (!password) {
      Alert.alert("Password Required", "Please enter your password");
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword(`+91${phone}`, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/onboarding");
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("sign up")) {
        Alert.alert("Account Not Found", "No account found with this number. Please sign up first.", [
          { text: "Sign Up", onPress: () => setMode("signup") },
          { text: "Cancel", style: "cancel" },
        ]);
      } else {
        Alert.alert("Login Failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ──────────────────────────────────────────────────

  const handleSendOTP = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your full name");
      return;
    }
    if (phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number");
      return;
    }
    if (!password) {
      Alert.alert("Password Required", "Please create a password");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "Please make sure both passwords match");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to send OTP");

      setStep("otp");
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
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

  const handleVerifyOTP = async (enteredOtp?: string) => {
    const fullOtp = enteredOtp || otp.join("");
    if (fullOtp.length < 6) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `+91${phone}`,
          code: fullOtp,
          role: "DRIVER",
          name: name.trim(),
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Verification failed");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Set authentication using the driver store
      const { setAuthenticated } = useDriverStore.getState();
      setAuthenticated(data.user.name, data.user.phone, data.token);
      router.replace("/onboarding");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid OTP", err.message);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setStep("form");
    setOtp(["", "", "", "", "", ""]);
    setPassword("");
    setConfirmPassword("");
    setName("");
  };

  // ── Render ───────────────────────────────────────────────────

  const renderForm = () => (
    <View style={styles.formSection}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mode === "signin" && styles.tabActive]}
          onPress={() => switchMode("signin")}
        >
          <Text style={[styles.tabText, mode === "signin" && styles.tabTextActive]}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === "signup" && styles.tabActive]}
          onPress={() => switchMode("signup")}
        >
          <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.formTitle}>
        {mode === "signin" ? "Welcome Back!" : "Join as Driver"}
      </Text>
      <Text style={styles.formSubtitle}>
        {mode === "signin"
          ? "Sign in with your phone number and password"
          : "Create your account to start delivering"}
      </Text>

      {/* Name field — sign up only */}
      {mode === "signup" && (
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
      )}

      {/* Phone */}
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

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputContainer}>
          <Feather name="lock" size={18} color={Colors.primary} />
          <TextInput
            style={styles.input}
            placeholder={mode === "signin" ? "Enter your password" : "Create a password (6+ chars)"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* Confirm Password — sign up only */}
      {mode === "signup" && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="shield" size={18} color={Colors.primary} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      )}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={mode === "signin" ? handleSignIn : handleSendOTP}
        disabled={loading}
      >
        {loading ? (
          <Text style={styles.primaryButtonText}>
            {mode === "signin" ? "Signing in..." : "Sending OTP..."}
          </Text>
        ) : (
          <>
            <Text style={styles.primaryButtonText}>
              {mode === "signin" ? "Sign In" : "Get OTP"}
            </Text>
            <Feather name={mode === "signin" ? "log-in" : "arrow-right"} size={20} color={Colors.white} />
          </>
        )}
      </TouchableOpacity>

      {/* Bottom switch hint */}
      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => switchMode(mode === "signin" ? "signup" : "signin")}
      >
        <Text style={styles.switchText}>
          {mode === "signin"
            ? "Don't have an account? Sign Up"
            : "Already have an account? Sign In"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTP = () => (
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
          setStep("form");
          setOtp(["", "", "", "", "", ""]);
        }}
      >
        <Feather name="arrow-left" size={20} color={Colors.text} />
      </TouchableOpacity>

      <Text style={styles.formTitle}>Verify Phone</Text>
      <Text style={styles.formSubtitle}>
        Enter the 6-digit code sent to{'\n'}+91 {phone}
      </Text>
      <Text style={styles.demoHint}>Demo OTP: {MOCK_OTP}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={(r) => { otpRefs.current[idx] = r; }}
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
          <Text style={styles.primaryButtonText}>Creating account...</Text>
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
            <Feather name="check" size={20} color={Colors.white} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={handleSendOTP}>
        <Text style={styles.resendText}>Resend OTP</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >        <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 40 : 10),
            paddingBottom: Math.max(insets.bottom, 16),
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

        {step === "form" ? renderForm() : renderOTP()}
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
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    gap: 6,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  formSection: {
    gap: 14,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: -6,
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
  // ── Tabs ──
  tabRow: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  // ── Inputs ──
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
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
  // ── Buttons ──
  primaryButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  // ── OTP ──
  otpContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginVertical: 4,
  },
  otpBox: {
    width: 44,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  // ── Navigation ──
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
  switchButton: {
    alignItems: "center",
    paddingVertical: 2,
  },
  switchText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
