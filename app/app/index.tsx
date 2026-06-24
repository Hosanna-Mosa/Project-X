import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
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

  const { loginWithPassword, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

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
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Failed to sign in. Please check your credentials.");
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Password recovery instructions will be sent to your account.");
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Top Header Row */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          style={styles.brandTitleContainer} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#002045" style={styles.backArrow} />
          <Text style={styles.brandTitle}>Flavor</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipBtn} 
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.85}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Feather name="chevron-right" size={16} color="#43474e" />
        </TouchableOpacity>
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
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor="#74777f"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
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
              <Text style={styles.signInBtnText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
              {!loading && (
                <Ionicons name="arrow-forward" size={18} color="#002045" style={{ marginLeft: 6 }} />
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
    backgroundColor: "#f7f9fb", // Neutral background
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: "#f7f9fb",
  },
  brandTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backArrow: {
    marginRight: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#002045", // Primary brand color
    letterSpacing: -0.5,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff", // white container card
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
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
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#eceef0", // surface-container
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
    backgroundColor: "#ffffff", // active tab white card
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
    color: "#0061a5", // secondary action blue
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f4f6", // container low background
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
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
    borderColor: "#002045", // brand primary deep blue outline
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
    color: "#0061a5", // secondary action blue
    fontWeight: "700",
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#c4c6cf",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#43474e",
    marginRight: 2,
  },
});
