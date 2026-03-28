import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const PAYMENT_METHODS = [
  { id: "1", last4: "4342", brand: "Visa", isDefault: true, expires: "03/27" },
  { id: "2", last4: "7891", brand: "Mastercard", isDefault: false, expires: "08/26" },
];

const TRANSACTIONS = [
  { id: "t1", name: "Multi-Stop Delivery", date: "Today", amount: -9.50 },
  { id: "t2", name: "The Green Kitchen", date: "Yesterday", amount: -18.75 },
  { id: "t3", name: "Top-up Wallet", date: "Mar 25", amount: 50.00 },
  { id: "t4", name: "City Market Grocery", date: "Mar 24", amount: -34.20 },
];

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Payments</Text>

      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Total Balance</Text>
        <Text style={styles.walletBalance}>$234.50</Text>
        <Text style={styles.walletSub}>Available for deliveries</Text>
        <TouchableOpacity style={styles.topUpBtn}>
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.topUpText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Payment Methods</Text>
      {PAYMENT_METHODS.map((pm) => (
        <View key={pm.id} style={styles.paymentCard}>
          <View style={styles.cardBrand}>
            <Feather name="credit-card" size={22} color={Colors.light.primary} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardTop}>
              <Text style={styles.cardBrandName}>{pm.brand}</Text>
              {pm.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardNumber}>•••• •••• •••• {pm.last4}</Text>
            <Text style={styles.cardExpiry}>Expires {pm.expires}</Text>
          </View>
          <TouchableOpacity>
            <Feather name="more-vertical" size={18} color={Colors.light.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addCardBtn}>
        <Feather name="plus-circle" size={18} color={Colors.light.primary} />
        <Text style={styles.addCardText}>Add Payment Method</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {TRANSACTIONS.map((t) => (
        <View key={t.id} style={styles.transactionRow}>
          <View style={[
            styles.txIcon,
            { backgroundColor: t.amount > 0 ? `${Colors.light.success}15` : `${Colors.light.primary}15` },
          ]}>
            <Feather
              name={t.amount > 0 ? "arrow-down-left" : "arrow-up-right"}
              size={16}
              color={t.amount > 0 ? Colors.light.success : Colors.light.primary}
            />
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txName}>{t.name}</Text>
            <Text style={styles.txDate}>{t.date}</Text>
          </View>
          <Text
            style={[
              styles.txAmount,
              { color: t.amount > 0 ? Colors.light.success : Colors.light.text },
            ]}
          >
            {t.amount > 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  walletCard: {
    backgroundColor: Colors.light.primary,
    borderRadius: 22,
    padding: 24,
    gap: 6,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
  },
  walletBalance: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  walletSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  topUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
  },
  topUpText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: 8,
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBrand: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardBrandName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  defaultBadge: {
    backgroundColor: `${Colors.light.primary}15`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  cardNumber: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  cardExpiry: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: "center",
    backgroundColor: `${Colors.light.primary}06`,
  },
  addCardText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  txDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
});
