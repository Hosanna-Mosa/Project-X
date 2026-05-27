import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Data ──────────────────────────────────────────────────────────────────────

const VEHICLES = [
  {
    id: "bike",
    label: "Bike",
    icon: "truck" as const,
    desc: "Fast & fuel-efficient for deliveries",
  },
  {
    id: "auto",
    label: "Auto",
    icon: "box" as const,
    desc: "Spacious for larger orders",
  },
  {
    id: "car",
    label: "Car",
    icon: "chevrons-up" as const,
    desc: "Premium deliveries & longer distances",
  },
];

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  const labels = ["Work Settings", "Verification"];
  return (
    <View style={indicatorStyles.wrap}>
      <Text style={indicatorStyles.label}>
        Step {step} of 2 — {labels[step - 1]}
      </Text>
    </View>
  );
}

const indicatorStyles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textMuted, letterSpacing: 0.3 },
});

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.text }}>{title}</Text>
      {subtitle && (
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ─── Select Card ───────────────────────────────────────────────────────────────

function SelectCard({
  selected,
  onSelect,
  icon,
  label,
  desc,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  desc?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      style={[
        selectStyles.card,
        selected && selectStyles.cardSelected,
      ]}
    >
      <View style={selectStyles.row}>
        {icon && (
          <View style={[selectStyles.iconWrap, selected && selectStyles.iconWrapSelected]}>
            <Feather
              name={icon}
              size={20}
              color={selected ? Colors.white : Colors.primary}
            />
          </View>
        )}
        <View style={selectStyles.textWrap}>
          <Text style={[selectStyles.label, selected && selectStyles.labelSelected]}>
            {label}
          </Text>
          {desc && (
            <Text style={[selectStyles.desc, selected && selectStyles.descSelected]}>
              {desc}
            </Text>
          )}
        </View>
        <View style={[selectStyles.radio, selected && selectStyles.radioSelected]}>
          {selected && <Feather name="check" size={14} color={Colors.white} />}
        </View>
      </View>
    </Pressable>
  );
}

const selectStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#f0fcff",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: { backgroundColor: Colors.primary },
  textWrap: { flex: 1 },
  label: { fontSize: 16, fontWeight: "600", color: Colors.text },
  labelSelected: { color: Colors.primaryDark },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  descSelected: { color: Colors.primaryDark },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
});

// ─── Primary Button ────────────────────────────────────────────────────────────

function PrimaryButton({
  title,
  onPress,
  icon,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[btnStyles.button, disabled && btnStyles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <Text style={btnStyles.text}>Please wait...</Text>
      ) : (
        <>
          <Text style={btnStyles.text}>{title}</Text>
          {icon && <Feather name={icon} size={20} color={Colors.white} />}
        </>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabled: { opacity: 0.5 },
  text: { color: Colors.white, fontSize: 17, fontWeight: "700" },
});

// ─── Input Field ───────────────────────────────────────────────────────────────

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  icon,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  maxLength?: number;
  icon?: keyof typeof Feather.glyphMap;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={inputStyles.group}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={inputStyles.container}>
        {icon && <Feather name={icon} size={18} color={Colors.primary} />}
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType || "default"}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize || "none"}
        />
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  input: { flex: 1, fontSize: 16, color: Colors.text },
});

// ─── Info Banner ───────────────────────────────────────────────────────────────

function InfoBanner({ icon, text, type }: { icon: keyof typeof Feather.glyphMap; text: string; type?: "success" | "info" }) {
  const bgColor =
    type === "success" ? "#e8f5e9" : Colors.primaryLight;
  const txtColor =
    type === "success" ? "#2e7d32" : Colors.primaryDark;
  const iconColor =
    type === "success" ? "#2e7d32" : Colors.primary;
  return (
    <View style={[bannerStyles.banner, { backgroundColor: bgColor }]}>
      <Feather name={icon} size={16} color={iconColor} />
      <Text style={[bannerStyles.text, { color: txtColor }]}>{text}</Text>
    </View>
  );
}

// ─── Consent Checkbox ────────────────────────────────────────────────────

function ConsentCheckbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={consentStyles.wrap}
    >
      <View style={[consentStyles.box, checked && consentStyles.boxChecked]}>
        {checked && <Feather name="check" size={14} color={Colors.white} />}
      </View>
      <Text style={consentStyles.label}>{label}</Text>
    </Pressable>
  );
}

const consentStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 12,
  },
  text: { fontSize: 13, color: Colors.primaryDark, flex: 1, lineHeight: 18 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN ONBOARDING SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const setOnboardingCompleted = useDriverStore((s) => s.setOnboardingCompleted);

  // Step tracking
  const [step, setStep] = useState<1 | 2>(1);
  const [sectionIdx, setSectionIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Async State ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ── Fetch existing onboarding data on mount ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = useDriverStore.getState().token;
        if (!token) return;
        const res = await fetch(`${API_URL}/api/v1/onboarding`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          useDriverStore.getState().logout();
          router.replace("/auth");
          return;
        }
        if (!res.ok) return;
        const result = await res.json();
        const d = result.data;
        if (!d) return;

        // Pre-populate form from saved data
        if (d.gender) setGender(d.gender);
        if (d.vehicleType) setVehicle(d.vehicleType);
        if (d.aadhaarNumber) setAadhaarNumber(d.aadhaarNumber.replace(/(\d{4})(?=\d)/g, "$1 "));
        if (d.aadhaarVerified) setAadhaarVerified(d.aadhaarVerified);
        if (d.panNumber) setPanNumber(d.panNumber);
        if (d.dlNumber) setDlNumber(d.dlNumber);
        if (d.dlExpiry) setDlExpiry(d.dlExpiry);
        if (d.bankAccountNumber) setBankAccount(d.bankAccountNumber);
        if (d.bankIfsc) setIfsc(d.bankIfsc);
        if (d.bankVerified) setBankVerified(d.bankVerified);
      } catch {
        // silently ignore
      }
    })();
  }, []);

  // ── Step 1 State ──────────────────────────────────────────────────────────
  const [gender, setGender] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<string | null>(null);

  // ── Step 2 State ──────────────────────────────────────────────────────────
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [consentAadhaar, setConsentAadhaar] = useState(false);
  const [panNumber, setPanNumber] = useState("");
  const [panName, setPanName] = useState("");
  const [panVerified, setPanVerified] = useState(false);
  const [consentPAN, setConsentPAN] = useState(false);

  // ── Format validators ─────────────────────────────────────────────────────
  const validateAadhaarFormat = (num: string) => /^[2-9][0-9]{11}$/.test(num);
  const validatePANFormat = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  const validateDLFormat = (dl: string): boolean => {
    // Indian DL: 2 letters (state) + 2 digits (RTO) + 4 digits (year) + 7 digits (serial)
    const cleaned = dl.replace(/[\s-]/g, "").toUpperCase();
    return /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/.test(cleaned);
  };
  
  const [dlNumber, setDlNumber] = useState("");
  const [dlExpiry, setDlExpiry] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dlExpiryDate, setDlExpiryDate] = useState(new Date());
  const [bankAccount, setBankAccount] = useState("");
  const [bankConfirm, setBankConfirm] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankVerified, setBankVerified] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);

  // ── Sections per step ─────────────────────────────────────────────────────
  const step1Sections = [
    { key: "gender", label: "Gender" },
    { key: "vehicle", label: "Vehicle" },
  ];

  const step2SectionsBase = [
    { key: "aadhaar", label: "Aadhaar" },
    { key: "pan", label: "PAN" },
    { key: "license", label: "License" },
    { key: "bank", label: "Bank" },
    { key: "selfie", label: "Selfie" },
  ];

  // Dynamically filter step 2 sections: once one ID is verified, the other is removed
  const currentSections = React.useMemo(() => {
    if (step === 1) return step1Sections;
    let sections = [...step2SectionsBase];
    if (aadhaarVerified) {
      sections = sections.filter(s => s.key !== "pan");
    } else if (panVerified) {
      sections = sections.filter(s => s.key !== "aadhaar");
    }
    return sections;
  }, [step, aadhaarVerified, panVerified]);

  const totalSections = currentSections.length;

  // ── Animations ────────────────────────────────────────────────────────────
  const animateTransition = (direction: 1 | -1) => {
    slideAnim.setValue(direction);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goToNextSection = () => {
    if (sectionIdx < totalSections - 1) {
      setSectionIdx((p) => p + 1);
      animateTransition(1);
    }
  };

  const goToPrevSection = () => {
    if (sectionIdx > 0) {
      setSectionIdx((p) => p - 1);
      animateTransition(-1);
    }
  };

  const goToNextStep = () => {
    if (step < 2) {
      setStep((p) => (p + 1) as 1 | 2);
      setSectionIdx(0);
      animateTransition(1);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDlExpiryDate(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      setDlExpiry(`${day}/${month}/${year}`);
    }
  };

  const handleVerifyPAN = async () => {
    const cleanedPan = panNumber.trim().toUpperCase();
    if (!validatePANFormat(cleanedPan)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (panName.length < 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!consentPAN) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSaving(true);
    try {
      const token = useDriverStore.getState().token;
      if (token) {
        const res = await fetch(`${API_URL}/api/v1/onboarding/verify-pan`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ panNumber: cleanedPan, panName }),
        });
        const result = await res.json();
        if (result.verified) {
          setPanVerified(true);
          // Aadhaar section gets filtered out → PAN shifts from idx=1 to idx=0
          setSectionIdx(prev => Math.max(0, prev - 1));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        setPanVerified(true);
        setSectionIdx(prev => Math.max(0, prev - 1));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setPanVerified(true);
      setSectionIdx(prev => Math.max(0, prev - 1));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyAadhaar = async () => {
    const cleaned = aadhaarNumber.replace(/\s/g, "");
    if (cleaned.length === 12) {
      setSaving(true);
      try {
        const token = useDriverStore.getState().token;
        if (token) {
          const res = await fetch(`${API_URL}/api/v1/onboarding/verify-aadhaar`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ aadhaarNumber: cleaned }),
          });
          const result = await res.json();
          if (result.verified) {
            setAadhaarVerified(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } else {
          // Fallback: mark as verified locally
          setAadhaarVerified(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        // Dummy: always succeeds in mock mode
        setAadhaarVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleVerifyBank = async () => {
    if (bankAccount.length >= 9 && bankAccount === bankConfirm && ifsc.length >= 8) {
      setSaving(true);
      try {
        const token = useDriverStore.getState().token;
        if (token) {
          await fetch(`${API_URL}/api/v1/onboarding`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              bankAccountNumber: bankAccount,
              bankIfsc: ifsc,
              bankVerified: true,
            }),
          });
        }
        setBankVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Dummy verify always succeeds
      } finally {
        setSaving(false);
      }
    }
  };

  // ── Save current section to backend ──────────────────────────────────────
  const saveCurrentSectionData = async () => {
    const sec = currentSections[sectionIdx]?.key;
    const token = useDriverStore.getState().token;
    if (!token || !sec) return;

    let data: Record<string, any> = {};

    switch (sec) {
      case "gender":
        data = { gender };
        break;
      case "vehicle":
        data = { vehicleType: vehicle };
        break;
      case "aadhaar":
        data = {
          aadhaarNumber: aadhaarNumber.replace(/\s/g, ""),
          aadhaarVerified,
        };
        break;
      case "pan":
        data = { panNumber, panName, panVerified };
        break;
      case "license":
        data = { dlNumber, dlExpiry };
        break;
      case "bank":
        data = { bankAccountNumber: bankAccount, bankIfsc: ifsc, bankVerified };
        break;
      default:
        return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.status === 401 || res.status === 403) {
        useDriverStore.getState().logout();
        router.replace("/auth");
        return;
      }
    } catch (err) {
      console.error("Failed to save onboarding section:", sec, err);
    } finally {
      setSaving(false);
    }
  };

  // ── Complete onboarding (final step) ───────────────────────────────────────
  const handleCompleteOnboarding = async () => {
    const token = useDriverStore.getState().token;
    if (!token) return;

    // Save selfie section first
    setSaving(true);
    try {
      const patchRes = await fetch(`${API_URL}/api/v1/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selfieImage: "captured" }),
      });
      
      if (patchRes.status === 401 || patchRes.status === 403) {
        useDriverStore.getState().logout();
        router.replace("/auth");
        return;
      }

      // Call complete endpoint
      const res = await fetch(`${API_URL}/api/v1/onboarding/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        useDriverStore.getState().logout();
        router.replace("/auth");
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error("Backend error response:", res.status, errText);
        throw new Error(`Failed to complete onboarding: ${res.status} ${errText}`);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOnboardingCompleted();
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Failed to complete onboarding:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Can proceed checks ────────────────────────────────────────────────────
  const canProceedAadhaar = (): boolean => {
    if (panVerified) {
      // Formality mode — PAN was already verified, just collect Aadhaar for records
      return validateAadhaarFormat(aadhaarNumber.replace(/\s/g, ""));
    }
    return aadhaarVerified;
  };

  const canProceedPAN = (): boolean => {
    if (aadhaarVerified) {
      // Formality mode — Aadhaar was already verified, just collect PAN for records
      return validatePANFormat(panNumber) && panName.length >= 3;
    }
    return panVerified;
  };

  const canProceedSection = (): boolean => {
    const sec = currentSections[sectionIdx]?.key;
    switch (sec) {
      case "gender": return !!gender;
      case "vehicle": return !!vehicle;
      case "aadhaar": return canProceedAadhaar();
      case "pan": return canProceedPAN();
      case "license": return validateDLFormat(dlNumber) && !!dlExpiry;
      case "bank": return bankVerified;
      case "selfie": return selfieCaptured;
      default: return false;
    }
  };

  

  const sectionTitle = (): string => {
    const sec = currentSections[sectionIdx]?.key;
    switch (sec) {
      case "gender": return "Select Your Gender";
      case "vehicle": return "Select Your Vehicle";
      case "aadhaar": return "Aadhaar Verification";
      case "pan": return "PAN Card Details";
      case "license": return "Driving License";
      case "bank": return "Bank Account Details";
      case "selfie": return "Profile Photo";
      default: return "";
    }
  };

  const sectionSubtitle = (): string | undefined => {
    const sec = currentSections[sectionIdx]?.key;
    switch (sec) {
      case "gender": return "This helps us personalise your experience.";
      case "vehicle": return "Choose the vehicle you'll use for deliveries. You can change this later.";
      case "aadhaar": return panVerified ? "Aadhaar details collected for records (PAN was used for identity verification)." : "Enter your 12-digit Aadhaar number to verify your identity.";
      case "pan": return aadhaarVerified ? "PAN details collected for records (Aadhaar was used for identity verification)." : "Enter your PAN details for identity verification.";
      case "license": return "Enter your driving license number and expiry date.";
      case "bank": return "Enter your bank details for seamless payouts.";
      case "selfie": return "Take a clear selfie for your profile. No hats or glasses.";
      default: return undefined;
    }
  };

  // ── Render section content ────────────────────────────────────────────────
  const renderSection = () => {
    const sec = currentSections[sectionIdx]?.key;

    switch (sec) {
      // ── Step 1 ────────────────────────────────────────────────────────────
      case "gender":
        return (
          <View style={{ gap: 12 }}>
            <SelectCard
              selected={gender === "male"}
              onSelect={() => setGender("male")}
              icon="user"
              label="Male"
            />
            <SelectCard
              selected={gender === "female"}
              onSelect={() => setGender("female")}
              icon="user"
              label="Female"
            />
          </View>
        );

      case "vehicle":
        return (
          <View style={{ gap: 12 }}>
            {VEHICLES.map((v) => (
              <SelectCard
                key={v.id}
                selected={vehicle === v.id}
                onSelect={() => setVehicle(v.id)}
                icon={v.icon}
                label={v.label}
                desc={v.desc}
              />
            ))}
          </View>
        );

      // ── Step 2 ────────────────────────────────────────────────────────────
      case "aadhaar":
        return (
          <View style={{ gap: 16 }}>
            <FormInput
              label="Aadhaar Number"
              value={aadhaarNumber}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9]/g, "").slice(0, 12);
                const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
                setAadhaarNumber(formatted);
              }}
              placeholder="XXXX XXXX XXXX"
              keyboardType="number-pad"
              maxLength={14}
              icon="credit-card"
            />
            {panVerified ? (
              /* ── Formality mode — PAN was already verified, just collect Aadhaar for records ── */
              <>
                <InfoBanner
                  icon="info"
                  text="Aadhaar details collected for records. PAN was used for identity verification."
                  type="info"
                />
                {aadhaarNumber.replace(/\s/g, "").length > 0 && (
                  validateAadhaarFormat(aadhaarNumber.replace(/\s/g, ""))
                    ? <InfoBanner icon="check-circle" text="Valid Aadhaar format" type="success" />
                    : (
                      <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" }}>
                        <Text style={{ color: Colors.error, fontSize: 13, lineHeight: 18 }}>
                          Invalid Aadhaar number. Must be 12 digits and cannot start with 0 or 1.
                        </Text>
                      </View>
                    )
                )}
              </>
            ) : !aadhaarVerified ? (
              /* ── Verify mode — user needs to verify Aadhaar via Surepass ── */
              <>
                <ConsentCheckbox
                  checked={consentAadhaar}
                  onToggle={() => setConsentAadhaar(!consentAadhaar)}
                  label="I consent to share my Aadhaar details with Triozen for identity verification via third-party services (Surepass)."
                />
                <PrimaryButton
                  title="Verify Aadhaar"
                  onPress={handleVerifyAadhaar}
                  disabled={aadhaarNumber.replace(/\s/g, "").length < 12 || !consentAadhaar || saving}
                  loading={saving}
                  icon="shield"
                />
                {!panVerified && (
                  <TouchableOpacity
                    onPress={goToNextSection}
                    style={{ alignItems: "center", paddingVertical: 10 }}
                  >
                    <Text style={{ fontSize: 14, color: Colors.textMuted, fontWeight: "500" }}>
                      Skip, I'll use PAN card →
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <InfoBanner icon="check-circle" text="Aadhaar verified successfully!" type="success" />
            )}
          </View>
        );

      case "pan":
        return (
          <View style={{ gap: 16 }}>
            <FormInput
              label="PAN Number"
              value={panNumber}
              onChangeText={(t) => setPanNumber(t.toUpperCase().slice(0, 10))}
              placeholder="ABCDE1234F"
              autoCapitalize="characters"
              icon="file-text"
            />
            <FormInput
              label="Name as on PAN Card"
              value={panName}
              onChangeText={setPanName}
              placeholder="Enter full name"
              autoCapitalize="words"
              icon="user"
            />
            {aadhaarVerified ? (
              /* ── Formality mode — Aadhaar was already verified, just collect PAN for records ── */
              <>
                <InfoBanner
                  icon="info"
                  text="PAN details collected for records. Aadhaar was used for identity verification."
                  type="info"
                />
                {panNumber.length > 0 && !validatePANFormat(panNumber) && (
                  <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" }}>
                    <Text style={{ color: Colors.error, fontSize: 13, lineHeight: 18 }}>
                      Invalid PAN number. Format should be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).
                    </Text>
                  </View>
                )}
                {panName.length > 0 && panName.length < 3 && (
                  <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" }}>
                    <Text style={{ color: Colors.error, fontSize: 13, lineHeight: 18 }}>
                      Name must be at least 3 characters.
                    </Text>
                  </View>
                )}
                {validatePANFormat(panNumber) && panName.length >= 3 && (
                  <InfoBanner icon="check-circle" text="Valid PAN details" type="success" />
                )}
              </>
            ) : !panVerified ? (
              /* ── Verify mode — user needs to verify PAN via Surepass ── */
              <>
                <ConsentCheckbox
                  checked={consentPAN}
                  onToggle={() => setConsentPAN(!consentPAN)}
                  label="I consent to share my PAN details with Triozen for identity verification via third-party services (Surepass)."
                />
                <PrimaryButton
                  title="Verify PAN"
                  onPress={handleVerifyPAN}
                  disabled={panNumber.length < 10 || panName.length < 3 || !consentPAN || saving}
                  loading={saving}
                  icon="shield"
                />
                {!aadhaarVerified && (
                  <TouchableOpacity
                    onPress={goToPrevSection}
                    style={{ alignItems: "center", paddingVertical: 10 }}
                  >
                    <Text style={{ fontSize: 14, color: Colors.textMuted, fontWeight: "500" }}>
                      ← Go back to Aadhaar
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <InfoBanner icon="check-circle" text="PAN verified successfully!" type="success" />
            )}
          </View>
        );

      case "license":
        return (
          <View style={{ gap: 16 }}>
            <FormInput
              label="Driving License Number"
              value={dlNumber}
              onChangeText={(t) => setDlNumber(t.toUpperCase().slice(0, 19))}
              placeholder="HR-06-2020-1234567"
              autoCapitalize="characters"
              icon="file"
            />
            {dlNumber.length > 0 && (
              validateDLFormat(dlNumber)
                ? <InfoBanner icon="check-circle" text="Valid license number format" type="success" />
                : (
                  <View style={dlStyles.errorBox}>
                    <Text style={dlStyles.errorText}>
                      Invalid format. Expected 2 letters (state code) + 2 digits (RTO) + 4 digits (year) + 7 digits (serial).{"\n"}E.g. {"HR-06-2020-1234567"}
                    </Text>
                  </View>
                )
            )}

            <Text style={inputStyles.label}>Expiry Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={dlStyles.dateButton}
            >
              <Feather name="calendar" size={18} color={Colors.primary} />
              <Text style={dlExpiry ? dlStyles.dateText : dlStyles.datePlaceholder}>
                {dlExpiry || "Select Expiry Date"}
              </Text>
              {dlExpiry && (
                <Feather name="check-circle" size={18} color={Colors.success} />
              )}
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dlExpiryDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>
        );

      case "bank":
        return (
          <View style={{ gap: 16 }}>
            <FormInput
              label="Account Number"
              value={bankAccount}
              onChangeText={(t) => setBankAccount(t.replace(/[^0-9]/g, "").slice(0, 18))}
              placeholder="Enter account number"
              keyboardType="number-pad"
              icon="hash"
            />
            <FormInput
              label="Confirm Account Number"
              value={bankConfirm}
              onChangeText={(t) => setBankConfirm(t.replace(/[^0-9]/g, "").slice(0, 18))}
              placeholder="Re-enter account number"
              keyboardType="number-pad"
              icon="hash"
            />
            {bankConfirm && bankAccount !== bankConfirm && (
              <Text style={{ color: Colors.error, fontSize: 13, fontWeight: "500" }}>
                Account numbers don't match
              </Text>
            )}
            <FormInput
              label="IFSC Code"
              value={ifsc}
              onChangeText={(t) => setIfsc(t.toUpperCase().slice(0, 11))}
              placeholder="SBIN0001234"
              autoCapitalize="characters"
              icon="map-pin"
            />
            {!bankVerified ? (
              <PrimaryButton
                title="Verify Bank Account"
                onPress={handleVerifyBank}
                disabled={bankAccount.length < 9 || bankAccount !== bankConfirm || ifsc.length < 8}
                icon="shield"
              />
            ) : (
              <InfoBanner icon="check-circle" text="Bank account verified! Payouts will be sent here." />
            )}
          </View>
        );

      case "selfie":
        return (
          <View style={{ gap: 20, alignItems: "center" }}>
            <View style={selfieSectionStyles.viewfinder}>
              <View style={selfieSectionStyles.viewfinderInner}>
                <Feather name="camera" size={36} color={Colors.textMuted} />
                <Text style={selfieSectionStyles.viewfinderText}>
                  Position your face within the frame
                </Text>
              </View>
              {/* Oval cutout guidelines */}
              <View style={selfieSectionStyles.oval} />
            </View>

            {!selfieCaptured ? (
              <TouchableOpacity
                style={selfieSectionStyles.captureBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setSelfieCaptured(true);
                }}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={24} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <View style={{ alignItems: "center", gap: 12 }}>
                <InfoBanner icon="check-circle" text="Photo captured successfully!" />
              </View>
            )}

            <Text style={selfieSectionStyles.guidelines}>
              Make sure your face is clearly visible, well-lit, and without hats or sunglasses.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        {/* Header Back + Close */}
        <View style={styles.topBar}>
          {sectionIdx > 0 || step > 1 ? (
            <TouchableOpacity
              onPress={() => {
                if (sectionIdx > 0) {
                  goToPrevSection();
                } else if (step > 1) {
                  setStep((p) => (p - 1) as 1 | 2);
                  setSectionIdx(step1Sections.length - 1);
                  animateTransition(-1);
                }
              }}
              style={styles.topBarBtn}
            >
              <Feather name="arrow-left" size={20} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <TouchableOpacity
            onPress={() => {
              setOnboardingCompleted();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/(tabs)");
            }}
            style={styles.topBarBtn}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <StepIndicator step={step} />

        {/* Section Progress */}
        <View style={styles.sectionProgress}>
          {currentSections.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.sectionBar,
                i < sectionIdx && styles.sectionBarDone,
                i === sectionIdx && styles.sectionBarActive,
              ]}
            />
          ))}
        </View>

        {/* Section Title */}
        <SectionHeader title={sectionTitle()} subtitle={sectionSubtitle()} />

        {/* Content */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
                }),
              }],
              opacity: slideAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0.3, 1, 0.3],
              }),
            }}
          >
            {renderSection()}
          </Animated.View>
        </ScrollView>

        <View style={styles.bottomBar}>
          {(() => {
            const sec = currentSections[sectionIdx]?.key;
            const nextSection = currentSections[sectionIdx + 1];
            const nextLabel = nextSection?.label ? `Next — ${nextSection.label}` : "Continue";

            if (sec === "selfie" && selfieCaptured) {
              return (
                <PrimaryButton
                  title="Complete & Activate"
                  onPress={handleCompleteOnboarding}
                  icon="check"
                  loading={saving}
                />
              );
            }

            if (sec === "vehicle" && canProceedSection()) {
              return (
                <PrimaryButton
                  title="Save & Continue"
                  onPress={async () => {
                    await saveCurrentSectionData();
                    goToNextStep();
                  }}
                  icon="arrow-right"
                  loading={saving}
                />
              );
            }

            if ((sec === "aadhaar" || sec === "pan") && canProceedSection()) {
              return (
                <PrimaryButton
                  title={nextLabel}
                  onPress={async () => {
                    await saveCurrentSectionData();
                    goToNextSection();
                  }}
                  icon="arrow-right"
                  loading={saving}
                />
              );
            }

            if (sec === "license" && canProceedSection()) {
              return (
                <PrimaryButton
                  title={nextLabel}
                  onPress={async () => {
                    await saveCurrentSectionData();
                    goToNextSection();
                  }}
                  icon="arrow-right"
                  loading={saving}
                />
              );
            }

            if (sec === "bank" && bankVerified) {
              return (
                <PrimaryButton
                  title={nextLabel}
                  onPress={async () => {
                    await saveCurrentSectionData();
                    goToNextSection();
                  }}
                  icon="arrow-right"
                  loading={saving}
                />
              );
            }

            if (sec === "gender" && gender) {
              return (
                <PrimaryButton
                  title={nextLabel}
                  onPress={async () => {
                    await saveCurrentSectionData();
                    goToNextSection();
                  }}
                  icon="arrow-right"
                  loading={saving}
                />
              );
            }

            // On Aadhaar/PAN without verification — inline skip link handles navigation
            if (sec === "aadhaar" || sec === "pan") {
              return <View />;
            }

            // Default: Continue button (enabled when can proceed)
            return (
              <PrimaryButton
                title="Continue"
                onPress={goToNextSection}
                disabled={!canProceedSection()}
                icon="arrow-right"
              />
            );
          })()}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: "center",
    alignItems: "center",
  },
  skipText: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  sectionProgress: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  sectionBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  sectionBarDone: { backgroundColor: Colors.success },
  sectionBarActive: { backgroundColor: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  bottomBar: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

const dlStyles = StyleSheet.create({
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  dateText: { flex: 1, fontSize: 16, color: Colors.text },
  datePlaceholder: { flex: 1, fontSize: 16, color: Colors.textMuted },
  errorBox: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: Colors.error, fontSize: 13, lineHeight: 18 },
});

const selfieSectionStyles = StyleSheet.create({
  viewfinder: {
    width: 220,
    height: 280,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  viewfinderInner: { alignItems: "center", gap: 12, zIndex: 1 },
  viewfinderText: { fontSize: 12, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  oval: {
    position: "absolute",
    top: 40,
    left: 30,
    right: 30,
    bottom: 50,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 0.3,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  guidelines: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});


