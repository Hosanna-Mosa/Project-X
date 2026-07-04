import React from "react";
import {
  Image,
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
import { useCartStore } from "@/contexts/cartStore";
import { customFetch } from "@/utils/api/custom-fetch";

const DELIVERY_FEE_ORIGINAL = 199;
const DELIVERY_FEE = 39; 
const TAXES_AND_FEES = 85;
const SERVICE_FEE = 49;
const DISCOUNT = 160;

const getMockCustomization = (itemName: string) => {
  if (itemName.toLowerCase().includes("pancake")) {
    return "Pancakes, Bacon, Coffee - Medium, Hash Brown Sticks";
  }
  if (itemName.toLowerCase().includes("burger")) {
    return "Small Bun (4\"), Two Small Beef Patties, Tomato, Lettuce, Pickles, Diced Onions, Mustard";
  }
  return "Standard preparation";
};

const COMPLEMENTS = [
  { id: '1', name: 'Medium Drink', price: 149, image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=200' },
  { id: '2', name: 'Large Drink', price: 199, image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=200' },
  { id: '3', name: 'French Fries', price: 129, image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=200' },
];

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { vendorName } = useLocalSearchParams();
  const { items, getTotalPrice, vendorId, updateQuantity } = useCartStore();
  const [fetchedVendorName, setFetchedVendorName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (vendorId) {
      customFetch<any>(`/api/v1/vendors/${vendorId}`)
        .then(v => {
          if (v && v.name) setFetchedVendorName(v.name);
        })
        .catch(() => {});
    }
  }, [vendorId]);

  const displayVendorName = vendorName ? String(vendorName) : (fetchedVendorName || "Whataburger");

  const subtotal = getTotalPrice();
  const total = Math.round((subtotal + TAXES_AND_FEES + DELIVERY_FEE + SERVICE_FEE - DISCOUNT) * 100) / 100;
  const originalTotal = Math.round((subtotal + TAXES_AND_FEES + DELIVERY_FEE_ORIGINAL + SERVICE_FEE) * 100) / 100;

  const goToCheckout = () => {
    router.push({
      pathname: "/checkout",
      params: {
        subtotal: String(subtotal),
        taxes: String(TAXES_AND_FEES),
        deliveryFee: String(DELIVERY_FEE),
        total: String(total),
        vendorName: displayVendorName,
      },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: '#ffffff' }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Header Layout */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="x" size={28} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>Your cart from</Text>
          <Text style={styles.headerTitle}>{displayVendorName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.divider} />

        {/* Order Items List */}
        <View style={styles.itemsListContainer}>
          {items.map((item, index) => (
            <View key={item._id}>
              <View style={styles.itemCard}>
                <View style={styles.itemImageContainer}>
                  <Image
                    source={{ uri: item.images?.[0] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300" }}
                    style={styles.itemImage}
                  />
                </View>
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCustomization}>
                    {getMockCustomization(item.name)}
                  </Text>
                  <View style={styles.priceAndQtyRow}>
                    <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                    <View style={styles.qtyController}>
                      <TouchableOpacity onPress={() => updateQuantity(item._id, item.quantity - 1)} style={styles.qtyBtn}>
                        <Feather name="minus" size={16} color="#000000" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item._id, item.quantity + 1)} style={styles.qtyBtn}>
                        <Feather name="plus" size={16} color="#000000" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
              {index < items.length - 1 ? <View style={styles.itemDivider} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.addMoreContainer}>
          <TouchableOpacity style={styles.addMoreBtn} onPress={() => router.back()}>
            <Feather name="plus" size={16} color="#000000" />
            <Text style={styles.addMoreBtnText}>Add more items</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.thickDivider} />

        {/* Complement Your Cart Section */}
        <Text style={styles.sectionTitle}>Complement your cart</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.complementsList}
        >
          {COMPLEMENTS.map((comp) => (
            <View key={comp.id} style={styles.complementCard}>
              <View style={styles.compImageContainer}>
                <Image source={{ uri: comp.image }} style={styles.compImage} />
                <TouchableOpacity style={styles.compAddBtn}>
                  <Feather name="plus" size={16} color="#000000" />
                </TouchableOpacity>
              </View>
              <Text style={styles.compName}>{comp.name}</Text>
              <Text style={styles.compPrice}>₹{comp.price.toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.thickDivider} />

        {/* Order Summary Card */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Summary</Text>
          
          <TouchableOpacity style={styles.dealsRow}>
            <Ionicons name="pricetag-outline" size={24} color="#000000" />
            <Text style={styles.dealsText}>Deals</Text>
          </TouchableOpacity>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.summaryLabel}>Estimated Tax</Text>
              <Feather name="info" size={12} color="#74777f" />
            </View>
            <Text style={styles.summaryValue}>₹{TAXES_AND_FEES.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Feather name="info" size={12} color="#74777f" />
            </View>
            <View style={styles.feeContainer}>
              <Text style={styles.crossedOutValue}>₹{DELIVERY_FEE_ORIGINAL.toFixed(2)}</Text>
              <Text style={styles.summaryValue}>₹{DELIVERY_FEE.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Feather name="info" size={12} color="#74777f" />
            </View>
            <Text style={styles.summaryValue}>₹{SERVICE_FEE.toFixed(2)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.totalValueContainer}>
              <Text style={styles.crossedOutTotal}>₹{originalTotal.toFixed(2)}</Text>
              <Text style={styles.finalTotalValue}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <View style={styles.savingsBanner}>
          <Ionicons name="pricetag" size={18} color="#000000" />
          <Text style={styles.savingsText}>Saving ₹{DISCOUNT.toFixed(2)} with Deals</Text>
        </View>
        <TouchableOpacity 
          style={styles.continueBtn} 
          onPress={goToCheckout}
          activeOpacity={0.9}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "flex-start",
    flex: 1,
    paddingLeft: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#191c1e",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
    marginTop: 2,
  },
  content: {
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#eceef0",
    width: "100%",
  },
  thickDivider: {
    height: 8,
    backgroundColor: "#f5f5f5",
    width: "100%",
    marginVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eceef0",
  },
  itemsListContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  itemCard: {
    flexDirection: "row",
    paddingVertical: 20,
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#eceef0",
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    marginRight: 16,
    position: "relative",
    justifyContent: "center",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: "cover",
  },
  itemDetails: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  itemCustomization: {
    fontSize: 14,
    color: "#74777f",
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  priceAndQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  qtyController: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eceef0",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 12,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  addMoreContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  addMoreBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  complementsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  complementCard: {
    width: 120,
  },
  compImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eceef0",
    overflow: "hidden",
    position: "relative",
    marginBottom: 8,
  },
  compImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  compAddBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  compName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  compPrice: {
    fontSize: 14,
    color: "#74777f",
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 16,
  },
  dealsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#eceef0",
    marginBottom: 16,
  },
  dealsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#43474e",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  feeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crossedOutValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#74777f",
    textDecorationLine: "line-through",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },
  totalValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crossedOutTotal: {
    fontSize: 18,
    color: "#74777f",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 4,
    borderColor: "#000000",
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },
  continueBtn: {
    backgroundColor: "#000000", // Black button
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  continueBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
