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
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";

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
  const { id, name, image, rating, reviews } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const { setVendorId } = useDeliveryStore();
  const colors = Colors[theme];
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const scrollY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) setVendorId(id as string);
  }, [id]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(`${baseUrl}/api/food/vendor/${id}`);
        const data = await response.json();
        setMenu(data);
        if (data.length > 0) {
          setActiveCategory(data[0].category);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id]);

  const groupedMenu = menu.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);

  const categories = Object.keys(groupedMenu);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header Area */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 10, backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>35-45 mins • Jayasree Gardens</Text>
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.tabItem, 
                activeCategory === cat && { borderBottomColor: colors.text }
              ]}
            >
              <Text style={[
                styles.tabText, 
                { color: activeCategory === cat ? colors.text : colors.textSecondary },
                activeCategory === cat && styles.tabTextActive
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: image as string }} style={styles.bannerImage} />
          <View style={styles.bannerBadges}>
            <View style={styles.ratingBadge}>
              <MaterialIcons name="star" size={14} color="white" />
              <Text style={styles.ratingText}>{rating} ({reviews})</Text>
            </View>
            <View style={styles.deliveryBadge}>
              <Text style={styles.deliveryBadgeText}>FREE DELIVERY</Text>
            </View>
          </View>
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
              <View style={styles.categoryHeader}>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>{category}</Text>
                <Text style={[styles.itemCount, { color: colors.textSecondary }]}>{groupedMenu[category].length} Items</Text>
              </View>
              
              {groupedMenu[category].map((item) => (
                <View key={item._id} style={[styles.menuItem, { backgroundColor: colors.surface }]}>
                  <Image source={{ uri: item.images && item.images.length > 0 ? item.images[0] : '' }} style={styles.itemImage} />
                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleRow}>
                      <View style={[styles.vegIndicator, { borderColor: item.isVeg ? "#16A34A" : "#E11D48" }]}>
                        <View style={[styles.vegDot, { backgroundColor: item.isVeg ? "#16A34A" : "#E11D48" }]} />
                      </View>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Text style={[styles.itemPrice, { color: colors.text }]}>₹{item.price}</Text>
                    <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>ADD</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Sleek Black Cart Bar */}
      <View style={[styles.cartSummary, { bottom: insets.bottom + 20 }]}>
        <View>
          <Text style={styles.cartItems}>1 ITEM IN CART</Text>
          <Text style={styles.cartPrice}>₹{menu[0]?.price || 0} plus taxes</Text>
        </View>
        <TouchableOpacity style={styles.viewCartButton}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    paddingLeft: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 25,
    paddingBottom: 5,
  },
  tabItem: {
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '400',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  bannerContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerBadges: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    flexDirection: 'row',
    gap: 10,
  },
  ratingBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  deliveryBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliveryBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  categorySection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '500',
  },
  itemCount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  itemContent: {
    flex: 1,
    paddingHorizontal: 15,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  vegIndicator: {
    width: 12,
    height: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  itemPrice: {
    fontSize: 17,
    fontWeight: '700',
    marginVertical: 4,
  },
  itemDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  addButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyMenu: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  cartSummary: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    opacity: 0.8,
  },
  cartPrice: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  viewCartButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  viewCartText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});
