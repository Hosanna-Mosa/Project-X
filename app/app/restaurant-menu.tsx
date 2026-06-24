import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { useCartStore } from "@/contexts/cartStore";

interface FoodItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  images: string[];
}

export default function RestaurantMenu() {
  const { id, name, image, rating, reviews, isMeat } = useLocalSearchParams();

  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const { setVendorId } = useDeliveryStore();
  const { items, addItem, updateQuantity, getItemCount } = useCartStore();
  const colors = Colors[theme];
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("");

  const itemCount = getItemCount();

  useEffect(() => {
    if (id) setVendorId(id as string);
  }, [id]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
        const endpoint = isMeat === "true" 
          ? `${baseUrl}/api/v1/meat/menu/${id}`
          : `${baseUrl}/api/v1/food/vendor/${id}`;
          
        const response = await fetch(endpoint);
        const data = await response.json();
        
        const normalizedData = data.map((item: any) => {
          if (isMeat === "true") {
            return {
              ...item,
              isVeg: false,
              images: item.images || [item.image || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400"],
              description: item.description || `Fresh ${item.name} - ${item.weight}`,
            };
          }
          return item;
        });

        setMenu(normalizedData);
        if (normalizedData.length > 0) {
          setActiveCategory(normalizedData[0].category);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id, isMeat]);

  const groupedMenu = menu.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);

  const categories = Object.keys(groupedMenu);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Absolute Overlays (Back and Search) */}
      <View style={[styles.absoluteHeader, { top: insets.top + 10 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.circularButton} 
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#191c1e" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.circularButton} 
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={20} color="#191c1e" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 150 }} 
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Banner Image & Overlapping Floating Info Card */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: (image as string) || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600" }} 
            style={styles.heroImage} 
          />
          
          <View style={styles.floatingCard}>
            <Text style={styles.restaurantTitle}>{name}</Text>
            
            {/* Rating row */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#0061a5" />
              <Text style={styles.ratingValue}>{rating || "4.8"}</Text>
              <Text style={styles.ratingCount}>({reviews || "2k+"} ratings)</Text>
              <Text style={styles.dot}>•</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.aboutLink}>About</Text>
              </TouchableOpacity>
            </View>

            {/* Separator line */}
            <View style={styles.cardSeparator} />

            {/* Details Grid */}
            <View style={styles.gridRow}>
              <View style={styles.gridColumn}>
                <Text style={styles.gridValue}>25-35</Text>
                <Text style={styles.gridLabel}>min</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.gridColumn}>
                <Text style={styles.gridValue}>$0.99</Text>
                <Text style={styles.gridLabel}>delivery</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Category Navbar (Sticky Header) */}
        <View style={[styles.stickyTabsContainer, { backgroundColor: colors.background }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabsScrollContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.tabItem, 
                  activeCategory === cat && styles.tabItemActive
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.tabText, 
                  activeCategory === cat && styles.tabTextActive
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Menu Items */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : categories.length === 0 ? (
          <View style={styles.emptyMenu}>
            <Ionicons name="restaurant-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Menu not available yet</Text>
          </View>
        ) : (
          categories.map((category) => (
            <View key={category} style={styles.categorySection}>
              {/* Category Header with separator line */}
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category}</Text>
              </View>
              
              {/* Food list items */}
              {groupedMenu[category].map((item) => {
                const cartItem = items.find(i => i._id === item._id);
                return (
                  <View key={item._id} style={styles.menuItem}>
                    {/* Left details */}
                    <View style={styles.itemInfo}>
                      <View style={styles.itemTitleRow}>
                        <View style={[styles.vegIndicator, { borderColor: item.isVeg ? "#16A34A" : "#E11D48" }]}>
                          <View style={[styles.vegDot, { backgroundColor: item.isVeg ? "#16A34A" : "#E11D48" }]} />
                        </View>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={styles.itemPrice}>₹{item.price}</Text>
                      <Text style={styles.itemDesc} numberOfLines={3}>
                        {item.description}
                      </Text>
                    </View>

                    {/* Right image with overlapping ADD pill */}
                    <View style={styles.itemImageContainer}>
                      <Image 
                        source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400' }} 
                        style={styles.itemImage} 
                      />
                      
                      {/* ADD pill / qty selectors overlay */}
                      <View style={styles.addButtonOverlay}>
                        {cartItem ? (
                          <View style={styles.quantityPill}>
                            <TouchableOpacity 
                              onPress={() => updateQuantity(item._id, cartItem.quantity - 1)}
                              style={styles.qtyActionBtn}
                              activeOpacity={0.7}
                            >
                              <Feather name="minus" size={14} color="#002045" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                            <TouchableOpacity 
                              onPress={() => addItem(item, id as string)}
                              style={styles.qtyActionBtn}
                              activeOpacity={0.7}
                            >
                              <Feather name="plus" size={14} color="#002045" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            onPress={() => addItem(item, id as string)}
                            style={styles.addPill}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.addPillText}>ADD</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Sticky Bottom Cart Bar */}
      {itemCount > 0 && (
        <View style={[styles.cartSummary, { bottom: insets.bottom + 20 }]}>
          <View>
            <Text style={styles.cartItems}>{itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'} IN CART</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewCartButton}
            onPress={() => router.push({ pathname: "/cart", params: { vendorName: name as string } })}
          >
            <Text style={styles.viewCartText}>View Cart</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 999,
  },
  circularButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  heroSection: {
    width: "100%",
    position: "relative",
    paddingBottom: 40, // Space for overlapping floating card
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  floatingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6e8ea",
    padding: 20,
    marginHorizontal: 24,
    marginTop: -40,
    shadowColor: "#1a365d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  restaurantTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#002045",
    textAlign: "center",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#002045",
  },
  ratingCount: {
    fontSize: 14,
    color: "#43474e",
  },
  dot: {
    fontSize: 14,
    color: "#c4c6cf",
  },
  aboutLink: {
    fontSize: 14,
    color: "#0061a5",
    fontWeight: "700",
  },
  cardSeparator: {
    height: 1,
    backgroundColor: "#eceef0",
    marginVertical: 14,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  gridColumn: {
    alignItems: "center",
    flex: 1,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#191c1e",
  },
  gridLabel: {
    fontSize: 12,
    color: "#74777f",
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#eceef0",
  },
  stickyTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#eceef0",
    paddingVertical: 4,
    zIndex: 10,
  },
  tabsScrollContent: {
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "center",
  },
  tabItem: {
    paddingVertical: 12,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#002045",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#74777f",
  },
  tabTextActive: {
    color: "#002045",
    fontWeight: "700",
  },
  categorySection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  categoryHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#eceef0",
    paddingBottom: 8,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#002045",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
    gap: 16,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  vegIndicator: {
    width: 12,
    height: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#191c1e",
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#191c1e",
    marginVertical: 4,
  },
  itemDesc: {
    fontSize: 12,
    color: "#43474e",
    lineHeight: 18,
  },
  itemImageContainer: {
    position: "relative",
    width: 100,
    height: 112,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  addButtonOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  addPill: {
    width: 76,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#002045",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#002045",
  },
  quantityPill: {
    width: 76,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#002045",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  qtyActionBtn: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#002045",
  },
  emptyMenu: {
    marginTop: 80,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  cartSummary: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#000",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cartItems: {
    color: "white",
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.8,
  },
  viewCartButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  viewCartText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
});
