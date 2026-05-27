import React, { useState, useEffect, useRef } from "react";
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, FlatList, Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";
import Colors from "@/constants/colors";

export default function DriverChatScreen() {
  const { orderId } = useLocalSearchParams();
  const { currentOrder, driverUserId, activeChat, addChatMessage, setUnreadCount, setIsChatActive } = useDriverStore();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Clear unread count when opening chat
    setUnreadCount?.(0);
    setIsChatActive?.(true);
    
    if (currentOrder?.id) {
      socketService.emit("track_order", currentOrder.id);
    }

    const handleReceiveMessage = (data: any) => {
      // Only add to chat if it's from the user. Our own messages are added immediately.
      if (data.from === "user") {
        const formattedMsg = { text: data.text, from: "user" as const, id: data.id || (Date.now().toString() + Math.random().toString()), time: data.time };
        const currentMessages = useDriverStore.getState().activeChat;
        if (!currentMessages.find((m: any) => m.id === formattedMsg.id)) {
          addChatMessage?.(formattedMsg);
        }
      }
    };

    socketService.on("receive_message", handleReceiveMessage);
    return () => {
      socketService.off("receive_message", handleReceiveMessage);
      setIsChatActive?.(false);
    };
  }, [currentOrder?.id]);

  const handleSend = () => {
    if (!inputText.trim() || !currentOrder) return;

    const messageText = inputText.trim();
    const tempId = Date.now().toString();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistically update UI
    addChatMessage?.({ text: messageText, from: "driver" as const, id: tempId, time });
    
    // Emit to server
    socketService.emit("send_message", {
      orderId: currentOrder.id,
      senderId: driverUserId || "driver",
      role: "DRIVER",
      text: messageText,
      id: tempId
    });

    setInputText("");
    Keyboard.dismiss();
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.from === "driver";
    return (
      <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeThem]}>
          {item.time || ""}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{currentOrder?.customerName || "Customer"}</Text>
          <Text style={styles.headerSubtitle}>Active Request</Text>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <Ionicons name="call" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={activeChat || []}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Send a message to the customer...</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={200}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center",
    padding: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderColor: Colors.border,
    zIndex: 10
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  headerSubtitle: { fontSize: 13, color: Colors.primary, fontWeight: "500", marginTop: 2 },
  callBtn: { padding: 8, backgroundColor: Colors.primaryLight, borderRadius: 20 },
  chatContainer: { flex: 1 },
  messageList: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: "80%", padding: 12, borderRadius: 16,
    marginBottom: 12,
  },
  messageBubbleMe: {
    alignSelf: "flex-end", backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleThem: {
    alignSelf: "flex-start", backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMe: { color: "#fff" },
  messageTextThem: { color: Colors.text },
  messageTime: { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  messageTimeMe: { color: "rgba(255,255,255,0.7)" },
  messageTimeThem: { color: Colors.textMuted },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  inputContainer: {
    flexDirection: "row", alignItems: "flex-end",
    padding: 12, paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.background,
    minHeight: 44, maxHeight: 100,
    borderRadius: 22, paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 12,
    fontSize: 15, color: Colors.text,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    marginLeft: 12,
  },
  sendBtnDisabled: { backgroundColor: Colors.border, opacity: 0.5 },
});
