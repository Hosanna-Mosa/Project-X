import React, { useEffect } from "react";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { socketService } from "@/utils/socketService";

export function GlobalSocketHandler() {
  const currentOrderId = useDeliveryStore((s) => s.currentOrderId);
  const addChatMessage = useDeliveryStore((s) => s.addChatMessage);
  const incrementUnreadCount = useDeliveryStore((s) => s.incrementUnreadCount);

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
