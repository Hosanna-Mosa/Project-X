import React, { useEffect } from "react";
import { useDriverStore } from "@/store/driverStore";
import { socketService } from "@/utils/socketService";
import { Alert } from "react-native";
import { formatCustomerChatMessage } from "@/utils/chatMessages";

export function GlobalSocketHandler() {
  const currentOrderId = useDriverStore((s) => s.currentOrder?.id);
  const addChatMessage = useDriverStore((s) => s.addChatMessage);
  const incrementUnreadCount = useDriverStore((s) => s.incrementUnreadCount);

  useEffect(() => {
    if (!currentOrderId) return;

    socketService.connect();
    socketService.trackOrder(currentOrderId);

    const handleReceiveMessage = (data: any) => {
      const formattedMsg = formatCustomerChatMessage(data);
      if (!formattedMsg) return;

      const store = useDriverStore.getState();
      const currentMessages = store.activeChat || [];
      if (!currentMessages.find((m: any) => m.id === formattedMsg.id)) {
        addChatMessage(formattedMsg);
      }
      
      if (!store.isChatActive) {
        store.incrementUnreadCount();
      }
    };

    socketService.on("receive_message", handleReceiveMessage);

    const handleStatusUpdate = (data: any) => {
      console.log("[GlobalSocketHandler] Order status update received:", data);
      const { orderId, status } = data;
      
      const store = useDriverStore.getState();
      const current = store.currentOrder;
      
      if (current && (current.id === orderId || current.id.toString() === orderId.toString())) {
        if (current.status !== status) {
          useDriverStore.setState({
            currentOrder: {
              ...current,
              status: status
            }
          });

          if (status === "picking_items") {
            Alert.alert("Order Prepared", "The order is prepared and ready for pickup!");
          }
        }
      }
    };

    socketService.on("order_status_update", handleStatusUpdate);

    return () => {
      socketService.off("receive_message", handleReceiveMessage);
      socketService.off("order_status_update", handleStatusUpdate);
    };
  }, [currentOrderId]);

  return null;
}

