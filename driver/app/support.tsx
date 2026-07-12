import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "When do I get my payouts?",
    answer: "Payouts are automatically processed every Monday morning to your linked bank account. Depending on your bank, it may take 1-2 business days to reflect.",
  },
  {
    question: "How do I report an issue with a customer?",
    answer: "If you have issues during delivery, use the 'Live Chat' support below or rate the customer accordingly after the trip. For emergencies, please call the emergency hotline immediately.",
  },
  {
    question: "My location is not updating correctly, what should I do?",
    answer: "Make sure you have set location permissions to 'Always Allow' in your phone's settings. Close other GPS-intensive apps and verify you have a strong mobile internet connection.",
  },
  {
    question: "Can I cancel an accepted delivery manifest?",
    answer: "You can cancel a manifest from the active order screen before picking up the items, but it may affect your acceptance rate. Frequent cancellations can trigger a temporary account suspension.",
  },
  {
    question: "How do I update my vehicle or driving license?",
    answer: "You can upload new documents in the Document Center under Profile personal settings. Our team reviews all document updates within 24 hours.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleContactOption = (type: string) => {
    if (type === "chat") {
      router.push("/support-chat");
    } else if (type === "call") {
      Alert.alert("Calling Partner Support", "Connecting you to our driver hotline +1 (800) 555-DRIV...");
    } else if (type === "email") {
      Alert.alert("Email Partner Support", "Opening mail composer to partner-support@swiftradius.com...");
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Support</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>DRIVERS HELPLINE</Text>
          </View>
          <Text style={styles.heroTitle}>How can we assist you today?</Text>
          <Text style={styles.heroSubtitle}>
            Get dynamic support resolution for active manifests, pricing adjustments, or document verifications.
          </Text>
        </View>

        {/* Contact Actions Grid */}
        <Text style={styles.sectionTitle}>Get in Touch</Text>
        <View style={styles.contactGrid}>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => handleContactOption("chat")}
          >
            <View style={styles.iconWrapper}>
              <Feather name="message-square" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.contactLabel}>Live Chat</Text>
            <Text style={styles.contactDesc}>Instant support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => handleContactOption("call")}
          >
            <View style={styles.iconWrapper}>
              <Feather name="phone" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.contactLabel}>Call Support</Text>
            <Text style={styles.contactDesc}>Talk to agent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => handleContactOption("email")}
          >
            <View style={styles.iconWrapper}>
              <Feather name="mail" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.contactLabel}>Email Us</Text>
            <Text style={styles.contactDesc}>Reply in 1 hour</Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible FAQs */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {FAQS.map((faq, idx) => {
            const isExpanded = expandedFAQ === idx;
            return (
              <View key={idx} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleFAQ(idx)}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={Colors.textSecondary}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
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
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 16,
  },
  contactGrid: {
    flexDirection: "row",
    gap: 8,
  },
  contactCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
    textAlign: "center",
  },
  contactDesc: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
    paddingRight: 8,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  faqAnswer: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 12,
  },
});
