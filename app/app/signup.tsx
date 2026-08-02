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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import Colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { phone: prefillPhone } = useLocalSearchParams<{ phone: string }>();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(prefillPhone || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { register, loading, token, isInitialized } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const isPhoneDisabled = !!prefillPhone;

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

    try {
      // Uses the dedicated register action which saves the token in AsyncStorage
      const result = await register(name.trim(), phoneNumber.trim(), email.trim(), password);
      if (result.success) {
        // Token is now persisted — go into the app
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "Something went wrong during sign up.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Top Header */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/login");
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={moderateScale(24)} color="#002045" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={{ width: moderateScale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join Flavor</Text>
          <Text style={styles.cardSubtitle}>
            Fill in your details to get started.
          </Text>

          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={moderateScale(18)} color="#43474e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#74777f"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={[styles.inputContainer, isPhoneDisabled && styles.inputContainerDisabled]}>
                <Ionicons name="phone-portrait-outline" size={moderateScale(18)} color="#43474e" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isPhoneDisabled && styles.inputDisabled]}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#74777f"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  editable={!isPhoneDisabled}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={moderateScale(18)} color="#43474e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#74777f"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={moderateScale(18)} color="#43474e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#74777f"
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
                    size={moderateScale(20)}
                    color="#43474e"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up button */}
            <TouchableOpacity
              style={[
                styles.signUpBtn,
                (!name || !phoneNumber || !email || !password || loading) && styles.signUpBtnDisabled
              ]}
              onPress={handleRegister}
              disabled={!name || !phoneNumber || !email || !password || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.signUpBtnText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={moderateScale(18)} color="#ffffff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Already have account row */}
          <TouchableOpacity
            style={styles.loginLinkRow}
            onPress={() => router.replace("/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f7f9fb",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#f7f9fb",
  },
  backBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6e8ea",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.heading2.fontSize,
    fontWeight: typography.heading2.fontWeight,
    color: "#191c1e",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    width: "100%",
  },
  cardTitle: {
    fontSize: typography.heading1.fontSize,
    fontWeight: typography.weights.bold,
    color: "#191c1e",
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: typography.body.fontSize,
    color: "#43474e",
    textAlign: "center",
    lineHeight: moderateScale(20),
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  fieldWrapper: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: typography.bodySecondary.fontSize,
    fontWeight: typography.weights.semibold,
    color: "#191c1e",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f4f6",
    borderRadius: moderateScale(10),
    height: moderateScale(50),
    paddingHorizontal: 12,
  },
  inputContainerDisabled: {
    backgroundColor: "#eceef0",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: "#191c1e",
    height: "100%",
  },
  inputDisabled: {
    color: "#74777f",
  },
  eyeBtn: {
    padding: 8,
  },
  signUpBtn: {
    height: moderateScale(52),
    borderRadius: moderateScale(12),
    backgroundColor: "#002045",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signUpBtnDisabled: {
    backgroundColor: "#c4c6cf",
  },
  signUpBtnText: {
    color: "#ffffff",
    fontSize: typography.buttonText.fontSize,
    fontWeight: typography.buttonText.fontWeight,
  },
  loginLinkRow: {
    marginTop: 24,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: typography.body.fontSize,
    color: "#43474e",
  },
  loginLinkHighlight: {
    color: "#0061a5",
    fontWeight: typography.weights.bold,
  },
});
