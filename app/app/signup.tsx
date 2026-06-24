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
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(phone || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { verifyOTP, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const isPhoneDisabled = !!phone;

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
      // Create user using OTP endpoint with dummy code since OTP verification already occurred
      const result = await verifyOTP(
        phoneNumber.trim(),
        "123456",
        "USER",
        name.trim(),
        email.trim(),
        password
      );
      if (result.success) {
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
          <Text style={styles.cardTitle}>Create account</Text>
          <Text style={styles.cardSubtitle}>
            Welcome! Please enter your details to start.
          </Text>

          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color="#43474e" style={styles.inputIcon} />
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
                <Ionicons name="phone-portrait-outline" size={18} color="#43474e" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isPhoneDisabled && styles.inputDisabled]}
                  placeholder="+1 (555) 000-0000"
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
              <Text style={styles.fieldLabel}>Email</Text>
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

            {/* Password Input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color="#43474e" style={styles.inputIcon} />
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
                    size={20} 
                    color="#43474e" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up button */}
            <TouchableOpacity
              style={[
                styles.signUpBtn,
                (!name || !email || !password || loading) && styles.signUpBtnDisabled
              ]}
              onPress={handleRegister}
              disabled={!name || !email || !password || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.signUpBtnText}>
                {loading ? "Signing up..." : "Sign Up"}
              </Text>
              {!loading && (
                <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>
          </View>

          {/* Already have account row */}
          <TouchableOpacity 
            style={styles.loginLinkRow} 
            onPress={() => router.replace("/")}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkHighlight}>Log in</Text>
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
    backgroundColor: "#f7f9fb", // Neutral background color
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
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  fieldWrapper: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#191c1e",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f4f6", // container low background
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
  },
  inputContainerDisabled: {
    backgroundColor: "#eceef0", // dimmer background for disabled
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
  inputDisabled: {
    color: "#74777f",
  },
  eyeBtn: {
    padding: 6,
  },
  signUpBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#002045", // brand primary deep blue
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signUpBtnDisabled: {
    backgroundColor: "#c4c6cf", // disabled gray
  },
  signUpBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  loginLinkRow: {
    marginTop: 20,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 14,
    color: "#43474e",
  },
  loginLinkHighlight: {
    color: "#0061a5", // secondary action blue
    fontWeight: "700",
  },
});
