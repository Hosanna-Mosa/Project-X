import { Feather, Ionicons } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

/** A short local reference so a user has something to quote to support —
 * there's no crash-reporting service (Sentry etc.) wired into this app, so
 * this is a timestamp-derived tag generated on-device, not a lookup key
 * into any real server-side crash log. */
function localCrashRef(): string {
  return Date.now().toString(36).slice(-6);
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [crashRef] = useState(localCrashRef);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const handleReport = async () => {
    if (reported) return;
    setReporting(true);
    try {
      await customFetch("/api/v1/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: `App crash · ref ${crashRef}`,
          category: "OPERATIONAL ISSUE",
          message: `The app crashed with: "${error.message}". Local reference ${crashRef}.`,
        }),
      });
      setReported(true);
    } catch (reportError) {
      console.error("Failed to file crash report:", reportError);
    } finally {
      setReporting(false);
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) details += `Stack Trace:\n${error.stack}`;
    return details;
  };

  const monoFont = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

  return (
    <View style={styles.container}>
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          style={({ pressed }) => [styles.topButton, { top: insets.top + 16, opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="alert-circle" size={20} color={tokens.text} />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="warning" size={20} color={tokens.error} />
        </View>
        <Text style={styles.title}>Something broke</Text>
        <Text style={styles.message}>This screen crashed. Your cart and orders are safe.</Text>

        <Pressable onPress={handleRestart} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.9 : 1 }]}>
          <Text style={styles.buttonText}>Reload screen</Text>
        </Pressable>

        <TouchableOpacity onPress={handleReport} disabled={reporting || reported} style={styles.reportButton} activeOpacity={0.8}>
          <Text style={styles.reportButtonText}>{reported ? "Reported — thank you" : reporting ? "Sending…" : "Report this"}</Text>
        </TouchableOpacity>

        <Text style={styles.refText}>ref {crashRef}</Text>
      </View>

      {__DEV__ ? (
        <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Error details</Text>
                <Pressable onPress={() => setIsModalVisible(false)} accessibilityLabel="Close error details" accessibilityRole="button" style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}>
                  <Feather name="x" size={24} color={tokens.text} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator>
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { fontFamily: monoFont }]} selectable>{formatErrorDetails()}</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    container: { flex: 1, width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: tokens.bg },
    content: { alignItems: "center", justifyContent: "center", width: "100%", maxWidth: 340 },
    icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: tokens.errorSkin, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    title: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text, textAlign: "center" },
    message: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(20), color: tokens.sec, textAlign: "center", marginTop: 8, marginBottom: 20 },
    topButton: { position: "absolute", right: 16, width: 44, height: 44, borderRadius: 8, backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center", zIndex: 10 },
    button: { width: "100%", minHeight: moderateScale(48), borderRadius: 14, backgroundColor: accent.accent, alignItems: "center", justifyContent: "center" },
    buttonText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(14), color: accent.on },
    reportButton: { width: "100%", minHeight: moderateScale(44), borderRadius: 14, borderWidth: 1, borderColor: tokens.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 8 },
    reportButtonText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.sec },
    refText: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: moderateScale(10), color: tokens.muted, marginTop: 12 },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContainer: { width: "100%", height: "90%", backgroundColor: tokens.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tokens.border },
    modalTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(18), color: tokens.text },
    closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    errorContainer: { width: "100%", borderRadius: 12, overflow: "hidden", padding: 16, backgroundColor: tokens.sunken },
    errorText: { fontSize: 12, lineHeight: 18, width: "100%", color: tokens.text },
  });
