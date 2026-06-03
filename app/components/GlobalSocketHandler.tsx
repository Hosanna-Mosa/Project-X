import React, { useEffect } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useAuthStore } from "@/contexts/authStore";
import { socketService } from "@/utils/socketService";

export function GlobalSocketHandler() {
  const currentOrderId = useDeliveryStore((s) => s.currentOrderId);
  const addChatMessage = useDeliveryStore((s) => s.addChatMessage);
  const incrementUnreadCount = useDeliveryStore((s) => s.incrementUnreadCount);
  const user = useAuthStore((s) => s.user);

  // Connection and user room joining effect
  useEffect(() => {
    if (!user) return;

    socketService.connect();
    socketService.emit("join", { userId: user.id || user._id, role: "CUSTOMER" });

    const onUpcomingReservedRide = (data: any) => {
      console.log("Customer received upcoming reserved ride:", data);
      Alert.alert(
        "Upcoming Reserved Ride!",
        `Your reserved ride with ${data.driverName} starts in 15 minutes!`,
        [
          {
            text: "Track Driver",
            onPress: () => {
              useDeliveryStore.setState({
                currentOrderId: data.orderId,
                serviceType: data.serviceType,
                status: "driver_assigned",
              });
              router.push("/tracking");
            }
          }
        ]
      );
    };

    socketService.on("upcoming_reserved_ride", onUpcomingReservedRide);

    return () => {
      socketService.off("upcoming_reserved_ride", onUpcomingReservedRide);
    };
  }, [user]);

  // Chat messages and order tracking effect
  useEffect(() => {
    if (!currentOrderId) return;

    socketService.connect();
    socketService.trackOrder(currentOrderId);

    const onMessage = (msg: any) => {
      const formattedMsg = {
        id: msg.id || (Date.now().toString() + Math.random().toString()),
        text: msg.text,
        sender: msg.from === "driver" ? ("driver" as const) : ("customer" as const),
        timestamp: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const store = useDeliveryStore.getState();
      const currentMessages = store.activeChat || [];
      if (!currentMessages.find((m: any) => m.id === formattedMsg.id)) {
        addChatMessage(formattedMsg);
      }

      // Only increment unread count for driver messages when user is not actively chatting
      if (msg.from === "driver" && !store.isChatActive) {
        incrementUnreadCount();
      }
    };

    socketService.on("receive_message", onMessage);

    return () => {
      socketService.off("receive_message", onMessage);
    };
  }, [currentOrderId]);

  return null;
}
