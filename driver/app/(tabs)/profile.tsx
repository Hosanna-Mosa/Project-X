import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TextInput,
  TouchableOpacity,
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

interface BankAccountInfo {
  accountNumber: string;
  ifsc: string;
  verified: boolean;
  isDefault: boolean;
}

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
    bankAccounts?: BankAccountInfo[];
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

// ─── GENDER OPTIONS ───────────────────────────────────────────────────────────
const GENDERS = [
  { id: "male", label: "Male", icon: "user" as const },
  { id: "female", label: "Female", icon: "user" as const },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const token = useDriverStore((s) => s.token);
  const logout = useDriverStore((s) => s.logout);
  const resetOnboarding = useDriverStore((s) => s.resetOnboarding);
  const setIdentityVerified = useDriverStore((s) => s.setIdentityVerified);
  const [profile, setProfile] = useState<ProfileResponse | null>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Edit form state ──────────────────────────────────────────────────────
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState<string | null>(null);

  // ── Change password state ────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // ── Add bank account state ───────────────────────────────────────────────
  const [showBankForm, setShowBankForm] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState("");
  const [newBankIfsc, setNewBankIfsc] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);

  const loadProfile = useCallback(async (refreshing = false) => {
    if (!apiUrl || !token) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/drivers/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        logout();
        router.replace("/auth");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load profile");
      setProfile(data);
      if (data.verification?.identity != null) {
        setIdentityVerified(data.verification.identity);
      }
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

  // ── Enter edit mode ──────────────────────────────────────────────────────
  const handleStartEditing = () => {
    if (!profile) return;
    setEditName(profile.account.name || "");
    setEditUsername(profile.account.username || "");
    setEditEmail(profile.account.email || "");
    setEditPhone(profile.account.phone || "");
    setEditGender(profile.driver?.gender || null);
    setIsEditing(true);
  };

  // ── Save edited personal info ────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!token) return;
    if (!editName.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }

    setIsSaving(true);
    try {
      const body: Record<string, string> = { name: editName.trim() };
      if (editUsername.trim()) body.username = editUsername.trim();
      if (editEmail.trim()) body.email = editEmail.trim();
      if (editPhone.trim()) body.phone = editPhone.trim();
      if (editGender) body.gender = editGender;

      const response = await fetch(`${apiUrl}/api/v1/drivers/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update profile");

      setProfile(data.profile);
      setIsEditing(false);
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword) {
      Alert.alert("Validation", "Fill in all password fields");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Validation", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "Passwords do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to change password");

      Alert.alert("Success", "Password changed successfully.");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ── Add bank account ─────────────────────────────────────────────────────
  const handleAddBankAccount = async () => {
    if (!token) return;
    if (newBankAccount.length < 9 || newBankIfsc.length < 8) {
      Alert.alert("Validation", "Enter valid bank account and IFSC code");
      return;
    }

    setIsSavingBank(true);
    try {
      // Use the onboarding PATCH endpoint to add a bank account
      const response = await fetch(`${apiUrl}/api/v1/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankAccountNumber: newBankAccount,
          bankIfsc: newBankIfsc,
          bankVerified: false,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to add bank account");
      }

      // Reload profile to show new account
      await loadProfile();
      setShowBankForm(false);
      setNewBankAccount("");
      setNewBankIfsc("");
      Alert.alert("Added", "Bank account added successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add bank account");
    } finally {
      setIsSavingBank(false);
    }
  };

  // ── Handle selecting gender in edit mode ─────────────────────────────────
  const handleGenderSelect = (gender: string) => {
    setEditGender(gender);
  };

  // ── Sections data ────────────────────────────────────────────────────────
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
          field("Gender", driver?.gender),
          field("Member Since", formatMonthYear(profile.account.createdAt)),
        ],
      },
      {
        key: "documents",
        icon: "file-text" as const,
        title: "Document Center",
        subtitle: profile.verification.documentsComplete
          ? "All required documents complete"
          : "Some documents are pending",
        fields: [
          field("Onboarding Status", driver?.onboardingStatus),
          field("Aadhaar", driver?.aadhaarNumber),
          field("Aadhaar Verified", yesNo(driver?.aadhaarVerified)),
          field("PAN", driver?.panNumber),
          field("Driving License", driver?.dlNumber),
          field("DL Expiry", formatDate(driver?.dlExpiry)),
          field("DL Status", profile.verification.drivingLicense),
          field("Selfie", available(driver?.selfieImage)),
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
          field("Driver Status", driver?.status),
        ],
      },
      {
        key: "bank",
        icon: "credit-card" as const,
        title: "Payout Settings",
        subtitle: profile.verification.bank
          ? "Bank account ready for cash out"
          : "Add a bank account for payouts",
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
        subtitle: "Account preferences",
        fields: [
          field("Default Location", formatCoordinates(profile.account.defaultLocation?.coordinates)),
          field("Saved Addresses", String(profile.account.addresses.length)),
          field("Member Since", formatDate(profile.account.createdAt)),
        ],
      },
      {
        key: "support",
        icon: "message-circle" as const,
        title: "Support",
        subtitle: "Get help with your account",
        fields: [
          field("Phone", profile.account.phone),
          field("Email", profile.account.email || "Not added"),
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

  const handleCloseModal = () => {
    setActiveSection(null);
    setIsEditing(false);
    setShowPasswordForm(false);
    setShowBankForm(false);
    setNewBankAccount("");
    setNewBankIfsc("");
  };

  // ── Render modal content by section ──────────────────────────────────────
  const renderSectionContent = () => {
    if (!selectedSection) return null;

    // ── PERSONAL INFO ──────────────────────────────────────────────────────
    if (selectedSection.key === "personal") {
      if (isEditing) {
        return (
          <View style={modalStyles.formWrap}>
            <EditField
              label="Name"
              value={editName}
              onChangeText={setEditName}
              icon="user"
              placeholder="Your name"
            />
            <EditField
              label="Username"
              value={editUsername}
              onChangeText={setEditUsername}
              icon="at-sign"
              placeholder="username"
              autoCapitalize="none"
            />
            <EditField
              label="Email"
              value={editEmail}
              onChangeText={setEditEmail}
              icon="mail"
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <EditField
              label="Phone"
              value={editPhone}
              onChangeText={setEditPhone}
              icon="phone"
              placeholder="Phone number"
              keyboardType="phone-pad"
            />

            <Text style={modalStyles.fieldLabel}>Gender</Text>
            <View style={modalStyles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    modalStyles.genderOption,
                    editGender === g.id && modalStyles.genderOptionActive,
                  ]}
                  onPress={() => handleGenderSelect(g.id)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={g.icon}
                    size={16}
                    color={editGender === g.id ? Colors.white : Colors.textMuted}
                  />
                  <Text
                    style={[
                      modalStyles.genderText,
                      editGender === g.id && modalStyles.genderTextActive,
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={modalStyles.editActions}>
              <Pressable
                style={modalStyles.cancelBtn}
                onPress={() => setIsEditing(false)}
              >
                <Text style={modalStyles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                <Text style={modalStyles.saveBtnText}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      }

      return (
        <View>
          {selectedSection.fields.map((item) => (
            <FieldRow key={item.label} label={item.label} value={item.value} />
          ))}
          <Pressable style={modalStyles.editButton} onPress={handleStartEditing}>
            <Feather name="edit-2" size={15} color={Colors.primary} />
            <Text style={modalStyles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </View>
      );
    }

    // ── DOCUMENTS ──────────────────────────────────────────────────────────
    if (selectedSection.key === "documents") {
      return (
        <View>
          {selectedSection.fields.map((item) => (
            <FieldRow key={item.label} label={item.label} value={item.value} />
          ))}

          {/* Add missing document buttons */}
          {profile && (
            <View style={modalStyles.docActions}>
              {!profile.driver?.panNumber && (
                <Pressable
                  style={modalStyles.docAddBtn}
                  onPress={() => {
                    handleCloseModal();
                    router.push("/identity-verify");
                  }}
                >
                  <Feather name="plus-circle" size={16} color={Colors.primary} />
                  <Text style={modalStyles.docAddText}>Add PAN Card</Text>
                </Pressable>
              )}
              {!profile.driver?.dlNumber && (
                <Pressable
                  style={modalStyles.docAddBtn}
                  onPress={() => {
                    handleCloseModal();
                    router.push("/onboarding");
                  }}
                >
                  <Feather name="plus-circle" size={16} color={Colors.primary} />
                  <Text style={modalStyles.docAddText}>Add Driving License</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      );
    }

    // ── VEHICLE (read-only) ─────────────────────────────────────────────────
    if (selectedSection.key === "vehicle") {
      return (
        <View>
          {selectedSection.fields.map((item) => (
            <FieldRow key={item.label} label={item.label} value={item.value} />
          ))}
          <View style={modalStyles.infoBox}>
            <Feather name="info" size={14} color={Colors.textMuted} />
            <Text style={modalStyles.infoText}>
              Vehicle details can only be updated through the onboarding process.
            </Text>
          </View>
        </View>
      );
    }

    // ── BANK / PAYOUT ───────────────────────────────────────────────────────
    if (selectedSection.key === "bank") {
      const bankAccounts = profile?.driver?.bankAccounts || [];
      return (
        <View>
          {selectedSection.fields.map((item) => (
            <FieldRow key={item.label} label={item.label} value={item.value} />
          ))}

          {/* List multiple bank accounts */}
          {bankAccounts.length > 0 && (
            <View style={modalStyles.bankList}>
              <Text style={modalStyles.bankListTitle}>Your Bank Accounts</Text>
              {bankAccounts.map((ba, idx) => (
                <View key={idx} style={modalStyles.bankItem}>
                  <View style={modalStyles.bankItemDot}>
                    <Feather
                      name={ba.verified ? "check-circle" : "clock"}
                      size={16}
                      color={ba.verified ? Colors.success : Colors.warning}
                    />
                  </View>
                  <View style={modalStyles.bankItemCopy}>
                    <Text style={modalStyles.bankItemNumber}>
                      {ba.accountNumber}
                    </Text>
                    <Text style={modalStyles.bankItemIfsc}>IFSC: {ba.ifsc}</Text>
                  </View>
                  {ba.isDefault && (
                    <View style={modalStyles.defaultBadge}>
                      <Text style={modalStyles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {showBankForm ? (
            <View style={modalStyles.bankFormWrap}>
              <Text style={modalStyles.bankFormTitle}>Add Bank Account</Text>
              <EditField
                label="Account Number"
                value={newBankAccount}
                onChangeText={(t) => setNewBankAccount(t.replace(/[^0-9]/g, "").slice(0, 18))}
                icon="credit-card"
                placeholder="Enter account number"
                keyboardType="number-pad"
              />
              <EditField
                label="IFSC Code"
                value={newBankIfsc}
                onChangeText={(t) => setNewBankIfsc(t.toUpperCase().slice(0, 11))}
                icon="map-pin"
                placeholder="SBIN0001234"
                autoCapitalize="characters"
              />
              <View style={modalStyles.editActions}>
                <Pressable
                  style={modalStyles.cancelBtn}
                  onPress={() => {
                    setShowBankForm(false);
                    setNewBankAccount("");
                    setNewBankIfsc("");
                  }}
                >
                  <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[modalStyles.saveBtn, isSavingBank && { opacity: 0.6 }]}
                  onPress={handleAddBankAccount}
                  disabled={isSavingBank}
                >
                  <Text style={modalStyles.saveBtnText}>
                    {isSavingBank ? "Adding..." : "Add Account"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={modalStyles.editButton}
              onPress={() => setShowBankForm(true)}
            >
              <Feather name="plus-circle" size={15} color={Colors.primary} />
              <Text style={modalStyles.editButtonText}>
                {bankAccounts.length >= 3
                  ? "Maximum 3 accounts reached"
                  : "Add Bank Account"}
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    // ── SETTINGS ────────────────────────────────────────────────────────────
    if (selectedSection.key === "settings") {
      return (
        <View>
          {selectedSection.fields.map((item) => (
            <FieldRow key={item.label} label={item.label} value={item.value} />
          ))}
          {profile?.account.addresses.map((address, index) => (
            <FieldRow
              key={`${address.label}-${index}`}
              label={`Address ${index + 1}`}
              value={`${address.label}: ${address.addressLine}`}
            />
          ))}

          {/* Change Password */}
          {showPasswordForm ? (
            <View style={modalStyles.passwordForm}>
              <EditField
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                icon="lock"
                placeholder="Enter current password"
                secureTextEntry
              />
              <EditField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                icon="lock"
                placeholder="At least 6 characters"
                secureTextEntry
              />
              <EditField
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                icon="check-square"
                placeholder="Re-enter new password"
                secureTextEntry
              />
              <View style={modalStyles.editActions}>
                <Pressable
                  style={modalStyles.cancelBtn}
                  onPress={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[modalStyles.saveBtn, isSavingPassword && { opacity: 0.6 }]}
                  onPress={handleChangePassword}
                  disabled={isSavingPassword}
                >
                  <Text style={modalStyles.saveBtnText}>
                    {isSavingPassword ? "Updating..." : "Update Password"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={modalStyles.editButton}
              onPress={() => setShowPasswordForm(true)}
            >
              <Feather name="lock" size={15} color={Colors.primary} />
              <Text style={modalStyles.editButtonText}>Change Password</Text>
            </Pressable>
          )}
        </View>
      );
    }

    // ── SUPPORT ─────────────────────────────────────────────────────────────
    if (selectedSection.key === "support") {
      return (
        <View>
          {selectedSection.fields.map((item) => (
            <FieldRow key={item.label} label={item.label} value={item.value} />
          ))}
          <View style={modalStyles.supportBox}>
            <Feather name="headphones" size={20} color={Colors.primary} />
            <Text style={modalStyles.supportTitle}>Need help?</Text>
            <Text style={modalStyles.supportText}>
              Contact our support team at support@triozen.com or call us at
              +91-XXXXX-XXXXX for assistance.
            </Text>
          </View>
        </View>
      );
    }

    // Fallback: show fields
    return selectedSection.fields.map((item) => (
      <FieldRow key={item.label} label={item.label} value={item.value} />
    ));
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

      {/* ── Section Detail Modal ────────────────────────────────────────────── */}
      <Modal
        visible={Boolean(selectedSection)}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSection?.title}</Text>
              <Pressable style={styles.closeButton} onPress={handleCloseModal}>
                <Feather name="x" size={18} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {renderSectionContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

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

function EditField({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon?: keyof typeof Feather.glyphMap;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={modalStyles.editFieldGroup}>
      <Text style={modalStyles.fieldLabel}>{label}</Text>
      <View style={modalStyles.editFieldContainer}>
        {icon && <Feather name={icon} size={16} color={Colors.primary} />}
        <TextInput
          style={modalStyles.editInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType || "default"}
          autoCapitalize={autoCapitalize || "none"}
          secureTextEntry={secureTextEntry}
        />
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

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

// ─── Modal-specific styles ────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  // ── Edit mode ────────────────────────────────────────────────────────────
  formWrap: {
    paddingVertical: 8,
    gap: 4,
  },
  editFieldGroup: {
    marginBottom: 14,
  },
  editFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    backgroundColor: Colors.background,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genderOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textMuted,
  },
  genderTextActive: {
    color: Colors.white,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textMuted,
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.white,
  },

  // ── Edit button (view mode) ──────────────────────────────────────────────
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  editButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },

  // ── Document actions ─────────────────────────────────────────────────────
  docActions: {
    gap: 10,
    marginTop: 12,
  },
  docAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    backgroundColor: Colors.surface,
  },
  docAddText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },

  // ── Info box (vehicle) ───────────────────────────────────────────────────
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    marginTop: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // ── Bank accounts ────────────────────────────────────────────────────────
  bankList: {
    marginTop: 12,
  },
  bankListTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    marginBottom: 8,
  },
  bankItemDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bankItemCopy: {
    flex: 1,
  },
  bankItemNumber: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  bankItemIfsc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  defaultBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  bankFormWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bankFormTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },

  // ── Password form ────────────────────────────────────────────────────────
  passwordForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // ── Support ──────────────────────────────────────────────────────────────
  supportBox: {
    alignItems: "center",
    gap: 8,
    padding: 20,
    marginTop: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
  },
  supportTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  supportText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
});
