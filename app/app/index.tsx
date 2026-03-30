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
import { Alert } from "react-native";

const { width } = Dimensions.get("window");

export default function AuthScreen() {
  const [phone, setPhone] = useState("");
  const { requestOTP, loading } = useAuthStore();

  const handleContinue = async () => {
    if (phone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
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
                placeholderTextColor={Colors.light.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.continueBtn,
                (!phone.length || loading) && styles.continueBtnDisabled,
              ]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={!phone.length || loading}
            >
              <Text style={styles.continueBtnText}>
                {loading ? "Please wait..." : "Continue"}
              </Text>
              {!loading && (
                <Feather name="arrow-right" size={18} color="#fff" />
              )}
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

const styles = StyleSheet.create({
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
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  headerSection: {
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: Colors.light.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  connectCard: {
    backgroundColor: "rgba(14,165,233,0.08)",
    borderRadius: 20,
    paddingVertical: 40,
    alignItems: "center",
    gap: 20,
  },
  connectIconWrap: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  hub: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    position: "absolute",
  },
  spoke: {
    position: "absolute",
    width: 2,
    height: 32,
    backgroundColor: Colors.light.primary,
    borderRadius: 1,
    top: 8,
    transformOrigin: "center 32px",
  },
  connectLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.primary,
    letterSpacing: 2,
  },
  formSection: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  countryCode: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  continueBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  continueBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  terms: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
});
