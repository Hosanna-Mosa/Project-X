import type { ChatMessage } from "@/store/driverStore";

const CUSTOMER_MESSAGE_SENDERS = new Set(["user", "customer", "passenger", "client"]);

export function isCustomerChatMessage(data: any): boolean {
  const sender = String(data?.from ?? data?.role ?? data?.sender ?? "").toLowerCase();
  return CUSTOMER_MESSAGE_SENDERS.has(sender);
}

export function formatCustomerChatMessage(data: any): ChatMessage | null {
  if (!data?.text || !isCustomerChatMessage(data)) {
    return null;
  }

  return {
    id: String(data.id || `${Date.now()}${Math.random()}`),
    text: String(data.text),
    from: "user",
    time: data.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

