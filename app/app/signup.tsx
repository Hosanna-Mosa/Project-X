import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens, type ServiceTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";

type PasswordStrength = "empty" | "weak" | "fair" | "good";

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  return "good";
}

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { phone: prefillPhone } = useLocalSearchParams<{ phone: string }>();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(prefillPhone || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { requestOTP, loading, token, isInitialized } = useAuthStore();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const isPhoneDisabled = !!prefillPhone;
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Guard: already logged-in users should not see signup
  useEffect(() => {
    if (isInitialized && token) {
      router.replace("/(tabs)");
    }
  }, [isInitialized, token]);

  const handleRegister = async () => {
    if (name.trim().length < 3) {
      Alert.alert("Invalid Name", "Please enter your full name (minimum 3 characters).");
      return;
    }
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Invalid Password", "Password must be at least 8 characters long.");
      return;
    }
    if (!agreedToTerms) {
      Alert.alert("Terms & Privacy Policy", "Please agree to the Terms and Privacy Policy to continue.");
      return;
    }

    try {
      // The account isn't created here — a real OTP has to verify the phone
      // first. verifyOTP on the next screen carries name/email/password
      // through and creates the account once the code checks out.
      const trimmedPhone = phoneNumber.trim();
      await requestOTP(trimmedPhone);
      router.push({
        pathname: "/otp",
        params: { phone: trimmedPhone, name: name.trim(), email: email.trim(), password },
      });
    } catch (error: any) {
      Alert.alert("Couldn't send code", error.message || "Something went wrong. Please try again.");
    }
  };

  const canSubmit = !!name && !!phoneNumber && !!email && !!password && agreedToTerms && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Back button */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
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
        {/* Centered like the sign-in screen's hero — same treatment, not a one-off */}
        <View style={styles.heroBlock}>
          <Text style={styles.headline} numberOfLines={1}>Create your account</Text>
          <Text style={styles.subhead}>
            Takes about a minute. We'll verify your phone with an OTP.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Rahul Verma"
                placeholderTextColor={tokens.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Phone number</Text>
            <View
              style={[
                styles.inputContainer,
                styles.inputContainerAccent,
                isPhoneDisabled && styles.inputContainerDisabled,
              ]}
            >
              <Text style={styles.inputPrefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="98490 21734"
                placeholderTextColor={tokens.muted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                editable={!isPhoneDisabled}
              />
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="rahul.verma@gmail.com"
                placeholderTextColor={tokens.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
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
                placeholder="Min. 8 characters"
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
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      barFillFor(passwordStrength, i, tokens),
                    ]}
                  />
                ))}
                <Text style={[styles.strengthLabel, strengthLabelColor(passwordStrength, tokens)]}>
                  {strengthLabelText(passwordStrength)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Ionicons name="checkmark" size={moderateScale(14)} color={accent.on} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.legalHighlight}>Terms</Text> and{" "}
            <Text style={styles.legalHighlight}>Privacy Policy</Text>.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signUpBtn, !canSubmit && styles.signUpBtnDisabled]}
          onPress={handleRegister}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={accent.on} />
          ) : (
            <Text style={styles.signUpBtnText}>Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLinkRow}
          onPress={() => router.replace("/login")}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLinkText}>
            Already have one? <Text style={styles.loginLinkHighlight}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function barFillFor(strength: PasswordStrength, index: number, tokens: ThemeTokens) {
  const filled =
    (strength === "weak" && index === 0) ||
    (strength === "fair" && index <= 1) ||
    (strength === "good" && index <= 2);
  return { backgroundColor: filled ? (strength === "weak" ? tokens.error : tokens.success) : tokens.sunken };
}

function strengthLabelColor(strength: PasswordStrength, tokens: ThemeTokens) {
  return { color: strength === "weak" ? tokens.error : tokens.success };
}

function strengthLabelText(strength: PasswordStrength) {
  if (strength === "weak") return "Weak";
  if (strength === "fair") return "Fair";
  if (strength === "good") return "Good";
  return "";
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
    // Same cap as the sign-in screen's hero block — centered, not a huge gap.
    maxHeight: moderateScale(200),
    minHeight: moderateScale(120),
  },
  headline: {
    // Same size as the sign-in screen's headline — kept identical on purpose.
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
  form: {
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
    gap: 9,
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
  inputContainerDisabled: {
    opacity: 0.6,
  },
  inputPrefix: {
    fontFamily: fontFamilies.body.medium,
    fontSize: moderateScale(15),
    color: tokens.sec,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.body.medium,
    fontSize: moderateScale(15),
    color: tokens.text,
    height: "100%",
  },
  eyeBtn: {
    padding: 4,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  strengthLabel: {
    fontFamily: fontFamilies.body.semibold,
    fontSize: moderateScale(12),
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 24,
  },
  checkbox: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(6),
    borderWidth: 1.5,
    borderColor: tokens.borderStrong,
    backgroundColor: tokens.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: accent.accent,
    borderColor: accent.accent,
  },
  termsText: {
    flex: 1,
    fontFamily: fontFamilies.body.regular,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
    color: tokens.sec,
  },
  legalHighlight: {
    fontFamily: fontFamilies.body.semibold,
    color: accent.accent,
  },
  signUpBtn: {
    marginTop: 14,
    height: moderateScale(52),
    borderRadius: moderateScale(14),
    backgroundColor: accent.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  signUpBtnDisabled: {
    opacity: 0.5,
  },
  signUpBtnText: {
    fontFamily: fontFamilies.body.bold,
    color: accent.on,
    fontSize: moderateScale(15),
  },
  loginLinkRow: {
    marginTop: 16,
    alignItems: "center",
  },
  loginLinkText: {
    fontFamily: fontFamilies.body.regular,
    fontSize: moderateScale(14),
    color: tokens.sec,
  },
  loginLinkHighlight: {
    fontFamily: fontFamilies.body.semibold,
    color: accent.accent,
  },
});
