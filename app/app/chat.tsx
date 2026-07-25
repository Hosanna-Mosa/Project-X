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
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import Colors from "@/constants/colors";
import { socketService } from "@/utils/socketService";
import { useDeliveryStore } from "@/contexts/deliveryStore";

const QUICK_REPLIES = [
  "Are you coming ❓",
  "Waiting at pickup 📍",
  "My location is as per map 🗺️",
  "Message when reached 💬"
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { currentOrderId, driver, activeChat, addChatMessage, setUnreadCount, setIsChatActive, serviceType } = useDeliveryStore();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [taskAssigned, setTaskAssigned] = useState(false);

  const handleAssignTask = () => {
    socketService.emit("assign_task_confirmed", { orderId: currentOrderId });
    setTaskAssigned(true);
  };

  useEffect(() => {
    if (!currentOrderId) return;

    // Clear unread count when entering chat
    setUnreadCount(0);
    setIsChatActive(true);

    // Ensure we are in the order room
    socketService.trackOrder(currentOrderId);

    const onMessage = (msg: any) => {
      // Logic for incoming message
      const formattedMsg: any = {
        id: msg.id,
        text: msg.text,
        sender: msg.from === "driver" ? "driver" : "customer",
        timestamp: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      // Use getState to get current messages and avoid stale closures
      const currentMessages = useDeliveryStore.getState().activeChat;
      if (!currentMessages.find((m: any) => m.id === formattedMsg.id)) {
        addChatMessage(formattedMsg);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const onTaskStarted = () => {
      router.push("/tracking");
    };

    socketService.on("receive_message", onMessage);
    socketService.on("task_started", onTaskStarted);

    return () => {
      socketService.off("receive_message", onMessage);
      socketService.off("task_started", onTaskStarted);
      setIsChatActive(false);
    };
  }, [currentOrderId]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !currentOrderId) return;

    const msgId = Date.now().toString();
    const newMsg: any = {
      id: msgId,
      text: text.trim(),
      sender: "customer",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add to local store for instant UI
    addChatMessage(newMsg);

    socketService.emit("send_message", {
      orderId: currentOrderId,
      senderId: "customer-123", // Ideally from auth
      role: "USER",
      text: text.trim(),
      id: msgId
    });

    setInputText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUser = item.sender === "customer";
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowDriver,
        ]}
      >
        {!isUser && (
          <View style={styles.driverAvatar}>
            <Feather name="user" size={14} color={Colors.light.textSecondary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleDriver,
          ]}
        >
          <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextDriver}>
            {item.text}
          </Text>
          <Text style={isUser ? styles.timeUser : styles.timeDriver}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Feather name="user" size={24} color={Colors.light.textSecondary} />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>{driver?.name?.toUpperCase() || "DRIVER"}</Text>
            <Text style={styles.headerStatus}>{driver?.vehicleNumber || driver?.vehicleModel || "Your Driver"}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${driver?.phone || "1234567890"}`)}
        >
          <Feather name="phone" size={20} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Warning Banner */}
      <View style={styles.warningBanner}>
        <View style={styles.warningIconContainer}>
          <Feather name="alert-triangle" size={18} color="#EA580C" />
        </View>
        <Text style={styles.warningText}>Do not share your PIN with the captain before the ride starts</Text>
      </View>

      {/* Helper Task Assignment Banner */}
      {serviceType === "helper" && !taskAssigned && (
        <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderBottomWidth: 1, borderBottomColor: '#DCFCE7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>Discuss Task Details</Text>
            <Text style={{ fontSize: 11, color: '#15803D' }}>When you are ready, assign the task to start the clock.</Text>
          </View>
          <TouchableOpacity 
            style={{ backgroundColor: '#16A34A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
            onPress={handleAssignTask}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Assign Task</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={activeChat}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Quick Replies Area */}
      <View style={styles.quickRepliesCard}>
        <View style={styles.quickRepliesHeaderRow}>
          <Text style={styles.quickRepliesTitle}>⚡ Quick Chat</Text>
          <Feather name="chevron-down" size={16} color={Colors.light.textSecondary} />
        </View>
        <View style={styles.quickRepliesList}>
          {QUICK_REPLIES.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickReplyActionBtn}
              onPress={() => sendMessage(item)}
            >
              <Text style={styles.quickReplyActionText}>{item}</Text>
              <Feather name="send" size={16} color="#0EA5E9" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.light.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={300}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim()}
        >
          <View style={{ transform: [{ rotate: "45deg" }] }}>
            <Feather name="send" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(8),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(10),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  headerName: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontSize: moderateScale(10),
    color: "#22C55E",
    fontWeight: "600",
  },
  callBtn: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(8),
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowDriver: {
    justifyContent: "flex-start",
  },
  driverAvatar: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(8),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: moderateScale(12),
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  bubbleUser: {
    backgroundColor: "#0EA5E9",
    borderBottomRightRadius: moderateScale(6),
  },
  bubbleDriver: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: moderateScale(6),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleTextUser: {
    fontSize: moderateScale(13),
    color: "#fff",
    fontWeight: "500",
    lineHeight: moderateScale(18),
  },
  bubbleTextDriver: {
    fontSize: moderateScale(13),
    color: Colors.light.text,
    fontWeight: "500",
    lineHeight: moderateScale(18),
  },
  timeUser: {
    fontSize: moderateScale(10),
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    alignSelf: "flex-end",
  },
  timeDriver: {
    fontSize: moderateScale(10),
    color: Colors.light.textMuted,
    fontWeight: "500",
    alignSelf: "flex-end",
  },
  quickRepliesContainer: {
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickRepliesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(20),
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickReplyText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: moderateScale(22),
    height: moderateScale(44),
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontSize: moderateScale(15),
    color: Colors.light.text,
    fontWeight: "500",
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  sendBtn: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  sendBtnDisabled: {
    shadowOpacity: 0,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  warningIconContainer: {
    backgroundColor: "#FFEDD5",
    padding: 6,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#431407",
    fontWeight: "500",
    lineHeight: 18,
  },
  quickRepliesCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
  },
  quickRepliesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quickRepliesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  quickReplyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickReplyActionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
});
