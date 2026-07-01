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

// ─── Reusable UI Components ────────────────────────────────────────────────────

function InfoBanner({ icon, text, type }: { icon: keyof typeof Feather.glyphMap; text: string; type?: "success" | "info" }) {
  const bgColor = type === "success" ? "#e8f5e9" : Colors.primaryLight;
  const txtColor = type === "success" ? "#2e7d32" : Colors.primaryDark;
  const iconColor = type === "success" ? "#2e7d32" : Colors.primary;
  return (
    <View style={[bannerStyles.banner, { backgroundColor: bgColor }]}>
      <Feather name={icon} size={16} color={iconColor} />
      <Text style={[bannerStyles.text, { color: txtColor }]}>{text}</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  text: { fontSize: 13, color: Colors.primaryDark, flex: 1, lineHeight: 18 },
});

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
    <Pressable onPress={onToggle} style={consentStyles.wrap}>
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

// ─── Section Progress Indicator ────────────────────────────────────────────────

function SectionProgress({ total, current }: { total: number; current: number }) {
  return (
    <View style={progressStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            progressStyles.bar,
            i < current && progressStyles.barDone,
            i === current && progressStyles.barActive,
          ]}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginBottom: 20 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  barDone: { backgroundColor: Colors.success },
  barActive: { backgroundColor: Colors.primary },
});

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

// ═══════════════════════════════════════════════════════════════════════════════
//  IDENTITY VERIFICATION SCREEN (Standalone — only Aadhaar / PAN)
// ═══════════════════════════════════════════════════════════════════════════════

type SectionKey = "aadhaar" | "pan";

const SECTIONS: { key: SectionKey; label: string; title: string; subtitle: string }[] = [
  {
    key: "aadhaar",
    label: "Aadhaar",
    title: "Aadhaar Verification",
    subtitle: "Enter your 12-digit Aadhaar number to verify your identity.",
  },
  {
    key: "pan",
    label: "PAN Card",
    title: "PAN Card Details",
    subtitle: "Enter your PAN details for identity verification.",
  },
];

export default function IdentityVerifyScreen() {
  const insets = useSafeAreaInsets();
  const setIdentityVerified = useDriverStore((s) => s.setIdentityVerified);

  // Section tracking
  const [sectionIdx, setSectionIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Aadhaar state
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [consentAadhaar, setConsentAadhaar] = useState(false);

  // PAN state
  const [panNumber, setPanNumber] = useState("");
  const [panName, setPanName] = useState("");
  const [panVerified, setPanVerified] = useState(false);
  const [consentPAN, setConsentPAN] = useState(false);

  // ── Validators ───────────────────────────────────────────────────────────────
  const validateAadhaarFormat = (num: string) => /^[2-9][0-9]{11}$/.test(num);
  const validatePANFormat = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);

  // ── Dynamic sections: once one ID is verified, remove the other ──────────────
  const visibleSections = React.useMemo(() => {
    let sections = [...SECTIONS];
    if (aadhaarVerified) {
      sections = sections.filter((s) => s.key !== "pan");
    } else if (panVerified) {
      sections = sections.filter((s) => s.key !== "aadhaar");
    }
    return sections;
  }, [aadhaarVerified, panVerified]);

  const totalSections = visibleSections.length;
  const currentKey = visibleSections[sectionIdx]?.key;

  // ── Animations ───────────────────────────────────────────────────────────────
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

  const goNext = () => {
    if (sectionIdx < totalSections - 1) {
      setSectionIdx((p) => p + 1);
      animateTransition(1);
    }
  };

  const goPrev = () => {
    if (sectionIdx > 0) {
      setSectionIdx((p) => p - 1);
      animateTransition(-1);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleVerifyAadhaar = async () => {
    const cleaned = aadhaarNumber.replace(/\s/g, "");
    if (cleaned.length !== 12) return;

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
          setIdentityVerified(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      } else {
        // Mock fallback
        setAadhaarVerified(true);
        setIdentityVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setAadhaarVerified(true);
      setIdentityVerified(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPAN = async () => {
    const cleanedPan = panNumber.trim().toUpperCase();
    if (!validatePANFormat(cleanedPan) || panName.length < 3) {
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
          setIdentityVerified(true);
          // Adjust section index — Aadhaar gets filtered out, PAN shifts from idx=1 to idx=0
          setSectionIdx(prev => Math.max(0, prev - 1));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      } else {
        setPanVerified(true);
        setIdentityVerified(true);
        setSectionIdx(prev => Math.max(0, prev - 1));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setPanVerified(true);
      setIdentityVerified(true);
      setSectionIdx(prev => Math.max(0, prev - 1));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  // ── Can-proceed checks ───────────────────────────────────────────────────────
  const canProceedAadhaar = (): boolean => {
    if (panVerified) {
      // Formality mode — PAN already verified, just collect Aadhaar for records
      return validateAadhaarFormat(aadhaarNumber.replace(/\s/g, ""));
    }
    return aadhaarVerified;
  };

  const canProceedPAN = (): boolean => {
    if (aadhaarVerified) {
      // Formality mode — Aadhaar already verified, just collect PAN for records
      return validatePANFormat(panNumber) && panName.length >= 3;
    }
    return panVerified;
  };

  const canProceedSection = (): boolean => {
    if (currentKey === "aadhaar") return canProceedAadhaar();
    if (currentKey === "pan") return canProceedPAN();
    return false;
  };

  // ── Section subtitle (context-aware) ─────────────────────────────────────────
  const sectionSubtitle = (): string => {
    if (currentKey === "aadhaar") {
      return panVerified
        ? "Aadhaar details collected for records (PAN was used for identity verification)."
        : "Enter your 12-digit Aadhaar number to verify your identity.";
    }
    if (currentKey === "pan") {
      return aadhaarVerified
        ? "PAN details collected for records (Aadhaar was used for identity verification)."
        : "Enter your PAN details for identity verification.";
    }
    return "";
  };

  // ── Render section content ───────────────────────────────────────────────────
  const renderSection = () => {
    if (currentKey === "aadhaar") {
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
            /* ── Formality mode — PAN was already verified ── */
            <>
              <InfoBanner
                icon="info"
                text="Aadhaar details collected for records. PAN was used for identity verification."
                type="info"
              />
              {aadhaarNumber.replace(/\s/g, "").length > 0 &&
                (validateAadhaarFormat(aadhaarNumber.replace(/\s/g, "")) ? (
                  <InfoBanner icon="check-circle" text="Valid Aadhaar format" type="success" />
                ) : (
                  <View style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" }}>
                    <Text style={{ color: Colors.error, fontSize: 13, lineHeight: 18 }}>
                      Invalid Aadhaar number. Must be 12 digits and cannot start with 0 or 1.
                    </Text>
                  </View>
                ))}
            </>
          ) : !aadhaarVerified ? (
            /* ── Verify mode ── */
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
                  onPress={goNext}
                  style={{ alignItems: "center", paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 14, color: Colors.textMuted, fontWeight: "500" }}>
                    Use PAN Card instead →
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <InfoBanner icon="check-circle" text="Aadhaar verified successfully!" type="success" />
          )}
        </View>
      );
    }

    if (currentKey === "pan") {
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
            /* ── Formality mode — Aadhaar was already verified ── */
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
            /* ── Verify mode ── */
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
                  onPress={goPrev}
                  style={{ alignItems: "center", paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 14, color: Colors.textMuted, fontWeight: "500" }}>
                    ← Use Aadhaar instead
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <InfoBanner icon="check-circle" text="PAN verified successfully!" type="success" />
          )}
        </View>
      );
    }

    return null;
  };

  // ── Bottom button logic ──────────────────────────────────────────────────────
  const renderBottomButton = () => {
    const oneVerified = aadhaarVerified || panVerified;

    if (oneVerified && totalSections === 1) {
      // Only one section left (the other was already verified and filtered out)
      // or both are on the same section — user is done
      if (currentKey === "aadhaar" && panVerified && !canProceedAadhaar()) {
        return <View />;
      }
      if (currentKey === "pan" && aadhaarVerified && !canProceedPAN()) {
        return <View />;
      }
      // If the formality-mode fields are valid, show Done
      if (canProceedSection()) {
        return (
          <PrimaryButton
            title="Done"
            onPress={() => router.back()}
            icon="check"
          />
        );
      }
      return <View />;
    }

    if (currentKey === "aadhaar" && aadhaarVerified) {
      return (
        <PrimaryButton
          title={`Next — ${visibleSections[sectionIdx + 1]?.label || "PAN Card"}`}
          onPress={goNext}
          icon="arrow-right"
        />
      );
    }

    if (currentKey === "pan" && panVerified) {
      return (
        <PrimaryButton
          title="Done"
          onPress={() => router.back()}
          icon="check"
        />
      );
    }

    if (currentKey === "aadhaar" && canProceedAadhaar() && panVerified) {
      // Formality mode: Aadhaar fields filled, PAN already verified → show Done
      return (
        <PrimaryButton
          title="Done"
          onPress={() => router.back()}
          icon="check"
        />
      );
    }

    if (currentKey === "pan" && canProceedPAN() && aadhaarVerified) {
      // Formality mode: PAN fields filled, Aadhaar already verified → show Done
      return (
        <PrimaryButton
          title="Done"
          onPress={() => router.back()}
          icon="check"
        />
      );
    }

    // Default: hide bottom bar for verify-mode sections (inline verify button handles it)
    return <View />;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 16 }]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          {sectionIdx > 0 ? (
            <TouchableOpacity onPress={goPrev} style={styles.topBarBtn}>
              <Feather name="arrow-left" size={20} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.topBarBtn}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <SectionProgress total={totalSections} current={sectionIdx} />

        {/* Section Title */}
        <SectionHeader
          title={visibleSections[sectionIdx]?.title || ""}
          subtitle={sectionSubtitle()}
        />

        {/* Content */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
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

        {/* Bottom Bar */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {renderBottomButton()}
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  bottomBar: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
