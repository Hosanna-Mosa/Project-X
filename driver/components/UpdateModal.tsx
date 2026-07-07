import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";

interface UpdateModalProps {
  visible: boolean;
  forceUpdate: boolean;
  storeUrl: string;
  onDismiss: () => void;
}

export default function UpdateModal({ visible, forceUpdate, storeUrl, onDismiss }: UpdateModalProps) {
  if (!visible) return null;

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch(err => console.error("Failed to open store URL:", err));
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      hardwareAccelerated={true}
      onRequestClose={() => {
        if (!forceUpdate) onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather name="download-cloud" size={40} color="#ffffff" />
          </View>

          <Text style={styles.title}>New Driver App Version!</Text>
          <Text style={styles.subtitle}>Update the FLAVOUR Driver app to continue receiving orders smoothly.</Text>

          {forceUpdate && (
            <View style={styles.warningContainer}>
              <Feather name="alert-triangle" size={16} color="#ef4444" />
              <Text style={styles.warningText}>This update is mandatory to continue online duties.</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} activeOpacity={0.85}>
              <Text style={styles.updateText}>Update Now</Text>
            </TouchableOpacity>

            {!forceUpdate && (
              <TouchableOpacity style={styles.laterButton} onPress={onDismiss} activeOpacity={0.8}>
                <Text style={styles.laterText}>Maybe Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)", // slate-900 transparent
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0ea5e9", // sky blue driver primary
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#ef4444",
    lineHeight: 14,
  },
  buttonContainer: {
    width: "100%",
    gap: 10,
  },
  updateButton: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  updateText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  laterButton: {
    width: "100%",
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  laterText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 13,
  },
});
