import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenWrapper } from "@/components/ScreenWrapper";

const FAQ_ITEMS = [
  { q: "How does multi-stop delivery work?", a: "Add up to 10 pickup locations and our algorithm optimizes the route automatically." },
  { q: "How is the delivery fee calculated?", a: "Base fee + distance cost + per-stop charges. You see the full breakdown before confirming." },
  { q: "Can I track my delivery in real-time?", a: "Yes! Once confirmed, you can see your driver's location and order status live." },
  { q: "What payment methods are accepted?", a: "Credit/debit cards, digital wallets. Pay stores directly on delivery." },
];

export default function SupportScreen() {
  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.title}>Support</Text>

      <View style={styles.heroCard}>
        <Feather name="headphones" size={32} color={Colors.light.primary} />
        <Text style={styles.heroTitle}>How can we help?</Text>
        <Text style={styles.heroSubtitle}>
          Our support team is available 24/7 to assist you.
        </Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard}>
          <Feather name="message-circle" size={22} color={Colors.light.primary} />
          <Text style={styles.actionLabel}>Live Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Feather name="phone" size={22} color={Colors.light.teal} />
          <Text style={styles.actionLabel}>Call Us</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Feather name="mail" size={22} color="#8B5CF6" />
          <Text style={styles.actionLabel}>Email</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      {FAQ_ITEMS.map((item, i) => (
        <View key={i} style={styles.faqCard}>
          <Text style={styles.faqQ}>{item.q}</Text>
          <Text style={styles.faqA}>{item.a}</Text>
        </View>
      ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  heroCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.text,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: 4,
  },
  faqCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqQ: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  faqA: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
});
