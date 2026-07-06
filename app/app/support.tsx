import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How do I track my order?",
    answer: "You can track your order in real-time by going to the 'Orders' tab, selecting your active order, and tapping 'Track Order'. You'll see the driver's real-time position on the map.",
  },
  {
    question: "What is SwiftRadius Premium?",
    answer: "SwiftRadius Premium is a subscription that gives you ₹0 delivery fees on orders above ₹199, priority customer support, and exclusive partner discounts.",
  },
  {
    question: "How can I cancel my order?",
    answer: "You can cancel your order within 60 seconds of placing it without any cancellation fee. After 60 seconds, a cancellation fee may apply depending on whether the vendor has accepted the order.",
  },
  {
    question: "How do I change my delivery address?",
    answer: "You can manage saved addresses in your Profile screen under 'Places'. If you need to change the address of an active order, please contact support immediately via the call button.",
  },
  {
    question: "What payment options are supported?",
    answer: "We support Credit/Debit cards, UPI (Google Pay, PhonePe), NetBanking, and cash on delivery.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleContactOption = (type: string) => {
    if (type === "chat") {
      router.push("/chat");
    } else if (type === "call") {
      Alert.alert("Calling Support", "Connecting you to our helpline +1 (800) 555-SWIFT...");
    } else if (type === "email") {
      Alert.alert("Email Support", "Opening mail composer to support@swiftradius.com...");
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>24/7 SUPPORT AVAILABLE</Text>
          </View>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSubtitle}>
            Our team is here to help you resolve any issues with your orders, rides, or account.
          </Text>
        </View>

        {/* Contact Actions Grid */}
        <Text style={styles.sectionTitle}>Get in Touch</Text>
        <View style={styles.contactGrid}>
          <TouchableOpacity
            style={[styles.contactCard, { borderColor: colors.borderLight }]}
            onPress={() => handleContactOption("chat")}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
              <Feather name="message-square" size={22} color={colors.primary} />
            </View>
            <Text style={styles.contactLabel}>Live Chat</Text>
            <Text style={styles.contactDesc}>Instant answers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { borderColor: colors.borderLight }]}
            onPress={() => handleContactOption("call")}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
              <Feather name="phone" size={22} color={colors.primary} />
            </View>
            <Text style={styles.contactLabel}>Call Helpline</Text>
            <Text style={styles.contactDesc}>Talk to agent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { borderColor: colors.borderLight }]}
            onPress={() => handleContactOption("email")}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
              <Feather name="mail" size={22} color={colors.primary} />
            </View>
            <Text style={styles.contactLabel}>Email Us</Text>
            <Text style={styles.contactDesc}>Get a response in 1hr</Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible FAQs */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {FAQS.map((faq, idx) => {
            const isExpanded = expandedFAQ === idx;
            return (
              <View key={idx} style={[styles.faqCard, { borderColor: colors.borderLight }]}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleFAQ(idx)}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight || "#F1F5F9",
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    heroSection: {
      alignItems: "center",
      marginBottom: 32,
      paddingVertical: 12,
    },
    heroBadge: {
      backgroundColor: colors.teal + "15",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginBottom: 16,
    },
    heroBadgeText: {
      color: colors.teal,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "900",
      color: colors.text,
      textAlign: "center",
      marginBottom: 10,
    },
    heroSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 16,
    },
    contactGrid: {
      flexDirection: "row",
      gap: 8,
    },
    contactCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 20,
      paddingHorizontal: 8,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
      elevation: 1,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    contactLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
      textAlign: "center",
    },
    contactDesc: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: "center",
    },
    faqList: {
      gap: 12,
    },
    faqCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderRadius: 12,
      overflow: "hidden",
    },
    faqHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    faqQuestion: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
      paddingRight: 8,
    },
    faqBody: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight + "50" || "#F8FAFC",
    },
    faqAnswer: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: 12,
    },
  });
