import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// react-native's own KeyboardAvoidingView (behavior="height" on Android) can
// leave a residual gap the size of the keyboard after it closes — e.g. right
// after sending a message. The app already wraps everything in
// react-native-keyboard-controller's KeyboardProvider (_layout.tsx), and that
// package ships its own KeyboardAvoidingView that stays in sync with it via
// the native module's real animated keyboard height instead of RN's older JS
// heuristic — same props, safe drop-in.
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";
import { socketService } from "@/utils/socketService";

interface ChatMessage {
  sender: "user" | "admin" | "system";
  time: string;
  text: string;
}

interface SupportTicket {
  _id: string;
  ticketId: string;
  title: string;
  category: string;
  status: "OPEN" | "RESOLVED" | "PENDING_RESOLVE";
  message: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// The `category` field is free text on the backend — these four are simply
// the ones already seeded/expected by the admin dashboard's own icon
// matching (admin/src/pages/Support.tsx keys off "BILLING", "QUALITY", etc.
// in the category string), so they're kept exactly as-is rather than
// adopting the mockup's own wording, which would silently break that
// matching for every ticket raised from this screen.
const CATEGORIES = [
  { label: "Operational issue", value: "OPERATIONAL ISSUE" },
  { label: "Delayed delivery", value: "DELAYED DELIVERY" },
  { label: "Quality control", value: "QUALITY CONTROL" },
  { label: "Billing adjustment", value: "BILLING ADJUSTMENT" },
];

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  PENDING_RESOLVE: "Awaiting your reply",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ticketId?: string }>();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const accent = tokens.services.food;
  const styles = useMemo(() => createStyles(tokens, accent), [theme]);

  const [viewMode, setViewMode] = useState<"cases" | "chat">("cases");
  const [loading, setLoading] = useState(true);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [inputText, setInputText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const [newCategory, setNewCategory] = useState(CATEGORIES[0].value);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const ticketRef = useRef<SupportTicket | null>(null);
  useEffect(() => { ticketRef.current = ticket; }, [ticket]);

  const fetchTickets = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const tickets = await customFetch<SupportTicket[]>("/api/v1/support/tickets");
      setAllTickets(tickets || []);

      // Opened via a deep link (notification tap) with a specific ticket in mind — jump
      // straight into that conversation instead of the cases list.
      if (params.ticketId) {
        const target = (tickets || []).find((t) => t._id === params.ticketId);
        if (target) {
          setTicket(target);
          setViewMode("chat");
          return;
        }
      }

      const currentActive = ticketRef.current;
      if (currentActive) {
        const activeT = (tickets || []).find((t) => t._id === currentActive._id);
        if (activeT) setTicket(activeT);
      }
    } catch (error) {
      console.error("Failed to fetch support tickets:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(true);
    socketService.connect();
    const handleTicketUpdate = (updatedTicket: any) => {
      setTicket((prev) => (prev && prev._id === updatedTicket._id ? updatedTicket : prev));
      setAllTickets((prev) => prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)));
    };
    socketService.on("ticket_updated", handleTicketUpdate);
    const interval = setInterval(() => fetchTickets(false), 4000);
    return () => {
      clearInterval(interval);
      socketService.off("ticket_updated", handleTicketUpdate);
    };
  }, []);

  useEffect(() => {
    if (ticket && ticket.messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [ticket?.messages?.length]);

  const handleCreateTicket = async () => {
    if (!newTitle.trim() || !newMessage.trim()) {
      Alert.alert("Missing details", "Add a title and a short description first.");
      return;
    }
    setCreatingTicket(true);
    try {
      const created = await customFetch<SupportTicket>("/api/v1/support/tickets", {
        method: "POST",
        body: JSON.stringify({ title: newTitle.trim(), category: newCategory, message: newMessage.trim() }),
      });
      setAllTickets((prev) => [created, ...prev]);
      setTicket(created);
      setNewTitle("");
      setNewMessage("");
      setViewMode("chat");
    } catch (error: any) {
      Alert.alert("Couldn't submit", error.message || "Please try again.");
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !ticket) return;
    const messageText = inputText.trim();
    setInputText("");
    setSubmittingReply(true);
    try {
      const updatedTicket = await customFetch<SupportTicket>(`/api/v1/support/tickets/${ticket._id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: messageText }),
      });
      setTicket(updatedTicket);
    } catch (error: any) {
      Alert.alert("Message not sent", error.message || "Please try again.");
      setInputText(messageText);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResolve = async (approve: boolean) => {
    if (!ticket) return;
    try {
      const updated = await customFetch<SupportTicket>(`/api/v1/support/tickets/${ticket._id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ approve }),
      });
      setTicket(updated);
      setAllTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Please try again.");
    }
  };

  const handleReopen = async (t: SupportTicket) => {
    try {
      await customFetch(`/api/v1/support/tickets/${t._id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: "Re-opening this case — I still need help with it." }),
      });
      await fetchTickets(true);
      setTicket(t);
      setViewMode("chat");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reopen case");
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    if (item.sender === "system") {
      return (
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <Text style={styles.systemMessageText}>{item.time}</Text>
        </View>
      );
    }
    const isUser = item.sender === "user";
    return (
      <View style={[styles.messageRow, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="headset" size={13} color={accent.accent} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? { backgroundColor: accent.accent, borderBottomRightRadius: 4 } : { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderBottomLeftRadius: 4 }]}>
          <Text style={[styles.bubbleText, { color: isUser ? accent.on : tokens.text }]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, { color: isUser ? `${accent.on}B3` : tokens.sec }]}>{item.time}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: Math.max(insets.top, 24) }]}>
        <ActivityIndicator size="large" color={accent.accent} />
        <Text style={styles.loadingText}>Loading your cases…</Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Chat view (32b)
  // -----------------------------------------------------------------------
  if (viewMode === "chat" && ticket) {
    const isResolved = ticket.status === "RESOLVED";
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode("cases")}>
            <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerName}>Flavour Support</Text>
            <Text style={styles.headerStatus}>Case #{ticket.ticketId} · {STATUS_LABEL[ticket.status]}</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          style={styles.messagesFlatList}
          data={ticket.messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {isResolved ? (
          <View style={[styles.resolvedNotice, { paddingBottom: insets.bottom + 16 }]}>
            <Ionicons name="checkmark-circle" size={16} color={tokens.success} />
            <Text style={styles.resolvedText}>This case has been marked resolved.</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              <TouchableOpacity style={styles.reopenBtn} onPress={() => handleReopen(ticket)}>
                <Text style={[styles.reopenBtnText, { color: accent.accent }]}>Reopen case</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reopenBtn, { backgroundColor: accent.accent, borderColor: accent.accent }]}
                onPress={() => { setNewTitle(""); setNewMessage(""); setViewMode("cases"); }}
              >
                <Text style={[styles.reopenBtnText, { color: accent.on }]}>Start new chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Reply to support…"
                placeholderTextColor={tokens.muted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={400}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: accent.accent, opacity: inputText.trim() && !submittingReply ? 1 : 0.5 }]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || submittingReply}
            >
              <Ionicons name="send" size={17} color={accent.on} />
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={ticket.status === "PENDING_RESOLVE"} transparent animationType="fade">
          <View style={styles.resolveOverlay}>
            <View style={styles.resolveCard}>
              <Text style={styles.resolveTitle}>Mark this case resolved?</Text>
              <Text style={styles.resolveSub}>You can reopen it anytime by sending a new message — your chat history stays.</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={styles.resolveNotYetBtn} onPress={() => handleResolve(false)}>
                  <Text style={styles.resolveNotYetText}>Not yet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.resolveYesBtn, { backgroundColor: accent.accent }]} onPress={() => handleResolve(true)}>
                  <Text style={[styles.resolveYesText, { color: accent.on }]}>Yes, resolved</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // -----------------------------------------------------------------------
  // Cases + new ticket view (32)
  // -----------------------------------------------------------------------
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerName}>Your cases</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {allTickets.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
            {allTickets.map((t) => {
              const isResolved = t.status === "RESOLVED";
              const isPending = t.status === "PENDING_RESOLVE";
              const stripeColor = isResolved ? tokens.success : isPending ? tokens.services.task.accent : tokens.warning;
              return (
                <TouchableOpacity
                  key={t._id}
                  activeOpacity={isResolved ? 1 : 0.85}
                  onPress={() => { if (!isResolved) { setTicket(t); setViewMode("chat"); } }}
                  style={[styles.caseCard, { borderLeftColor: stripeColor }]}
                >
                  <View style={styles.caseTopRow}>
                    <Text style={[styles.caseEyebrow, { color: stripeColor }]} numberOfLines={1}>{t.category} · #{t.ticketId}</Text>
                    <View style={[styles.caseStatusPill, { backgroundColor: isResolved ? tokens.successSkin : isPending ? tokens.services.task.skin : tokens.warningSkin }]}>
                      <Text style={[styles.caseStatusPillText, { color: isResolved ? tokens.success : isPending ? tokens.services.task.accent : tokens.warning }]}>{STATUS_LABEL[t.status]}</Text>
                    </View>
                  </View>
                  <Text style={styles.caseTitle} numberOfLines={1}>{t.title}</Text>
                  <Text style={styles.caseMeta}>
                    {isResolved ? `Closed ${formatDate(t.updatedAt)}` : `${t.messages.length} message${t.messages.length === 1 ? "" : "s"} · updated ${formatDate(t.updatedAt)}`}
                  </Text>
                  {isResolved && (
                    <View style={styles.caseActionRow}>
                      <TouchableOpacity style={styles.caseActionOutline} onPress={() => handleReopen(t)}>
                        <Text style={styles.caseActionOutlineText}>Reopen case</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.caseActionFilled, { backgroundColor: accent.skin, borderColor: accent.accent }]}
                        onPress={() => { setNewTitle(""); setNewMessage(""); }}
                      >
                        <Text style={[styles.caseActionFilledText, { color: accent.accent }]}>Start new chat</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionLabel}>Raise a new ticket</Text>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Issue category</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {CATEGORIES.map((c) => {
              const selected = newCategory === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.categoryChip, selected ? { backgroundColor: accent.accent, borderColor: accent.accent } : { backgroundColor: tokens.surface, borderColor: tokens.borderStrong }]}
                  onPress={() => setNewCategory(c.value)}
                >
                  <Text style={[styles.categoryChipText, { color: selected ? accent.on : tokens.sec }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Charged twice for one trip"
            placeholderTextColor={tokens.muted}
            value={newTitle}
            onChangeText={setNewTitle}
            maxLength={60}
          />

          <Text style={[styles.formLabel, { marginTop: 14 }]}>Description</Text>
          <TextInput
            style={styles.formTextArea}
            placeholder="Tell us what happened and when…"
            placeholderTextColor={tokens.muted}
            multiline
            numberOfLines={4}
            value={newMessage}
            onChangeText={setNewMessage}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: accent.accent, opacity: creatingTicket ? 0.7 : 1 }]}
          onPress={handleCreateTicket}
          disabled={creatingTicket}
        >
          {creatingTicket ? <ActivityIndicator color={accent.on} /> : <Text style={[styles.submitBtnText, { color: accent.on }]}>Submit ticket</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (tokens: ThemeTokens, accent: ThemeTokens["services"]["food"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tokens.bg },
    loadingText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 12 },

    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: tokens.surface, borderBottomWidth: 1, borderBottomColor: tokens.border },
    backBtn: { width: moderateScale(38), height: moderateScale(38), borderRadius: moderateScale(19), backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    headerName: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },
    headerStatus: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(12), color: tokens.sec, marginTop: 2 },

    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginHorizontal: 16, marginTop: 22, marginBottom: 12 },

    caseCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderLeftWidth: 3, borderRadius: 14, padding: 14 },
    caseTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    caseEyebrow: { flex: 1, fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase" },
    caseStatusPill: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
    caseStatusPillText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 0.5, textTransform: "uppercase" },
    caseTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    caseMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 4 },
    caseActionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    caseActionOutline: { flex: 1, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 10, minHeight: 40, alignItems: "center", justifyContent: "center" },
    caseActionOutlineText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13), color: tokens.sec },
    caseActionFilled: { flex: 1, borderWidth: 1, borderRadius: 10, minHeight: 40, alignItems: "center", justifyContent: "center" },
    caseActionFilledText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13) },

    formCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, padding: 16, marginHorizontal: 16 },
    formLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginBottom: 8 },
    categoryChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    categoryChipText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(13) },
    formInput: { borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, minHeight: 48, paddingHorizontal: 14, fontFamily: fontFamilies.body.medium, fontSize: moderateScale(15), color: tokens.text },
    formTextArea: { borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 12, minHeight: 84, paddingHorizontal: 14, paddingTop: 12, fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.text },

    submitBtn: { borderRadius: 14, minHeight: moderateScale(52), alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginTop: 18 },
    submitBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15) },

    messagesFlatList: { flex: 1 },
    messagesList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 10 },
    systemMessageText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(10), textTransform: "uppercase", letterSpacing: 1, color: tokens.muted },
    messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    avatar: { width: 24, height: 24, borderRadius: 8, backgroundColor: tokens.sunken, alignItems: "center", justifyContent: "center", marginBottom: 2 },
    bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
    bubbleText: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(19) },
    bubbleTime: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(10), alignSelf: "flex-end", marginTop: 2 },

    inputBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: tokens.surface, borderTopWidth: 1, borderTopColor: tokens.border },
    inputContainer: { flex: 1, backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 22, minHeight: moderateScale(44), maxHeight: 100, paddingHorizontal: 16, justifyContent: "center" },
    textInput: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), color: tokens.text, paddingVertical: 10 },
    sendBtn: { width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(22), alignItems: "center", justifyContent: "center" },

    resolvedNotice: { alignItems: "center", justifyContent: "center", paddingVertical: 18, paddingHorizontal: 24, gap: 8, backgroundColor: tokens.surface, borderTopWidth: 1, borderTopColor: tokens.border },
    resolvedText: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, textAlign: "center" },
    reopenBtn: { borderWidth: 1.5, borderColor: accent.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
    reopenBtnText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(13) },

    resolveOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 32 },
    resolveCard: { backgroundColor: tokens.surface, borderRadius: 20, padding: 22, width: "100%" },
    resolveTitle: { fontFamily: fontFamilies.heading.semibold, fontSize: moderateScale(22), lineHeight: moderateScale(26), letterSpacing: -0.3, color: tokens.text },
    resolveSub: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(15), lineHeight: moderateScale(21), color: tokens.sec, marginTop: 10, marginBottom: 20 },
    resolveNotYetBtn: { flex: 1, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center" },
    resolveNotYetText: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.sec },
    resolveYesBtn: { flex: 1, borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center" },
    resolveYesText: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(15) },
  });
