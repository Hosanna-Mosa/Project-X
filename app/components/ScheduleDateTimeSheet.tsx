import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  loading?: boolean;
  initialDate?: Date;
};

const HOUR_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const getDefaultTimeParts = (baseDate = new Date()) => {
  const next = new Date(baseDate);
  next.setMinutes(next.getMinutes() + 45);
  let hourVal = next.getHours();
  const ampmVal = hourVal >= 12 ? "PM" : "AM";
  hourVal = hourVal % 12;
  hourVal = hourVal ? hourVal : 12;

  let minVal = Math.round(next.getMinutes() / 5) * 5;
  if (minVal >= 60) minVal = 0;

  return {
    date: next,
    hour: String(hourVal),
    minute: String(minVal).padStart(2, "0"),
    ampm: ampmVal as "AM" | "PM",
  };
};

export function ScheduleDateTimeSheet({
  visible,
  onClose,
  onConfirm,
  title = "Schedule delivery",
  subtitle = "Select your preferred delivery day and time",
  confirmLabel = "OK",
  loading = false,
  initialDate,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const dateOptions = React.useMemo(() => {
    const arr: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const [selectedDate, setSelectedDate] = React.useState<Date>(initialDate || new Date());
  const [hour, setHour] = React.useState("12");
  const [minute, setMinute] = React.useState("00");
  const [ampm, setAmpm] = React.useState<"AM" | "PM">("PM");

  React.useEffect(() => {
    if (!visible) return;
    const defaults = getDefaultTimeParts(initialDate || new Date());
    setSelectedDate(initialDate || defaults.date);
    setHour(defaults.hour);
    setMinute(defaults.minute);
    setAmpm(defaults.ampm);
  }, [visible, initialDate]);

  const buildSelectedDateTime = () => {
    const finalDate = new Date(selectedDate);
    let hr = parseInt(hour, 10);
    if (ampm === "PM" && hr < 12) hr += 12;
    if (ampm === "AM" && hr === 12) hr = 0;
    finalDate.setHours(hr, parseInt(minute, 10), 0, 0);
    return finalDate;
  };

  const previewText = buildSelectedDateTime().toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const handleConfirm = () => {
    const selected = buildSelectedDateTime();
    if (selected.getTime() <= Date.now()) {
      Alert.alert("Invalid time", "Please choose a future delivery time.");
      return;
    }
    onConfirm(selected);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + (Platform.OS === "ios" ? 16 : 20) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Selected slot</Text>
            <Text style={styles.previewValue}>{previewText}</Text>
          </View>

          <Text style={styles.sectionLabel}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.datesContainer}
            contentContainerStyle={styles.datesContent}
          >
            {dateOptions.map((date, idx) => {
              const isSelected = selectedDate.toDateString() === date.toDateString();
              const dayName = idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : date.toLocaleDateString([], { weekday: "short" });
              const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[styles.dateCard, isSelected && styles.dateCardActive]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dateDayText, isSelected && styles.dateDayTextActive]}>{dayName}</Text>
                  <Text style={[styles.dateValText, isSelected && styles.dateValTextActive]}>{dateStr}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
            {HOUR_OPTIONS.map((hr) => {
              const isSelected = hour === hr;
              return (
                <TouchableOpacity
                  key={hr}
                  style={[styles.timeChip, isSelected && styles.timeChipActive]}
                  onPress={() => setHour(hr)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{hr}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>Minute</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
            {MINUTE_OPTIONS.map((min) => {
              const isSelected = minute === min;
              return (
                <TouchableOpacity
                  key={min}
                  style={[styles.timeChip, isSelected && styles.timeChipActive]}
                  onPress={() => setMinute(min)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{min}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.ampmRow}>
            {(["AM", "PM"] as const).map((period) => {
              const isSelected = ampm === period;
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.ampmBtn, isSelected && styles.ampmBtnActive]}
                  onPress={() => setAmpm(period)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.ampmBtnText, isSelected && styles.ampmBtnTextActive]}>{period}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>{confirmLabel}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.68)" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 16,
      paddingHorizontal: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 16,
    },
    handle: {
      alignSelf: "center",
      width: 46,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 16,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, fontWeight: "500" },
    previewCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      gap: 4,
    },
    previewLabel: { fontSize: 11, fontWeight: "800", color: colors.textSecondary, letterSpacing: 0.5 },
    previewValue: { fontSize: 16, fontWeight: "800", color: colors.text },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },
    datesContainer: { marginBottom: 12 },
    datesContent: { gap: 10, paddingRight: 20 },
    dateCard: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      minWidth: 84,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    dateCardActive: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    dateDayText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 2 },
    dateDayTextActive: { color: colors.primary, fontWeight: "700" },
    dateValText: { fontSize: 14, fontWeight: "700", color: colors.text },
    dateValTextActive: { color: colors.primary },
    timeRow: { gap: 8, paddingBottom: 12 },
    timeChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    timeChipActive: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    timeChipText: { fontSize: 14, fontWeight: "700", color: colors.text },
    timeChipTextActive: { color: colors.primary },
    ampmRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
    ampmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    ampmBtnActive: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    ampmBtnText: { fontSize: 14, fontWeight: "700", color: colors.text },
    ampmBtnTextActive: { color: colors.primary },
    confirmBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    confirmBtnDisabled: { opacity: 0.6 },
    confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  });
