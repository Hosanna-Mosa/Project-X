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
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useAuthStore } from "@/contexts/authStore";
import { useThemeStore } from "@/contexts/themeStore";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [name, setName] = useState("");
  const { verifyOTP, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const handleRegister = async () => {
    if (name.length < 3) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }
    try {
      const result = await verifyOTP(phone!, "123456", "USER", name);
      if (result.success) {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Registration failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Complete Profile</Text>
          <Text style={styles.subtitle}>
            Tell us your name to get started with your account.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John Doe"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.btn, (!name || loading) && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={!name || loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Creating account..." : "Complete Signup"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 28, gap: 32 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  form: { gap: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnDisabled: { backgroundColor: colors.textMuted },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
