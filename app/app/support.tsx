import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { moderateScale } from "react-native-size-matters";
import { designTokens, type ThemeTokens } from "@/constants/colors";
import { fontFamilies } from "@/constants/typography";
import { useThemeStore } from "@/contexts/themeStore";
import { customFetch } from "@/utils/api/custom-fetch";

const SERVICE_META: Record<string, { label: string; accent: keyof ThemeTokens["services"] }> = {
  food: { label: "Food", accent: "food" },
  meat: { label: "Meat", accent: "meat" },
  bike: { label: "Ride", accent: "ride" },
  auto: { label: "Ride", accent: "ride" },
  cab: { label: "Ride", accent: "ride" },
  cab_prime: { label: "Ride", accent: "ride" },
  helper: { label: "Task", accent: "task" },
  delivery: { label: "Delivery", accent: "delivery" },
};

// Same resolution rule used on the Orders screen: the list endpoint never
// populates `vendor`, so meat can't be told apart from food here — food is
// the more common case, not a guess dressed up as certainty.
function resolveServiceKey(order: any): string {
  if (order.serviceType === "delivery" && order.vendor) return "food";
  return order.serviceType || "delivery";
}

const ACTIVE_STATUSES = ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "PICKED_UP", "ON_THE_WAY", "EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "PICKING_ITEMS", "EN_ROUTE_DELIVERY", "ARRIVED_DELIVERY", "IN_TRANSIT", "driver_assigned", "confirmed", "pending"];

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "My order is late. What now?",
    answer: "Check the live map on the Track screen first — most delays are traffic on the partner's leg. If it's running well past the estimate, open Live chat with the order in mind and we'll look into it.",
  },
  {
    question: "How do refunds work?",
    answer: "If a payment needs to be refunded, our support team reviews it and processes the refund back to your original payment method through Razorpay. Raise it via Live chat or a ticket and we'll confirm once it's done.",
  },
  {
    question: "Can I cancel my order?",
    answer: "Yes — cancel anytime from the Orders or Track screen before it's completed. If a partner has already started on it, a quick message in chat helps them stop before making an unnecessary trip.",
  },
  {
    question: "Is my PIN safe to share?",
    answer: "Only hand it over once your items are physically in hand, or once your captain has arrived for a ride. Nobody from Flavour will ever ask for it over a call.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const tokens = designTokens[theme];
  const styles = useMemo(() => createStyles(tokens), [theme]);

  const [recentOrder, setRecentOrder] = useState<any | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      customFetch<any[]>("/api/v1/orders")
        .then((data) => setRecentOrder(data && data.length > 0 ? data[0] : null))
        .catch(() => {});
    }, [])
  );

  const serviceKey = recentOrder ? resolveServiceKey(recentOrder) : null;
  const meta = serviceKey ? SERVICE_META[serviceKey] : null;
  const accent = tokens.services[meta?.accent || "food"];
  const isActive = recentOrder ? ACTIVE_STATUSES.includes(recentOrder.status) : false;
  const recentTitle = recentOrder
    ? typeof recentOrder.vendor === "object" && recentOrder.vendor?.name
      ? recentOrder.vendor.name
      : recentOrder.stops?.[0]?.address || "Order"
    : "";

  const toggleFAQ = (index: number) => setExpandedFAQ(expandedFAQ === index ? null : index);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 24) + (Platform.OS === "web" ? 67 : 0) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(20)} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help &amp; support</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroTitle}>How can we help?</Text>

        {recentOrder && (
          <TouchableOpacity
            style={styles.recentCard}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: "/tracking", params: { orderId: recentOrder._id } })}
          >
            <View style={[styles.recentIcon, { backgroundColor: accent.skin }]}>
              <Ionicons name={meta?.accent === "ride" ? "car" : meta?.accent === "task" ? "construct" : meta?.accent === "delivery" ? "cube" : "fast-food"} size={19} color={accent.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.recentEyebrow, { color: accent.accent }]}>{isActive ? "Active order" : "Recent order"}</Text>
              <Text style={styles.recentTitle} numberOfLines={1}>{recentTitle} · ₹{Math.round(recentOrder.totalPrice || 0)}</Text>
              <Text style={styles.recentMeta}>{formatRelativeDate(recentOrder.createdAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.muted} />
          </TouchableOpacity>
        )}
        <Text style={styles.recentHint}>Most issues are about a specific order — start there and we'll skip the questions.</Text>

        <Text style={styles.sectionLabel}>Contact us</Text>
        <View style={{ gap: 10 }}>
          <TouchableOpacity style={styles.contactRow} onPress={() => router.push("/support-chat")}>
            <View style={[styles.contactIcon, { backgroundColor: tokens.services.food.skin }]}>
              <Ionicons name="chatbubble-ellipses" size={17} color={tokens.services.food.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.contactLabel}>Live chat</Text>
              <Text style={styles.contactDesc}>Message our support team</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.muted} />
          </TouchableOpacity>

          {/* Real helpline number isn't configured yet — showing a fake one
              that dials nowhere real is worse than saying so. Swap this back
              to a direct Linking.openURL("tel:...") once we have the real
              number. */}
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Alert.alert("Not set up yet", "Our call helpline isn't configured yet — please use Live chat above for the fastest response.")}
          >
            <View style={[styles.contactIcon, { backgroundColor: tokens.sunken }]}>
              <Ionicons name="call" size={16} color={tokens.sec} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.contactLabel}>Call helpline</Text>
              <Text style={styles.contactDesc}>Coming soon — use Live chat for now</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Alert.alert("Not set up yet", "Our support email isn't configured yet — please use Live chat above for the fastest response.")}
          >
            <View style={[styles.contactIcon, { backgroundColor: tokens.sunken }]}>
              <Ionicons name="mail" size={16} color={tokens.sec} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.contactLabel}>Email us</Text>
              <Text style={styles.contactDesc}>Coming soon — use Live chat for now</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.muted} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Common questions</Text>
        <View style={styles.faqCard}>
          {FAQS.map((faq, idx) => {
            const isExpanded = expandedFAQ === idx;
            return (
              <TouchableOpacity
                key={faq.question}
                style={[styles.faqRow, idx < FAQS.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
                activeOpacity={0.7}
                onPress={() => toggleFAQ(idx)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons name={isExpanded ? "remove" : "add"} size={18} color={accent.accent} />
                </View>
                {isExpanded && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
    backBtn: { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20), backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(17), color: tokens.text },

    heroTitle: { fontFamily: fontFamilies.heading.bold, fontSize: moderateScale(28), lineHeight: moderateScale(32), letterSpacing: -0.5, color: tokens.text, paddingHorizontal: 16, paddingTop: 16 },

    recentCard: {
      flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border,
      borderRadius: 16, padding: 14, marginHorizontal: 16, marginTop: 18,
    },
    recentIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    recentEyebrow: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(10), letterSpacing: 1, textTransform: "uppercase" },
    recentTitle: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text, marginTop: 4 },
    recentMeta: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },
    recentHint: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(13), lineHeight: moderateScale(18), color: tokens.sec, marginHorizontal: 18, marginTop: 10 },

    sectionLabel: { fontFamily: fontFamilies.body.bold, fontSize: moderateScale(11), letterSpacing: 1, textTransform: "uppercase", color: tokens.muted, marginHorizontal: 16, marginTop: 22, marginBottom: 12 },

    contactRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, minHeight: 64, marginHorizontal: 16 },
    contactIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    contactLabel: { fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    contactDesc: { fontFamily: fontFamilies.body.medium, fontSize: moderateScale(13), color: tokens.sec, marginTop: 2 },

    faqCard: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, overflow: "hidden", marginHorizontal: 16 },
    faqRow: { padding: 14 },
    faqQuestion: { flex: 1, fontFamily: fontFamilies.body.semibold, fontSize: moderateScale(15), color: tokens.text },
    faqAnswer: { fontFamily: fontFamilies.body.regular, fontSize: moderateScale(14), lineHeight: moderateScale(21), color: tokens.sec, marginTop: 10 },
  });
