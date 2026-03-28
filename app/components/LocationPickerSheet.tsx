import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationPickerSheet({ isOpen, onClose }: Props) {
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <View style={styles.sheet}>
          <TouchableOpacity 
            style={styles.floatingCloseBtn}
            onPress={onClose}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.title}>Select delivery location</Text>
          
          <View style={styles.searchRow}>
            <Feather name="search" size={18} color={Colors.light.textMuted} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search for area, street name..."
              placeholderTextColor={Colors.light.textMuted}
            />
          </View>

          <View style={styles.quickActionBox}>
            <TouchableOpacity style={styles.actionRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <FontAwesome5 name="crosshairs" size={16} color="#166534" />
              </View>
              <Text style={[styles.actionText, { color: '#166534' }]}>Use current location</Text>
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <Feather name="plus" size={18} color="#166534" />
              </View>
              <Text style={[styles.actionText, { color: '#166534' }]}>Add new address</Text>
              <Feather name="chevron-right" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionText}>Your saved addresses</Text>
          </View>

          <View style={styles.addressCard}>
            <View style={styles.addressMain}>
              <View style={styles.addressIconWrap}>
                <Feather name="home" size={20} color="#F59E0B" />
              </View>
              <View style={styles.addressContent}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressType}>Home</Text>
                  <Text style={styles.addressDistance}>1212.92 km away</Text>
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
                  Hhghh, uuhygghhj, Purani Idgah Colony, Model Town, Idgah Colony, Agra
                </Text>
                <Text style={styles.addressPhone}>Phone number: 9398334115</Text>
                
                <View style={styles.addressActions}>
                  <TouchableOpacity style={styles.circleBtn}>
                    <Feather name="more-horizontal" size={16} color={Colors.light.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.circleBtn}>
                    <Feather name="share-2" size={16} color={Colors.light.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, // Full screen for Modal
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: "flex-end", // Align sheet to bottom
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingBottom: 50,
    gap: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 30,
  },
  floatingCloseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -68,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  quickActionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 74,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    padding: 16, // Reduced from 20
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  addressMain: {
    flexDirection: "row",
    gap: 14, // Reduced from 18
  },
  addressIconWrap: {
    width: 40, // Reduced from 48
    height: 40, // Reduced from 48
    borderRadius: 12, // Reduced from 16
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  addressContent: {
    flex: 1,
    gap: 2, // Reduced from 6
  },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressType: {
    fontSize: 16, // Reduced from 18
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  addressDistance: {
    fontSize: 10, // Reduced from 12
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  addressText: {
    fontSize: 13, // Reduced from 14
    color: "#64748B", 
    lineHeight: 18,
    fontWeight: "500",
  },
  addressPhone: {
    fontSize: 12, // Reduced from 13
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "600",
  },
  addressActions: {
    flexDirection: "row",
    gap: 10, // Reduced from 14
    marginTop: 8, // Reduced from 12
  },
  circleBtn: {
    width: 32, // Reduced from 36
    height: 32, // Reduced from 36
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
});
