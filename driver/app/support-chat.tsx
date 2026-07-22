import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

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
}

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const token = useDriverStore((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [inputText, setInputText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Form states for creating a ticket
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("OPERATIONAL ISSUE");
  const [newMessage, setNewMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const supportFetch = async (endpoint: string, options: RequestInit = {}) => {
    if (!token || !apiUrl) throw new Error("Authentication or API configuration is missing");
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return response.json();
  };

  // Fetch current ticket(s)
  const fetchTickets = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const tickets = await supportFetch("/api/v1/support/tickets");
      if (tickets && tickets.length > 0) {
        setTicket(tickets[0]);
      } else {
        setTicket(null);
      }
    } catch (error) {
      console.error("Failed to fetch support tickets:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Poll for new messages/updates + listen to live socket events
  useEffect(() => {
    fetchTickets(true);

    socketService.connect();
    const handleTicketUpdate = (updatedTicket: any) => {
      console.log("[SOCKET] Driver support ticket updated:", updatedTicket);
      setTicket(updatedTicket);
    };
    socketService.on("ticket_updated", handleTicketUpdate);

    const interval = setInterval(() => {
      fetchTickets(false);
    }, 4000);

    return () => {
      clearInterval(interval);
      socketService.off("ticket_updated", handleTicketUpdate);
    };
  }, []);

  // Scroll to bottom when ticket messages update
  useEffect(() => {
    if (ticket && ticket.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [ticket?.messages?.length]);

  const handleCreateTicket = async () => {
    if (!newTitle.trim() || !newMessage.trim()) {
      Alert.alert("Required fields", "Please fill in the summary and description");
      return;
    }

    setCreatingTicket(true);
    try {
      const created = await supportFetch("/api/v1/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          message: newMessage.trim(),
        }),
      });
      setTicket(created);
      Alert.alert("Ticket Created", "Partner Support has received your case and will respond shortly.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create support ticket");
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
      const updatedTicket = await supportFetch(`/api/v1/support/tickets/${ticket._id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: messageText }),
      });
      setTicket(updatedTicket);
    } catch (error: any) {
      Alert.alert("Failed to send message", error.message || "Please try again.");
      setInputText(messageText);
    } finally {
      setSubmittingReply(false);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    if (item.sender === "system") {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>
            {item.time}
          </Text>
        </View>
      );
    }

    const isUser = item.sender === "user";
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAgent,
        ]}
      >
        {!isUser && (
          <View style={styles.avatar}>
            <Feather name="headphones" size={12} color={Colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAgent,
          ]}
        >
          <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAgent}>
            {item.text}
          </Text>
          <Text style={isUser ? styles.timeUser : styles.timeAgent}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.textSecondary }}>Loading partner support...</Text>
      </View>
    );
  }

  // If no ticket, show Creation Form
  if (!ticket) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Ticket</Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FlatList
            data={[{ key: "form" }]}
            renderItem={() => (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Issue Category</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      Alert.alert(
                        "Select Category",
                        "Choose the most relevant category:",
                        [
                          { text: "Operational Issue", onPress: () => setNewCategory("OPERATIONAL ISSUE") },
                          { text: "Delayed Delivery", onPress: () => setNewCategory("DELAYED DELIVERY") },
                          { text: "Quality Control", onPress: () => setNewCategory("QUALITY CONTROL") },
                          { text: "Payout Adjustment", onPress: () => setNewCategory("BILLING ADJUSTMENT") },
                          { text: "Cancel", style: "cancel" }
                        ]
                      );
                    }}
                  >
                    <Text style={{ color: Colors.text, fontWeight: "600" }}>{newCategory}</Text>
                    <Feather name="chevron-down" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>Summary / Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Weekly payout delayed"
                  placeholderTextColor={Colors.textMuted}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  maxLength={60}
                />

                <Text style={[styles.label, { marginTop: 20 }]}>Describe your issue</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Tell us what went wrong. Include order number, item detail, or billing adjustments needed..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, creatingTicket && { opacity: 0.7 }]}
                  onPress={handleCreateTicket}
                  disabled={creatingTicket}
                >
                  {creatingTicket ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Start Live Chat</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingVertical: 12 }}
          />
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Active Chat UI
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Feather name="headphones" size={18} color={Colors.primary} />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>Partner Support</Text>
            <Text style={styles.headerStatus}>Ticket {ticket.ticketId} • {ticket.status}</Text>
          </View>
        </View>
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={ticket.messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input Bar */}
      {ticket.status === "RESOLVED" ? (
        <View style={[styles.resolvedNotice, { paddingBottom: insets.bottom + 16 }]}>
          <Feather name="check-circle" size={16} color={Colors.primary} />
          <Text style={styles.resolvedText}>This ticket has been marked as resolved.</Text>
          <TouchableOpacity
            style={styles.reopenBtn}
            onPress={async () => {
              try {
                setLoading(true);
                await supportFetch(`/api/v1/support/tickets/${ticket._id}/messages`, {
                  method: "POST",
                  body: JSON.stringify({ text: "Re-opening this case. I still need assistance." }),
                });
                await fetchTickets(true);
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to reopen ticket");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text style={styles.reopenBtnText}>Reopen Case</Text>
          </TouchableOpacity>
        </View>
      ) : ticket.status === "PENDING_RESOLVE" ? (
        <View style={[styles.resolveRequestContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.resolveRequestTitle}>Resolve this ticket?</Text>
          <Text style={styles.resolveRequestDesc}>
            Support has requested to mark this case as resolved. Is your issue fully solved?
          </Text>
          <View style={styles.resolveRequestButtons}>
            <TouchableOpacity
              style={[styles.resolveBtnConfirm, { backgroundColor: "#0f766e" }]}
              onPress={async () => {
                try {
                  setLoading(true);
                  const updated = await supportFetch(`/api/v1/support/tickets/${ticket._id}/resolve`, {
                    method: "POST",
                    body: JSON.stringify({ approve: true }),
                  });
                  setTicket(updated);
                } catch (err: any) {
                  Alert.alert("Error", err.message || "Failed to resolve ticket");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={styles.resolveBtnTextConfirm}>Yes, Resolve Case</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resolveBtnDecline, { borderColor: Colors.primary }]}
              onPress={async () => {
                try {
                  setLoading(true);
                  const updated = await supportFetch(`/api/v1/support/tickets/${ticket._id}/resolve`, {
                    method: "POST",
                    body: JSON.stringify({ approve: false }),
                  });
                  setTicket(updated);
                } catch (err: any) {
                  Alert.alert("Error", err.message || "Failed to decline request");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={[styles.resolveBtnTextDecline, { color: Colors.primary }]}>No, Keep Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.inputBar as any, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputContainer as any}>
            <TextInput
              style={styles.textInput as any}
              placeholder="Type a message to Support..."
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={400}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn as any, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || submittingReply}
          >
            <View style={{ transform: [{ rotate: "45deg" }] }}>
              <Feather name="send" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    borderWidth: 1.5,
    borderColor: "#fff",
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  headerName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  headerStatus: {
    fontSize: 10,
    color: "#22C55E",
    fontWeight: "600",
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  pickerButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  textArea: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAgent: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    lineHeight: 19,
  },
  bubbleTextAgent: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
    lineHeight: 19,
  },
  timeUser: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    alignSelf: "flex-end",
  },
  timeAgent: {
    fontSize: 9,
    color: Colors.textMuted,
    alignSelf: "flex-end",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  resolvedNotice: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
    gap: 10,
  },
  resolvedText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  reopenBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  reopenBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "700",
  },
  resolveRequestContainer: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  resolveRequestTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 8,
  },
  resolveRequestDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  resolveRequestButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    paddingHorizontal: 16,
  },
  resolveBtnConfirm: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resolveBtnTextConfirm: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  resolveBtnDecline: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resolveBtnTextDecline: {
    fontWeight: "600",
    fontSize: 14,
  },
});
