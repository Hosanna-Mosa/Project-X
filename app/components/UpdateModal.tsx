import React, { useMemo } from "react";
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";

interface UpdateModalProps {
  visible: boolean;
  forceUpdate: boolean;
  storeUrl: string;
  onDismiss: () => void;
}

export default function UpdateModal({ visible, forceUpdate, storeUrl, onDismiss }: UpdateModalProps) {
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  if (!visible) return null;

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch((err) => console.error("Failed to open store URL:", err));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      hardwareAccelerated
      // A forced update has no dismiss path — the hardware back button /
      // Android gesture must not be able to close it either.
      onRequestClose={forceUpdate ? () => {} : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="arrow-up" size={22} color={accent.on} />
          </View>
          <Text style={styles.title}>{forceUpdate ? "Update required" : "New version available"}</Text>
          <Text style={styles.subtitle}>
            {forceUpdate
              ? "This update changes how your account stays secure. You'll need it to keep using Flavour."
              : "Update Flavour to get the latest features and improvements."}
          </Text>

          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} activeOpacity={0.85}>
            <Text style={styles.updateText}>Update now</Text>
          </TouchableOpacity>

          {forceUpdate ? (
            <Text style={styles.forceNote}>No dismiss — required release</Text>
          ) : (
            <TouchableOpacity style={styles.laterButton} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.laterText}>Maybe later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 },
    card: { width: "100%", maxWidth: 340, backgroundColor: tokens.surface, borderRadius: 20, padding: 22, alignItems: "center" },
    iconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: accent.accent, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    title: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text, textAlign: "center" },
    subtitle: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(19), color: tokens.sec, textAlign: "center", marginTop: 8, marginBottom: 18 },
    updateButton: { width: "100%", minHeight: moderateScale(48), borderRadius: 14, backgroundColor: accent.accent, alignItems: "center", justifyContent: "center" },
    updateText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.on },
    laterButton: { width: "100%", minHeight: moderateScale(44), alignItems: "center", justifyContent: "center", marginTop: 4 },
    laterText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.sec },
    forceNote: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(11), color: tokens.muted, marginTop: 12 },
  });
