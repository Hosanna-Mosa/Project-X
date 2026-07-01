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
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"Phone" | "Email">("Phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { loginWithPassword, loading, token, isInitialized } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  // Guard: if a token already exists, skip straight to the app.
  // This handles the edge case where the user navigates back to "/" while still logged in.
  useEffect(() => {
    if (isInitialized && token) {
      router.replace("/(tabs)");
    }
  }, [isInitialized, token]);

  const handleSignIn = async () => {
    const identifier = activeTab === "Phone" ? phone.trim() : email.trim();
    if (!identifier) {
      Alert.alert("Error", `Please enter your ${activeTab === "Phone" ? "phone number" : "email address"}`);
      return;
    }
    if (activeTab === "Phone" && identifier.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }
    if (activeTab === "Email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    try {
      await loginWithPassword(identifier, password, "USER");
      // Token is now saved in AsyncStorage & store → navigate in
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Failed to sign in. Please check your credentials.");
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Password recovery instructions will be sent to your account.");
  };

  // Show a loading indicator while auth state is being restored
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
      {/* Top Header */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.brandTitle}>Flavor</Text>
        <Text style={styles.brandTagline}>Your city, delivered.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to track your real-time deliveries
          </Text>

          {/* Segmented Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "Phone" && styles.tabActive]}
              onPress={() => setActiveTab("Phone")}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, activeTab === "Phone" && styles.tabTextActive]}>
                Phone
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "Email" && styles.tabActive]}
              onPress={() => setActiveTab("Email")}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, activeTab === "Email" && styles.tabTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditional input fields */}
          <View style={styles.form}>
            {activeTab === "Phone" ? (
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="phone-portrait-outline" size={18} color="#43474e" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#74777f"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color="#43474e" style={styles.inputIcon} />
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
            )}

            {/* Password input field */}
            <View style={styles.fieldWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color="#43474e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
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
                    size={20}
                    color="#43474e"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In CTA Button */}
            <TouchableOpacity
              style={[
                styles.signInBtn,
                (!password || (activeTab === "Phone" ? !phone : !email) || loading) && styles.signInBtnDisabled
              ]}
              onPress={handleSignIn}
              disabled={(!password || (activeTab === "Phone" ? !phone : !email) || loading)}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#002045" />
              ) : (
                <>
                  <Text style={styles.signInBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#002045" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Don't have account row */}
          <TouchableOpacity
            style={styles.signUpLinkRow}
            onPress={() => router.replace("/signup")}
            activeOpacity={0.7}
          >
            <Text style={styles.signUpLinkText}>
              Don't have an account? <Text style={styles.signUpLinkHighlight}>Create Account</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "#f7f9fb",
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#002045",
    letterSpacing: -1,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    color: "#43474e",
    fontWeight: "500",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    width: "100%",
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#191c1e",
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#43474e",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#eceef0",
    borderRadius: 10,
    padding: 4,
    height: 46,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#43474e",
  },
  tabTextActive: {
    color: "#191c1e",
    fontWeight: "700",
  },
  form: {
    gap: 16,
  },
  fieldWrapper: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#191c1e",
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0061a5",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f4f6",
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#191c1e",
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },
  signInBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#002045",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signInBtnDisabled: {
    borderColor: "#c4c6cf",
    backgroundColor: "#f2f4f6",
  },
  signInBtnText: {
    color: "#002045",
    fontSize: 16,
    fontWeight: "700",
  },
  signUpLinkRow: {
    marginTop: 24,
    alignItems: "center",
  },
  signUpLinkText: {
    fontSize: 14,
    color: "#43474e",
  },
  signUpLinkHighlight: {
    color: "#0061a5",
    fontWeight: "700",
  },
});
