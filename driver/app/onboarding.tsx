import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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

function InfoBanner({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={bannerStyles.banner}>
      <Feather name={icon} size={16} color={Colors.primary} />
      <Text style={bannerStyles.text}>{text}</Text>
    </View>
  );
}

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

// ─── Document Upload Box ───────────────────────────────────────────────────────

function UploadBox({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={uploadStyles.box}
    >
      <View style={uploadStyles.iconCircle}>
        <Feather name="camera" size={20} color={Colors.primary} />
      </View>
      <Text style={uploadStyles.label}>{label}</Text>
      <Text style={uploadStyles.hint}>Tap to capture</Text>
    </Pressable>
  );
}

const uploadStyles = StyleSheet.create({
  box: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text },
  hint: { fontSize: 12, color: Colors.textMuted },
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

  // ── Step 1 State ──────────────────────────────────────────────────────────
  const [gender, setGender] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<string | null>(null);

  // ── Step 2 State ──────────────────────────────────────────────────────────
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [panNumber, setPanNumber] = useState("");
  const [panUploaded, setPanUploaded] = useState(false);
  const [dlNumber, setDlNumber] = useState("");
  const [dlExpiry, setDlExpiry] = useState("");
  const [dlFrontUploaded, setDlFrontUploaded] = useState(false);
  const [dlBackUploaded, setDlBackUploaded] = useState(false);
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

  const step2Sections = [
    { key: "aadhaar", label: "Aadhaar" },
    { key: "pan", label: "PAN" },
    { key: "license", label: "License" },
    { key: "bank", label: "Bank" },
    { key: "selfie", label: "Selfie" },
  ];

  const currentSections = step === 1 ? step1Sections : step2Sections;
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

  const handleUpload = (field: string) => {
    // Placeholder: In real app would open camera/image picker
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switch (field) {
      case "pan": setPanUploaded(true); break;
      case "dlFront": setDlFrontUploaded(true); break;
      case "dlBack": setDlBackUploaded(true); break;
      default: break;
    }
  };

  const handleVerifyAadhaar = () => {
    if (aadhaarNumber.replace(/\s/g, "").length === 12) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAadhaarVerified(true);
    }
  };

  const handleVerifyBank = () => {
    if (bankAccount.length >= 9 && bankAccount === bankConfirm && ifsc.length >= 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBankVerified(true);
    }
  };

  // ── Can proceed checks ────────────────────────────────────────────────────
  const canProceedSection = (): boolean => {
    const sec = currentSections[sectionIdx]?.key;
    switch (sec) {
      case "gender": return !!gender;
      case "vehicle": return !!vehicle;
      case "aadhaar": return aadhaarVerified;
      case "pan": return panNumber.length >= 10 && panUploaded;
      case "license": return dlNumber.length >= 8 && dlFrontUploaded && dlBackUploaded;
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
      case "aadhaar": return "Enter your 12-digit Aadhaar number to verify your identity.";
      case "pan": return "Enter your PAN details and upload a clear photo of the card.";
      case "license": return "Upload your driving license images and enter details.";
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
            {!aadhaarVerified ? (
              <PrimaryButton
                title="Verify Aadhaar"
                onPress={handleVerifyAadhaar}
                disabled={aadhaarNumber.replace(/\s/g, "").length < 12}
                icon="shield"
              />
            ) : (
              <InfoBanner icon="check-circle" text="Aadhaar verified successfully!" />
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
            <View>
              <Text style={[inputStyles.label, { marginBottom: 8 }]}>Upload PAN Card Photo</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <UploadBox label="Front Side" onPress={() => handleUpload("pan")} />
              </View>
              {panUploaded && (
                <InfoBanner icon="check-circle" text="PAN card uploaded successfully!" />
              )}
            </View>
          </View>
        );

      case "license":
        return (
          <View style={{ gap: 16 }}>
            <FormInput
              label="Driving License Number"
              value={dlNumber}
              onChangeText={(t) => setDlNumber(t.toUpperCase().slice(0, 16))}
              placeholder="HR-0612345678901"
              autoCapitalize="characters"
              icon="file"
            />
            <FormInput
              label="Expiry Date"
              value={dlExpiry}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9]/g, "").slice(0, 8);
                const formatted = cleaned.replace(/(\d{2})(\d{2})(\d{4})/, "$1/$2/$3");
                setDlExpiry(formatted);
              }}
              placeholder="DD/MM/YYYY"
              keyboardType="number-pad"
              icon="calendar"
            />
            <View>
              <Text style={[inputStyles.label, { marginBottom: 8 }]}>Upload License Photos</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <UploadBox label="Front Side" onPress={() => handleUpload("dlFront")} />
                <UploadBox label="Back Side" onPress={() => handleUpload("dlBack")} />
              </View>
              {dlFrontUploaded && dlBackUploaded && (
                <View style={{ marginTop: 8 }}>
                  <InfoBanner icon="check-circle" text="Both sides uploaded!" />
                </View>
              )}
            </View>
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
          {currentSections[sectionIdx]?.key === "selfie" && selfieCaptured ? (
            <PrimaryButton
              title="Complete & Activate"
              onPress={goToNextStep}
              icon="check"
            />
          ) : currentSections[sectionIdx]?.key === "vehicle" && canProceedSection() ? (
            <PrimaryButton
              title="Save & Continue"
              onPress={goToNextStep}
              icon="arrow-right"
            />
          ) : currentSections[sectionIdx]?.key === "aadhaar" && aadhaarVerified ? (
            <PrimaryButton
              title="Next — PAN Card"
              onPress={goToNextSection}
              icon="arrow-right"
            />
          ) : currentSections[sectionIdx]?.key === "pan" && canProceedSection() ? (
            <PrimaryButton
              title="Next — Driving License"
              onPress={goToNextSection}
              icon="arrow-right"
            />
          ) : currentSections[sectionIdx]?.key === "license" && canProceedSection() ? (
            <PrimaryButton
              title="Next — Bank Details"
              onPress={goToNextSection}
              icon="arrow-right"
            />
          ) : currentSections[sectionIdx]?.key === "bank" && bankVerified ? (
            <PrimaryButton
              title="Next — Profile Photo"
              onPress={goToNextSection}
              icon="arrow-right"
            />
          ) : currentSections[sectionIdx]?.key === "gender" && gender ? (
            <PrimaryButton
              title="Next — Vehicle"
              onPress={goToNextSection}
              icon="arrow-right"
            />
          ) : (
            <PrimaryButton
              title="Continue"
              onPress={goToNextSection}
              disabled={!canProceedSection()}
              icon="arrow-right"
            />
          )}
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
  scrollContent: { paddingBottom: 16 },
  bottomBar: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
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


