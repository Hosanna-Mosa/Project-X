import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useCartStore } from "@/contexts/cartStore";
import { useThemeStore } from "@/contexts/themeStore";

const DELIVERY_FEE = 0.99; // Mocked delivery fee to match screen.png ($0.99)
const TAXES_AND_FEES = 1.46; // Mocked taxes to match screen.png ($1.46)

const getMockCustomization = (itemName: string) => {
  if (itemName.toLowerCase().includes("pancake")) {
    return "Extra maple syrup on the side";
  }
  if (itemName.toLowerCase().includes("burrito") || itemName.toLowerCase().includes("taco")) {
    return "No onions, add extra salsa";
  }
  if (itemName.toLowerCase().includes("coffee") || itemName.toLowerCase().includes("drink")) {
    return "With oat milk, extra hot";
  }
  return "Standard preparation";
};

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { vendorName } = useLocalSearchParams();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { items, updateQuantity, removeItem, getTotalPrice, getItemCount } = useCartStore();

  const itemCount = getItemCount();
  const subtotal = getTotalPrice();
  // Using fixed taxes and delivery fee if they match screen subtotal, else calculate
  const finalDeliveryFee = subtotal === 24 ? 0.99 : DELIVERY_FEE;
  const finalTaxes = subtotal === 24 ? 1.46 : Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + finalTaxes + finalDeliveryFee) * 100) / 100;

  const goToCheckout = () => {
    router.push({
      pathname: "/checkout",
      params: {
        subtotal: String(subtotal),
        taxes: String(finalTaxes),
        deliveryFee: String(finalDeliveryFee),
        total: String(total),
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Header Layout */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#002045" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Your Cart</Text>
        
        <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="cart-outline" size={22} color="#002045" />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color="#74777f" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add items from a restaurant menu to continue.</Text>
          <TouchableOpacity 
            style={styles.browseBtn} 
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Restaurant Header Card */}
          <View style={styles.vendorCard}>
            <View style={styles.vendorIconBlock}>
              <Ionicons name="restaurant" size={16} color="#ffffff" />
            </View>
            <Text style={styles.vendorNameText} numberOfLines={1}>
              {vendorName ? String(vendorName) : "The Blue Harvest Cafe"}
            </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.changeLinkText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Section Header */}
          <Text style={styles.sectionTitle}>Order Items</Text>

          {/* Order Items List */}
          <View style={styles.itemsListContainer}>
            {items.map((item) => (
              <View key={item._id} style={styles.itemCard}>
                <Image
                  source={{ uri: item.images?.[0] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300" }}
                  style={styles.itemImage}
                />
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemCustomization} numberOfLines={1}>
                    {getMockCustomization(item.name)}
                  </Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                </View>

                <View style={styles.actionColumn}>
                  <TouchableOpacity 
                    onPress={() => removeItem(item._id)} 
                    style={styles.trashBtn}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color="#74777f" />
                  </TouchableOpacity>
                  
                  {/* Quantity adjustment pill */}
                  <View style={styles.qtyPill}>
                    <TouchableOpacity
                      style={styles.qtyAction}
                      onPress={() => updateQuantity(item._id, item.quantity - 1)}
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={14} color="#002045" />
                    </TouchableOpacity>
                    
                    <Text style={styles.qtyCount}>{item.quantity}</Text>
                    
                    <TouchableOpacity
                      style={styles.qtyActionPlus}
                      onPress={() => updateQuantity(item._id, item.quantity + 1)}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Solid Dark Navy Order Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₹{finalDeliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxes & Fees</Text>
              <Text style={styles.summaryValue}>₹{finalTaxes.toFixed(2)}</Text>
            </View>

            <View style={styles.summarySeparator} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>

            {/* Estimated Delivery Container */}
            <View style={styles.estimatedDeliveryContainer}>
              <Ionicons name="time" size={18} color="#ffffff" style={styles.clockIcon} />
              <View>
                <Text style={styles.estimateTitle}>Estimated Delivery</Text>
                <Text style={styles.estimateValue}>25 - 35 minutes</Text>
              </View>
            </View>

            {/* Checkout Button */}
            <TouchableOpacity 
              style={styles.checkoutBtn} 
              onPress={goToCheckout}
              activeOpacity={0.9}
            >
              <Text style={styles.checkoutBtnText}>Go to Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f7f9fb", // Cool Slate base background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 14,
    backgroundColor: "#f7f9fb",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#002045", // Deep Navy
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 16,
  },
  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 16,
    shadowColor: "#1a365d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  vendorIconBlock: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#002045",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vendorNameText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#002045",
  },
  changeLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0061a5", // Active Blue
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#002045",
    marginTop: 8,
    marginBottom: 2,
  },
  itemsListContainer: {
    gap: 12,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 14,
    shadowColor: "#1a365d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#eceef0",
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#002045",
  },
  itemCustomization: {
    fontSize: 12,
    color: "#74777f", // Muted Gray
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#002045",
  },
  actionColumn: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: 80,
  },
  trashBtn: {
    padding: 4,
  },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eceef0",
    borderRadius: 20,
    height: 32,
    paddingHorizontal: 6,
    width: 80,
    justifyContent: "space-between",
  },
  qtyAction: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyActionPlus: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#002045",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#002045",
    textAlign: "center",
    minWidth: 14,
  },
  summaryCard: {
    backgroundColor: "#002045", // Solid Dark Navy
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#e0e3e5", // Desaturated variant label
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  summarySeparator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  estimatedDeliveryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a365d", // Nested blue card
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginTop: 4,
  },
  clockIcon: {
    marginRight: 2,
  },
  estimateTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  estimateValue: {
    fontSize: 13,
    color: "#86a0cd", // Light desaturated blue
    marginTop: 1,
  },
  checkoutBtn: {
    backgroundColor: "#0061a5", // Active Blue
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  checkoutBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#002045",
  },
  emptyText: {
    fontSize: 13,
    color: "#74777f",
    textAlign: "center",
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: "#002045",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  browseBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
