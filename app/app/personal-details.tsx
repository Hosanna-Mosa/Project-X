import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { useAuthStore } from "@/contexts/authStore";
import { customFetch } from "@/utils/api/custom-fetch";

export default function PersonalDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  // The three fields above only seed from whatever the store happened to hold
  // at mount, which is empty on a cold start or while the profile refetch is
  // still in flight. Pull the authoritative profile and fill in any field the
  // user hasn't started editing, so the real email always shows up.
  const editedFields = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    customFetch<any>("/api/v1/users/profile")
      .then((data) => {
        if (!data || cancelled) return;
        setUser(data);
        if (!editedFields.current.has("name")) setName(data.name || "");
        if (!editedFields.current.has("username")) setUsername(data.username || "");
        if (!editedFields.current.has("email")) setEmail(data.email || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const editField = (field: string, setter: (v: string) => void) => (value: string) => {
    editedFields.current.add(field);
    setter(value);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = await customFetch<any>("/api/v1/users/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, username, email }),
      });
      if (data) {
        setUser(data);
        router.back();
      }
    } catch (err: any) {
      Alert.alert("Couldn't save", err.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal details</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12 }}>
          <View>
            <Text style={styles.label}>Full name</Text>
            <TextInput style={styles.field} value={name} onChangeText={editField("name", setName)} placeholder="Your name" placeholderTextColor={tokens.muted} />
          </View>
          <View>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.field} value={username} onChangeText={editField("username", setUsername)} placeholder="@handle" autoCapitalize="none" placeholderTextColor={tokens.muted} />
          </View>
          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput style={[styles.field, { borderColor: accent.accent, borderWidth: 2 }]} value={email} onChangeText={editField("email", setEmail)} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={tokens.muted} />
          </View>
          <View>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.phoneField}>
              <Text style={styles.phoneText}>{user?.phone || "—"}</Text>
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedPillText}>Verified</Text>
              </View>
            </View>
            <Text style={styles.phoneHint}>This is your login number. Contact <Text style={styles.phoneHintLink} onPress={() => router.push("/support")}>support</Text> to change it — there's no self-serve way to re-verify a new number yet.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={accent.on} /> : <Text style={styles.saveBtnText}>Update profile</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20), backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    label: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 6 },
    field: { borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, minHeight: 52, paddingHorizontal: 14, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text, backgroundColor: tokens.surface },

    phoneField: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.sunken, borderRadius: 12, minHeight: 52, paddingHorizontal: 14 },
    phoneText: { flex: 1, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.sec },
    verifiedPill: { backgroundColor: tokens.successSkin, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
    verifiedPillText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 0.5, textTransform: "uppercase", color: tokens.success },
    phoneHint: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginTop: 6 },
    phoneHintLink: { color: accent.accent, fontFamily: fontFamilies.body.semibold },

    footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: tokens.surface, borderTopWidth: 1, borderTopColor: tokens.border, paddingHorizontal: 16, paddingTop: 14 },
    saveBtn: { backgroundColor: accent.accent, borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center" },
    saveBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15), color: accent.on },
  });
