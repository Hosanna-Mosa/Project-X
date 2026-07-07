import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
            <Ionicons name="cloud-download-outline" size={40} color="#ffffff" />
          </View>

          <Text style={styles.title}>New Version Available!</Text>
          <Text style={styles.subtitle}>Update FLAVOUR to get the latest features and improved experience.</Text>

          {forceUpdate && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={16} color="#ba1a1a" />
              <Text style={styles.warningText}>This update is mandatory to continue using the application.</Text>
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
    backgroundColor: "rgba(0, 32, 69, 0.6)", // matching app deep blue overlay
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
    backgroundColor: "#002045", // deep blue theme
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#002045",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#002045",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#43474e",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#ba1a1a",
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
    backgroundColor: "#002045",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#002045",
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
    color: "#74777f",
    fontWeight: "600",
    fontSize: 13,
  },
});
