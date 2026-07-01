import React, { useState, useEffect, useRef } from "react";
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
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";
import { formatCustomerChatMessage } from "@/utils/chatMessages";

const QUICK_REPLIES = [
  "On my way!",
  "Running late, sorry",
  "At the door",
  "Thank you!",
];

export default function DriverChatScreen() {
  const insets = useSafeAreaInsets();
  const { currentOrder, driverUserId, activeChat, addChatMessage, setUnreadCount, setIsChatActive } = useDriverStore();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setUnreadCount?.(0);
    setIsChatActive?.(true);

    if (currentOrder?.id) {
      socketService.trackOrder(currentOrder.id);
    }

    const handleReceiveMessage = (data: any) => {
      const formattedMsg = formatCustomerChatMessage(data);
      if (!formattedMsg) return;

      const currentMessages = useDriverStore.getState().activeChat;
      if (!currentMessages.find((m: any) => m.id === formattedMsg.id)) {
        addChatMessage?.(formattedMsg);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    socketService.on("receive_message", handleReceiveMessage);
    return () => {
      socketService.off("receive_message", handleReceiveMessage);
      setIsChatActive?.(false);
    };
  }, [currentOrder?.id]);

  const handleSend = (text = inputText) => {
    if (!text.trim() || !currentOrder) return;

    const messageText = text.trim();
    const tempId = Date.now().toString();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    addChatMessage?.({ text: messageText, from: "driver" as const, id: tempId, time });

    socketService.emit("send_message", {
      orderId: currentOrder.id,
      senderId: driverUserId || "driver",
      role: "DRIVER",
      text: messageText,
      id: tempId,
    });

    setInputText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isDriver = item.from === "driver";

    return (
      <View
        style={[
          styles.messageRow,
          isDriver ? styles.messageRowUser : styles.messageRowDriver,
        ]}
      >
        {!isDriver && (
          <View style={styles.driverAvatar}>
            <Feather name="user" size={14} color="#43474e" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isDriver ? styles.bubbleUser : styles.bubbleDriver,
          ]}
        >
          <Text style={isDriver ? styles.bubbleTextUser : styles.bubbleTextDriver}>
            {item.text}
          </Text>
          <Text style={isDriver ? styles.timeUser : styles.timeDriver}>
            {item.time || ""}
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
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#191c1e" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Feather name="user" size={20} color="#43474e" />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>{currentOrder?.customerName || "Customer"}</Text>
            <Text style={styles.headerStatus}>Customer · Online</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${currentOrder?.customerPhone || "1234567890"}`)}
        >
          <Feather name="phone" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={activeChat || []}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

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
              onPress={() => handleSend(item)}
            >
              <Text style={styles.quickReplyText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#74777f"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={300}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend(inputText)}
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
    width: 30,
    height: 30,
    borderRadius: 8,
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
    width: 32,
    height: 32,
    borderRadius: 10,
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
    fontSize: 13,
    fontWeight: "700",
    color: "#191c1e",
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontSize: 10,
    color: "#22C55E",
    fontWeight: "600",
  },
  callBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
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
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
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
    fontSize: 13,
    color: "#fff",
    fontWeight: "500",
    lineHeight: 18,
  },
  bubbleTextDriver: {
    fontSize: 13,
    color: "#191c1e",
    fontWeight: "500",
    lineHeight: 18,
  },
  timeUser: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    alignSelf: "flex-end",
  },
  timeDriver: {
    fontSize: 10,
    color: "#74777f",
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
    fontSize: 11,
    fontWeight: "600",
    color: "#43474e",
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
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 15,
    color: "#191c1e",
    fontWeight: "500",
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
