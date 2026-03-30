import React, { useState, useRef } from "react";
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
import { router } from "expo-router";
import Colors from "@/constants/colors";

type Message = {
  id: string;
  text: string;
  from: "user" | "driver";
  time: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hi! I'm on my way to pick up your order 🚗",
    from: "driver",
    time: "9:51 AM",
  },
  {
    id: "2",
    text: "Great, thanks! Please ring the bell when you arrive.",
    from: "user",
    time: "9:52 AM",
  },
  {
    id: "3",
    text: "Sure thing! I'll be there in about 13 minutes.",
    from: "driver",
    time: "9:52 AM",
  },
];

const QUICK_REPLIES = [
  "On my way! 👋",
  "Running late, sorry",
  "At the door 🚪",
  "Thank you!",
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const now = () => {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m} ${ampm}`;
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      from: "user",
      time: now(),
    };
    setMessages((prev) => [...prev, msg]);
    setInputText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.from === "user";
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
            {item.time}
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
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Feather name="user" size={20} color={Colors.light.textSecondary} />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>John Doe</Text>
            <Text style={styles.headerStatus}>Your driver · Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <Feather name="phone" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
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
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontSize: 12,
    color: "#22C55E",
    fontWeight: "600",
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "72%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: "#0EA5E9",
    borderBottomRightRadius: 6,
  },
  bubbleDriver: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleTextUser: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "500",
    lineHeight: 21,
  },
  bubbleTextDriver: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: "500",
    lineHeight: 21,
  },
  timeUser: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    alignSelf: "flex-end",
  },
  timeDriver: {
    fontSize: 10,
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
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
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: "500",
    maxHeight: 100,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
  },
});
