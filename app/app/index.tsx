import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  // Arrival Animation States for "FLAVOUR"
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = React.useRef(new Animated.Value(1)).current;
  const letters = ["F", "L", "A", "V", "O", "U", "R"];
  const translateAnim = React.useRef(letters.map(() => new Animated.Value(0))).current;
  const opacityAnim = React.useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Set up spring arrival animations from opposite vertical directions
    const animations = letters.map((_, idx) => {
      const isOdd = idx % 2 !== 0;
      translateAnim[idx].setValue(isOdd ? -450 : 450);
      opacityAnim[idx].setValue(0);

      return Animated.parallel([
        Animated.spring(translateAnim[idx], {
          toValue: 0,
          tension: 40,
          friction: 6.5,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim[idx], {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        })
      ]);
    });

    Animated.sequence([
      Animated.delay(200),
      Animated.stagger(120, animations),
      Animated.delay(1200), // Let the complete name rest in the center
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowSplash(false);
    });
  }, []);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const { loginWithPassword, requestOTP, loading, token, isInitialized } = useAuthStore();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = React.useMemo(() => createStyles(tokens, accent), [theme]);

  // Guard: if a token already exists, skip straight to the app.
  // This handles the edge case where the user navigates back to "/" while still logged in.
  useEffect(() => {
    if (!showSplash && isInitialized && token) {
      router.replace("/(tabs)");
    }
  }, [showSplash, isInitialized, token]);

  const handleSignIn = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your phone number or email");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    try {
      await loginWithPassword(trimmed, password, "USER");
      // Token is now saved in AsyncStorage & store → navigate in
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Failed to sign in. Please check your credentials.");
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Password recovery instructions will be sent to your account.");
  };

  const handleContinueWithOtp = async () => {
    const trimmed = identifier.trim();
    const digitsOnly = trimmed.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      Alert.alert("Phone number needed", "Enter your phone number above to continue with an OTP.");
      return;
    }
    setSendingOtp(true);
    try {
      await requestOTP(digitsOnly);
      router.push({ pathname: "/otp", params: { phone: digitsOnly } });
    } catch (error: any) {
      Alert.alert("Couldn't send code", error.message || "Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Show a loading indicator while auth state is being restored
  if (showSplash) {
    return (
      <Animated.View style={{
        flex: 1,
        backgroundColor: "#002045", // deep blue branding background
        justifyContent: "center",
        alignItems: "center",
        opacity: splashOpacity,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {letters.map((letter, idx) => (
            <Animated.Text
              key={idx}
              style={{
                fontSize: 48,
                fontWeight: "900",
                color: "#ffffff",
                marginHorizontal: 4,
                textTransform: "uppercase",
                letterSpacing: 2,
                transform: [{ translateY: translateAnim[idx] }],
                opacity: opacityAnim[idx],
                textShadowColor: "rgba(0,0,0,0.3)",
                textShadowOffset: { width: 0, height: 4 },
                textShadowRadius: 6,
              }}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>
      </Animated.View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#002045" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingTop: Math.max(insets.top, 24) + 24, minHeight: "100%" }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark + headline, centered in the space above the form */}
        <View style={styles.heroBlock}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>F</Text>
          </View>

          <Text style={styles.headline} numberOfLines={1}>Welcome back</Text>
          <Text style={styles.subhead}>
            Food, meat, rides, helpers and courier runs. One app.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Phone or email</Text>
            <View style={[styles.inputContainer, styles.inputContainerAccent]}>
              <TextInput
                style={styles.input}
                placeholder="98490 21734"
                placeholderTextColor={tokens.muted}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={tokens.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                  size={moderateScale(18)}
                  color={tokens.sec}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.forgotRow}>
            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In CTA */}
          <TouchableOpacity
            style={[styles.signInBtn, (!identifier || !password || loading) && styles.signInBtnDisabled]}
            onPress={handleSignIn}
            disabled={!identifier || !password || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={accent.on} />
            ) : (
              <Text style={styles.signInBtnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* OTP alternative */}
        <TouchableOpacity
          style={styles.otpBtn}
          onPress={handleContinueWithOtp}
          disabled={sendingOtp}
          activeOpacity={0.85}
        >
          {sendingOtp ? (
            <ActivityIndicator size="small" color={tokens.text} />
          ) : (
            <Text style={styles.otpBtnText}>Continue with OTP instead</Text>
          )}
        </TouchableOpacity>

        {/* Create account link */}
        <TouchableOpacity
          onPress={() => router.replace("/signup")}
          activeOpacity={0.7}
          style={styles.signUpLinkRow}
        >
          <Text style={styles.signUpLinkText}>
            New here? <Text style={styles.signUpLinkHighlight}>Create an account</Text>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Capped close to the block's actual content height so "centered" doesn't
    // read as a big empty gap before the form — just gentle breathing room.
    maxHeight: moderateScale(200),
    minHeight: moderateScale(140),
  },
  logoMark: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(18),
    backgroundColor: accent.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logoMarkText: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: moderateScale(28),
    color: accent.on,
  },
  headline: {
    fontFamily: fontFamilies.heading.bold,
    fontSize: moderateScale(38),
    lineHeight: moderateScale(40),
    letterSpacing: -1.4,
    color: tokens.text,
    textAlign: "center",
  },
  subhead: {
    fontFamily: fontFamilies.body.regular,
    marginTop: 14,
    fontSize: moderateScale(16),
    lineHeight: moderateScale(22),
    color: tokens.sec,
    textAlign: "center",
  },
  form: {
    marginTop: 36,
    gap: 12,
  },
  fieldWrapper: {
    gap: 7,
  },
  fieldLabel: {
    fontFamily: fontFamilies.body.bold,
    fontSize: moderateScale(11),
    letterSpacing: 1,
    textTransform: "uppercase",
    color: tokens.muted,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.surface,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    minHeight: moderateScale(52),
    paddingHorizontal: 14,
  },
  inputContainerAccent: {
    borderWidth: 2,
    borderColor: accent.accent,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.body.medium,
    fontSize: moderateScale(15),
    color: tokens.text,
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },
  forgotRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  forgotText: {
    fontFamily: fontFamilies.body.semibold,
    fontSize: moderateScale(13),
    color: accent.accent,
    paddingVertical: 4,
  },
  signInBtn: {
    height: moderateScale(52),
    borderRadius: moderateScale(14),
    backgroundColor: accent.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  signInBtnDisabled: {
    opacity: 0.5,
  },
  signInBtnText: {
    fontFamily: fontFamilies.body.bold,
    color: accent.on,
    fontSize: moderateScale(15),
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.border,
  },
  dividerText: {
    fontFamily: fontFamilies.body.medium,
    fontSize: moderateScale(12),
    color: tokens.muted,
  },
  otpBtn: {
    marginTop: 16,
    minHeight: moderateScale(52),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    backgroundColor: tokens.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  otpBtnText: {
    fontFamily: fontFamilies.body.semibold,
    fontSize: moderateScale(15),
    color: tokens.text,
  },
  signUpLinkRow: {
    marginTop: 20,
    alignItems: "center",
  },
  signUpLinkText: {
    fontFamily: fontFamilies.body.regular,
    fontSize: moderateScale(14),
    color: tokens.sec,
  },
  signUpLinkHighlight: {
    fontFamily: fontFamilies.body.semibold,
    color: accent.accent,
  },
});
