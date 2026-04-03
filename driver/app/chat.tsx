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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { useDriverStore, ChatMessage } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";

const QUICK_REPLIES = [
  "On my way! 👋",
  "I've arrived at pickup",
  "Traffic is heavy, a bit delayed",
  "At your location 📍",
  "Thank you!",
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { currentOrder, driverPhone, activeChat, addChatMessage, setUnreadCount } = useDriverStore();
  const params = useLocalSearchParams();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const customerName = currentOrder?.customerName || "Customer";

  useEffect(() => {
    if (!currentOrder) return;

    // Clear unread count when entering chat
    setUnreadCount(0);

    // Join the order room for chat context
    socketService.emit("track_order", currentOrder.id);

    const onMessage = (msg: any) => {
      // Logic for incoming message
      const formattedMsg: ChatMessage = {
        id: msg.id,
        text: msg.text,
        sender: msg.from === "driver" ? "driver" : "customer",
        timestamp: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      // Use getState to avoid stale closures
      const currentMessages = useDriverStore.getState().activeChat;
      if (!currentMessages.find(m => m.id === formattedMsg.id)) {
        addChatMessage(formattedMsg);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    socketService.on("receive_message", onMessage);

    return () => {
      socketService.off("receive_message", onMessage);
    };
  }, [currentOrder?.id]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !currentOrder) return;
    
    const msgId = Date.now().toString();
    const newMsg: ChatMessage = {
        id: msgId,
        text: text.trim(),
        sender: "driver",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add to local store immediately UX
    addChatMessage(newMsg);

    // Emit to backend
    socketService.emit("send_message", {
      orderId: currentOrder.id,
      senderId: driverPhone || "driver-123",
      role: "DRIVER",
      text: text.trim(),
      id: msgId
    });

    setInputText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender === "driver";
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        {!isMe && (
          <View style={styles.avatar}>
            <Feather name="user" size={14} color={Colors.textSecondary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextOther}>
            {item.text}
          </Text>
          <Text style={isMe ? styles.timeMe : styles.timeOther}>
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
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Feather name="user" size={20} color={Colors.textSecondary} />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>{customerName}</Text>
            <Text style={styles.headerStatus}>Order #{currentOrder?.id.split('-').pop() || "..."}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <Feather name="phone" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

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

      {/* Quick Replies */}
      <View style={styles.quickRepliesContainer}>
        <FlatList
          data={QUICK_REPLIES}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRepliesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickReplyChip}
              onPress={() => sendMessage(item)}
            >
              <Text style={styles.quickReplyText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
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
          <Feather name="send" size={20} color="#fff" />
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
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
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  bubbleTextMe: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 20,
  },
  bubbleTextOther: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 20,
  },
  timeMe: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    alignSelf: "flex-end",
  },
  timeOther: {
    fontSize: 10,
    color: Colors.textSecondary,
    alignSelf: "flex-end",
  },
  quickRepliesContainer: {
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickRepliesList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickReplyChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
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
    backgroundColor: Colors.textMuted,
  },
});
