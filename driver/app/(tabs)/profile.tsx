import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { StatusCard } from "@/components/StatusCard";
import { VehicleCard } from "@/components/VehicleCard";
import { useDriverStore } from "@/store/driverStore";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

type Status = "valid" | "expired" | "pending";

interface ProfileResponse {
  account: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
    phone: string;
    profilePic: string | null;
    role: string;
    defaultLocation: { type: string; coordinates: number[] } | null;
    addresses: { label: string; receiverName?: string; addressLine: string; phone: string }[];
    createdAt: string;
    updatedAt: string;
  };
  driver: {
    id: string;
    status: string;
    isAvailable: boolean;
    currentLocation: { type: string; coordinates: number[] } | null;
    onboardingStatus: string;
    onboardingCompletedAt: string | null;
    gender: string | null;
    vehicleType: string | null;
    aadhaarNumber: string | null;
    aadhaarVerified: boolean;
    panNumber: string | null;
    panImage: string | null;
    dlNumber: string | null;
    dlExpiry: string | null;
    dlFrontImage: string | null;
    dlBackImage: string | null;
    bankAccountNumber: string | null;
    bankIfsc: string | null;
    bankVerified: boolean;
    selfieImage: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  verification: {
    identity: boolean;
    drivingLicense: Status;
    bank: boolean;
    selfie: boolean;
    documentsComplete: boolean;
  };
  vehicle: {
    type: string | null;
    label: string;
    insuranceStatus: Status;
  };
  stats: {
    completedTrips: number;
    rating: number;
    acceptanceRate: number;
  };
}

interface Field {
  label: string;
  value: string;
}

const emptyProfile: ProfileResponse | null = null;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const token = useDriverStore((s) => s.token);
  const logout = useDriverStore((s) => s.logout);
  const resetOnboarding = useDriverStore((s) => s.resetOnboarding);
  const [profile, setProfile] = useState<ProfileResponse | null>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const loadProfile = useCallback(async (refreshing = false) => {
    if (!apiUrl || !token) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/drivers/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load profile");
      setProfile(data);
    } catch (error: any) {
      Alert.alert("Profile unavailable", error.message || "Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const initials = useMemo(() => {
    const name = profile?.account.name || "Driver";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.account.name]);

  const sections = useMemo(() => {
    if (!profile) return [];
    const driver = profile.driver;

    return [
      {
        key: "personal",
        icon: "user" as const,
        title: "Personal Info",
        subtitle: profile.account.phone,
        fields: [
          field("Name", profile.account.name),
          field("Username", profile.account.username),
          field("Email", profile.account.email),
          field("Phone", profile.account.phone),
          field("Role", profile.account.role),
          field("Gender", driver?.gender),
          field("Member Since", formatMonthYear(profile.account.createdAt)),
          field("Last Updated", formatDate(profile.account.updatedAt)),
        ],
      },
      {
        key: "documents",
        icon: "file-text" as const,
        title: "Document Center",
        subtitle: profile.verification.documentsComplete ? "All required documents complete" : "Some documents are pending",
        fields: [
          field("Onboarding Status", driver?.onboardingStatus),
          field("Aadhaar", driver?.aadhaarNumber),
          field("Aadhaar Verified", yesNo(driver?.aadhaarVerified)),
          field("PAN", driver?.panNumber),
          field("PAN Image", available(driver?.panImage)),
          field("Driving License", driver?.dlNumber),
          field("DL Expiry", formatDate(driver?.dlExpiry)),
          field("DL Front Image", available(driver?.dlFrontImage)),
          field("DL Back Image", available(driver?.dlBackImage)),
          field("Selfie Image", available(driver?.selfieImage)),
          field("Completed At", formatDate(driver?.onboardingCompletedAt)),
        ],
      },
      {
        key: "vehicle",
        icon: "truck" as const,
        title: "Vehicle Details",
        subtitle: profile.vehicle.label,
        fields: [
          field("Vehicle Type", profile.vehicle.label),
          field("Insurance Status", profile.vehicle.insuranceStatus),
          field("Driver Available", yesNo(driver?.isAvailable)),
          field("Driver Status", driver?.status),
          field("Current Latitude", driver?.currentLocation?.coordinates?.[1]?.toString()),
          field("Current Longitude", driver?.currentLocation?.coordinates?.[0]?.toString()),
        ],
      },
      {
        key: "bank",
        icon: "credit-card" as const,
        title: "Payout Bank",
        subtitle: profile.verification.bank ? "Verified for cash out" : "Bank verification pending",
        fields: [
          field("Bank Account", driver?.bankAccountNumber),
          field("IFSC", driver?.bankIfsc),
          field("Bank Verified", yesNo(driver?.bankVerified)),
        ],
      },
      {
        key: "settings",
        icon: "settings" as const,
        title: "Settings",
        subtitle: "Account, addresses and app status",
        fields: [
          field("Default Location", formatCoordinates(profile.account.defaultLocation?.coordinates)),
          field("Saved Addresses", String(profile.account.addresses.length)),
          field("Driver ID", driver?.id),
          field("User ID", profile.account.id),
          field("Driver Created", formatDate(driver?.createdAt)),
          field("Driver Updated", formatDate(driver?.updatedAt)),
        ],
      },
      {
        key: "support",
        icon: "message-circle" as const,
        title: "Support",
        subtitle: "Share these IDs with support",
        fields: [
          field("Phone", profile.account.phone),
          field("Driver ID", driver?.id),
          field("User ID", profile.account.id),
          field("Completed Trips", String(profile.stats.completedTrips)),
        ],
      },
    ];
  }, [profile]);

  const selectedSection = sections.find((section) => section.key === activeSection);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/auth");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadProfile(true)} />}
      >
        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : !profile ? (
          <View style={styles.loadingCard}>
            <Text style={styles.emptyText}>Profile data is not available.</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.avatarWrap}>
                {profile.account.profilePic ? (
                  <Image source={{ uri: profile.account.profilePic }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
              <Text style={styles.name}>{profile.account.name}</Text>
              <Text style={styles.memberSince}>Member since {formatMonthYear(profile.account.createdAt)}</Text>
              <View style={styles.ratingBadge}>
                <Feather name="star" size={12} color={Colors.white} />
                <Text style={styles.ratingText}>{profile.stats.rating.toFixed(1)}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatPill label="Trips" value={String(profile.stats.completedTrips)} />
              <StatPill label="Acceptance" value={`${profile.stats.acceptanceRate}%`} />
              <StatPill label="Status" value={profile.driver?.status || "New"} />
            </View>

            <View style={styles.statusRow}>
              <StatusCard title="Driving License" status={profile.verification.drivingLicense} />
              <View style={{ width: 10 }} />
              <StatusCard title="Vehicle Insurance" status={profile.vehicle.insuranceStatus} />
            </View>

            <VehicleCard
              model={profile.vehicle.label}
              plate={profile.driver?.dlNumber || "No license added"}
              onPress={() => setActiveSection("vehicle")}
            />

            <View style={styles.menuCard}>
              {sections.map((item) => (
                <Pressable key={item.key} style={styles.menuItem} onPress={() => setActiveSection(item.key)}>
                  <View style={styles.menuIconContainer}>
                    <Feather name={item.icon} size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.menuCopy}>
                    <Text style={styles.menuLabel}>{item.title}</Text>
                    <Text style={styles.menuSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.signOutButton}
              onPress={handleLogout}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>

            <Pressable
              style={styles.devButton}
              onPress={() => {
                resetOnboarding();
                router.replace("/onboarding");
              }}
            >
              <Text style={styles.devBadge}>DEV</Text>
              <Text style={styles.devButtonText}>Retake Onboarding</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(selectedSection)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveSection(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSection?.title}</Text>
              <Pressable style={styles.closeButton} onPress={() => setActiveSection(null)}>
                <Feather name="x" size={18} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {selectedSection?.fields.map((item) => (
                <FieldRow key={item.label} label={item.label} value={item.value} />
              ))}
              {selectedSection?.key === "settings" && profile?.account.addresses.map((address, index) => (
                <FieldRow
                  key={`${address.label}-${index}`}
                  label={`Address ${index + 1}`}
                  value={`${address.label}: ${address.addressLine}`}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FieldRow({ label, value }: Field) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function field(label: string, value: unknown): Field {
  return { label, value: value === null || value === undefined || value === "" ? "Not added" : String(value) };
}

function yesNo(value?: boolean) {
  if (value === undefined || value === null) return "No";
  return value ? "Yes" : "No";
}

function available(value?: string | null) {
  return value ? "Uploaded" : "Not uploaded";
}

function formatDate(value?: string | null) {
  if (!value) return "Not added";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthYear(value?: string | null) {
  if (!value) return "Not added";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function formatCoordinates(coordinates?: number[]) {
  if (!coordinates || coordinates.length < 2) return "Not added";
  return `${coordinates[1]}, ${coordinates[0]}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  header: {
    alignItems: "center",
    paddingVertical: 16,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: Colors.primary,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  memberSince: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  ratingText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.white,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusRow: {
    flexDirection: "row",
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  menuSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  signOutButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.error,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.error,
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  devBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.surface,
    backgroundColor: Colors.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  devButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    maxHeight: "78%",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    paddingHorizontal: 16,
  },
  fieldRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
});
