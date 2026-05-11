import React, { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";
import { Alert } from "react-native";

const { width } = Dimensions.get("window");

export default function AuthScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const { requestOTP, loginWithPassword, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const handleContinue = async () => {
    if (phone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    if (isPasswordMode) {
      if (!password) {
        Alert.alert("Error", "Please enter your password");
        return;
      }
      try {
        await loginWithPassword(phone, password, "USER");
        router.replace("/(tabs)");
      } catch (error: any) {
        Alert.alert("Error", error.message || "Login failed");
      }
      return;
    }

    try {
      await requestOTP(phone);
      router.push({
        pathname: "/otp",
        params: { phone }
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send OTP");
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBox}>
            <View style={styles.logoIconWrap}>
              <Feather name="truck" size={28} color="#fff" />
            </View>
          </View>

          <View style={styles.headerSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Welcome to </Text>
              <Text style={[styles.title, styles.titleAccent]}>Precision</Text>
            </View>
            <Text style={styles.subtitle}>
              Your global logistics infrastructure, distilled into a single interface.
            </Text>
          </View>

          <View style={styles.connectCard}>
            <View style={styles.connectIconWrap}>
              <View style={styles.hub}>
                <View style={styles.centerDot} />
                {[0, 72, 144, 216, 288].map((angle, i) => (
                  <View
                    key={i}
                    style={[
                      styles.spoke,
                      {
                        transform: [{ rotate: `${angle}deg` }],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.connectLabel}>CONNECT &amp; SYNC</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+1</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter mobile number"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>

            {isPasswordMode && (
              <>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.phoneRow}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.continueBtn,
                (!phone.length || loading || (isPasswordMode && !password.length)) && styles.continueBtnDisabled,
              ]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={!phone.length || loading || (isPasswordMode && !password.length)}
            >
              <Text style={styles.continueBtnText}>
                {loading ? "Please wait..." : isPasswordMode ? "Login" : "Continue"}
              </Text>
              {!loading && (
                <Feather name="arrow-right" size={18} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleModeBtn}
              onPress={() => setIsPasswordMode(!isPasswordMode)}
            >
              <Text style={styles.toggleModeText}>
                {isPasswordMode ? "Use OTP Login" : "Use Password Login"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            By continuing, you agree to the{" "}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 28,
  },
  logoBox: {
    alignSelf: "flex-start",
  },
  logoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  headerSection: {
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  connectCard: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    gap: 12,
  },
  connectIconWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  hub: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    position: "absolute",
  },
  spoke: {
    position: "absolute",
    width: 2,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: 1,
    top: 6,
  },
  connectLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 2,
  },
  formSection: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  countryCode: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBtnDisabled: {
    backgroundColor: colors.textMuted,
    shadowOpacity: 0,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  terms: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  toggleModeBtn: {
    marginTop: 12,
    alignItems: "center",
  },
  toggleModeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
