import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useCartStore } from "@/contexts/cartStore";
import { useThemeStore } from "@/contexts/themeStore";

const DELIVERY_FEE = 0;
const TAX_RATE = 0.05;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { vendorName } = useLocalSearchParams();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { items, updateQuantity, removeItem, getTotalPrice, getItemCount } = useCartStore();

  const itemCount = getItemCount();
  const subtotal = getTotalPrice();
  const taxes = Math.round(subtotal * TAX_RATE);
  const total = subtotal + taxes + DELIVERY_FEE;

  const goToCheckout = () => {
    router.push({
      pathname: "/checkout",
      params: {
        subtotal: String(subtotal),
        taxes: String(taxes),
        deliveryFee: String(DELIVERY_FEE),
        total: String(total),
      },
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 42 : 14) }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Cart</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {vendorName ? String(vendorName) : "Review your selected items"}
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add items from a restaurant menu to continue.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 150 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{itemCount} {itemCount === 1 ? "Item" : "Items"}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.addMore}>Add more</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.itemsCard}>
              {items.map((item) => (
                <View key={item._id} style={styles.cartItem}>
                  <Image
                    source={{ uri: item.images?.[0] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300" }}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <View style={[styles.vegIndicator, { borderColor: item.isVeg ? colors.success : colors.error }]}>
                        <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.success : colors.error }]} />
                      </View>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    </View>
                    <Text style={styles.itemPrice}>Rs.{item.price}</Text>
                    <TouchableOpacity onPress={() => removeItem(item._id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quantityBox}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQuantity(item._id, item.quantity - 1)}
                    >
                      <Feather name="minus" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQuantity(item._id, item.quantity + 1)}
                    >
                      <Feather name="plus" size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.billCard}>
              <Text style={styles.billTitle}>Bill Details</Text>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item total</Text>
                <Text style={styles.billValue}>Rs.{subtotal}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery fee</Text>
                <Text style={styles.billValue}>{DELIVERY_FEE === 0 ? "Free" : `Rs.${DELIVERY_FEE}`}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Taxes</Text>
                <Text style={styles.billValue}>Rs.{taxes}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>To pay</Text>
                <Text style={styles.totalValue}>Rs.{total}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <View>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={styles.footerAmount}>Rs.{total}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={goToCheckout}>
              <Text style={styles.checkoutText}>Checkout</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  content: { padding: 16, gap: 14 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  addMore: { fontSize: 13, fontWeight: "700", color: colors.primary },
  itemsCard: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.surfaceSecondary },
  itemInfo: { flex: 1, gap: 5 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  vegIndicator: { width: 12, height: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  itemName: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.text },
  itemPrice: { fontSize: 14, fontWeight: "700", color: colors.text },
  removeText: { fontSize: 12, fontWeight: "700", color: colors.error },
  quantityBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  qtyText: { minWidth: 18, textAlign: "center", fontSize: 15, fontWeight: "800", color: colors.text },
  billCard: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  billTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  billRow: { flexDirection: "row", justifyContent: "space-between" },
  billLabel: { fontSize: 13, color: colors.textSecondary },
  billValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: colors.text },
  totalValue: { fontSize: 17, fontWeight: "900", color: colors.text },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
  footerAmount: { fontSize: 20, color: colors.text, fontWeight: "900" },
  checkoutButton: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14 },
  checkoutText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 14 },
  emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
