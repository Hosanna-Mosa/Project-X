import React, { useEffect } from "react";
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";

export function GlobalSocketHandler() {
  const currentOrderId = useDriverStore((s) => s.currentOrder?.id);
  const addChatMessage = useDriverStore((s) => s.addChatMessage);
  const incrementUnreadCount = useDriverStore((s) => s.incrementUnreadCount);

  useEffect(() => {
    if (!currentOrderId) return;

    socketService.connect();
    socketService.trackOrder(currentOrderId);

    const handleReceiveMessage = (data: any) => {
      if (data.from === "user") {
        const formattedMsg = {
          text: data.text,
          from: "user" as const,
          id: data.id || (Date.now().toString() + Math.random().toString()),
          time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const store = useDriverStore.getState();
        const currentMessages = store.activeChat || [];
        if (!currentMessages.find((m: any) => m.id === formattedMsg.id)) {
          addChatMessage(formattedMsg);
        }
        
        if (!store.isChatActive) {
          store.incrementUnreadCount();
        }
      }
    };

    socketService.on("receive_message", handleReceiveMessage);

    return () => {
      socketService.off("receive_message", handleReceiveMessage);
    };
  }, [currentOrderId]);

  return null;
}
