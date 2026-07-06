import React, { useEffect, useState, useRef } from "react";
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
  TextInput,
  Modal,
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
  const { id, name, image, rating, reviews, isMeat, highlightDishId } = useLocalSearchParams();

  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const { setVendorId } = useDeliveryStore();
  const { items, addItem, updateQuantity, getItemCount } = useCartStore();
  const colors = Colors[theme];
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [scrolledPast, setScrolledPast] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState("");
  const [selectedDishDetail, setSelectedDishDetail] = useState<any | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const itemCount = getItemCount();

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    // Trigger when scrolled past the hero image (hero image height is 220px)
    if (y > 180) {
      setScrolledPast(true);
    } else {
      setScrolledPast(false);
    }
  };

  const handleCategoryPress = (category: string) => {
    setActiveCategory(category);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: 280,
        animated: true,
      });
    }
  };

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
          let categoryToSelect = "Recommended";
          if (highlightDishId) {
            const targetItem = normalizedData.find((item: any) => item._id === highlightDishId);
            if (targetItem) {
              categoryToSelect = targetItem.category;
              setHighlightedItemId(highlightDishId as string);
              // Clear highlight after 2.5 seconds
              setTimeout(() => {
                setHighlightedItemId("");
              }, 2500);
              // Scroll to the categories/items section after layout renders
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 340, animated: true });
              }, 600);
            }
          }
          setActiveCategory(categoryToSelect);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id, isMeat]);

  const filteredMenu = menu.filter((item) => {
    if (!searchQuery) return true;
    const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || descMatch || catMatch;
  });

  const groupedMenu = filteredMenu.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);

  const categories = Object.keys(groupedMenu);
  const recommendedItems = menu.slice(0, 4);
  const showRecommended = !searchQuery && activeCategory === "Recommended" && recommendedItems.length > 0;
  const tabCategories = searchQuery ? categories : (menu.length > 0 ? ["Recommended", ...categories] : categories);

  // Auto-select category if search renders current category empty, or if Recommended is active when searching
  useEffect(() => {
    if (searchQuery) {
      if (activeCategory === "Recommended" || !categories.includes(activeCategory)) {
        if (categories.length > 0) {
          setActiveCategory(categories[0]);
        }
      }
    }
  }, [searchQuery, categories]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Solid Search Header Overlay - Matches DESIGN.md */}
      {showSearchBar && (
        <View style={[
          styles.searchHeader, 
          { 
            paddingTop: insets.top, 
            height: insets.top + 56, 
            backgroundColor: colors.background, 
            borderBottomColor: colors.borderLight 
          }
        ]}>
          <TouchableOpacity 
            onPress={() => {
              setShowSearchBar(false);
              setSearchQuery("");
            }} 
            style={styles.searchHeaderBtn} 
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TextInput
            style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}
            placeholder="Search for dishes..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery("")} 
              style={styles.searchHeaderBtn} 
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Absolute Overlays (Back and Search) - Only visible when not scrolled past hero */}
      {!scrolledPast && !showSearchBar && (
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
            onPress={() => setShowSearchBar(true)}
          >
            <Ionicons name="search-outline" size={20} color="#191c1e" />
          </TouchableOpacity>
        </View>
      )}

      {/* Solid Header at the top when scrolled past hero */}
      {scrolledPast && !showSearchBar && (
        <View style={[
          styles.solidHeader, 
          { 
            paddingTop: insets.top, 
            height: insets.top + 56, 
            backgroundColor: colors.background, 
            borderBottomColor: colors.borderLight 
          }
        ]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.solidHeaderBtn} 
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.solidHeaderTitle, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <TouchableOpacity 
            style={styles.solidHeaderBtn} 
            activeOpacity={0.7}
            onPress={() => setShowSearchBar(true)}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Fixed Sticky Tabs Container below the Solid Header */}
      {scrolledPast && (
        <View style={[
          styles.fixedTabsContainer, 
          { 
            top: insets.top + 56, 
            backgroundColor: colors.background, 
            borderBottomColor: colors.borderLight 
          }
        ]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabsScrollContent}
          >
            {tabCategories.map((cat) => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => handleCategoryPress(cat)}
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
      )}

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 150 }} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Banner Image & Overlapping Floating Info Card */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: (image as string) || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600" }} 
            style={styles.heroImage} 
          />
          
          <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: "/restaurant-details",
                params: { id: id as string, name: name as string, image: image as string, rating: rating as string, reviews: reviews as string, isMeat: isMeat as string }
              })}
              style={styles.fabButton}
            >
              <Ionicons name="information" size={24} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.floatingCard}>
            <Text style={styles.restaurantTitle}>{name}</Text>
            
            {/* Rating row */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#0061a5" />
              <Text style={styles.ratingValue}>{rating || "4.8"}</Text>
              <Text style={styles.ratingCount}>({reviews || "2k+"} ratings)</Text>
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
        {!scrolledPast && (
          <View style={[styles.stickyTabsContainer, { backgroundColor: colors.background }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.tabsScrollContent}
            >
              {tabCategories.map((cat) => (
                <TouchableOpacity 
                  key={cat} 
                  onPress={() => handleCategoryPress(cat)}
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
        )}

        {/* Menu Items */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : categories.length === 0 ? (
          <View style={styles.emptyMenu}>
            <Ionicons name="search-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? "No dishes match your search" : "Menu not available yet"}
            </Text>
          </View>
        ) : (
          <View>
            {/* Recommended Items Grid */}
            {showRecommended && (
              <View style={styles.recommendedSection}>
                <Text style={styles.recommendedTitle}>★ Recommended</Text>
                <View style={styles.recommendedGrid}>
                  {recommendedItems.map((item) => {
                    const cartItem = items.find(i => i._id === item._id);
                    const isBestseller = item.price > 200 || item.name.toLowerCase().includes("special") || item.name.toLowerCase().includes("biryani");
                    return (
                      <View key={`rec-${item._id}`} style={styles.recommendedCard}>
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDishDetail(item)}>
                          <View style={styles.recImageContainer}>
                            <Image 
                              source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400' }} 
                              style={styles.recImage} 
                            />
                            {isBestseller && (
                              <View style={styles.bestsellerBadge}>
                                <Text style={styles.bestsellerText}>BESTSELLER</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                        
                        <View style={styles.recDetails}>
                          <View style={styles.recTitleRow}>
                            <View style={[styles.vegIndicator, { borderColor: item.isVeg ? "#16A34A" : "#E11D48", marginRight: 4 }]}>
                              <View style={[styles.vegDot, { backgroundColor: item.isVeg ? "#16A34A" : "#E11D48" }]} />
                            </View>
                          </View>
                          <Text style={styles.recItemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          
                          <View style={styles.recFooter}>
                            <Text style={styles.recItemPrice}>₹{item.price}</Text>
                            
                            <View style={styles.recAddButtonContainer}>
                              {cartItem ? (
                                <View style={styles.recQuantityPill}>
                                  <TouchableOpacity 
                                    onPress={() => updateQuantity(item._id, cartItem.quantity - 1)}
                                    style={styles.recQtyActionBtn}
                                    activeOpacity={0.7}
                                  >
                                    <Feather name="minus" size={12} color="#002045" />
                                  </TouchableOpacity>
                                  <Text style={styles.recQtyText}>{cartItem.quantity}</Text>
                                  <TouchableOpacity 
                                    onPress={() => addItem(item, id as string)}
                                    style={styles.recQtyActionBtn}
                                    activeOpacity={0.7}
                                  >
                                    <Feather name="plus" size={12} color="#002045" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  onPress={() => addItem(item, id as string)}
                                  style={styles.recAddPill}
                                  activeOpacity={0.85}
                                >
                                  <Text style={styles.recAddPillText}>ADD</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Standard Category Menu List */}
            {categories
              .filter((category) => activeCategory === "Recommended" || category === activeCategory)
              .map((category) => (
                <View key={category} style={styles.categorySection}>
                  {/* Category Header */}
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                  </View>
                  
                  {/* Food list items */}
                  {groupedMenu[category].map((item) => {
                    const cartItem = items.find(i => i._id === item._id);
                    return (
                      <View 
                        key={item._id} 
                        style={[
                          styles.menuItem,
                          highlightedItemId === item._id && {
                            backgroundColor: "#FEF08A",
                            borderColor: "#CA8A04",
                            borderWidth: 1,
                            borderRadius: 12,
                          }
                        ]}
                      >
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
                          <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDishDetail(item)}>
                            <Image 
                              source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400' }} 
                              style={styles.itemImage} 
                            />
                          </TouchableOpacity>
                          
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
              ))}
          </View>
        )}
      </ScrollView>

      {/* Dish Detail Modal */}
      <Modal visible={!!selectedDishDetail} transparent animationType="slide" statusBarTranslucent={true}>
        <View style={styles.dishModalBackdrop}>
          <TouchableOpacity style={styles.dishModalDismissArea} onPress={() => setSelectedDishDetail(null)} activeOpacity={1} />
          
          <View style={styles.dishModalContainer}>
            {/* Floating Close Button */}
            <TouchableOpacity style={styles.dishModalCloseBtn} onPress={() => setSelectedDishDetail(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {selectedDishDetail && (
              <>
                <Image 
                  source={{ uri: selectedDishDetail.images && selectedDishDetail.images.length > 0 ? selectedDishDetail.images[0] : 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800' }} 
                  style={styles.dishModalImage}
                />
                <View style={styles.dishModalContent}>
                  <View style={styles.dishModalHeaderRow}>
                    <View style={styles.dishModalHeaderLeft}>
                      <View style={[styles.vegIndicator, { borderColor: selectedDishDetail.isVeg ? "#16A34A" : "#E11D48", marginRight: 6 }]}>
                        <View style={[styles.vegDot, { backgroundColor: selectedDishDetail.isVeg ? "#16A34A" : "#E11D48" }]} />
                      </View>
                      {(selectedDishDetail.price > 200 || selectedDishDetail.name.toLowerCase().includes("special") || selectedDishDetail.name.toLowerCase().includes("biryani")) && (
                        <Text style={styles.dishModalBestseller}>★ Bestseller</Text>
                      )}
                    </View>
                    <View style={styles.recAddButtonContainer}>
                      {items.find(i => i._id === selectedDishDetail._id) ? (
                        <View style={[styles.recQuantityPill, { width: 100, height: 36, borderRadius: 18, paddingHorizontal: 12 }]}>
                          <TouchableOpacity 
                            onPress={() => updateQuantity(selectedDishDetail._id, (items.find(i => i._id === selectedDishDetail._id)?.quantity || 1) - 1)}
                            style={[styles.recQtyActionBtn, { width: 24, height: 24 }]}
                            activeOpacity={0.7}
                          >
                            <Feather name="minus" size={16} color="#002045" />
                          </TouchableOpacity>
                          <Text style={[styles.recQtyText, { fontSize: 16 }]}>{items.find(i => i._id === selectedDishDetail._id)?.quantity}</Text>
                          <TouchableOpacity 
                            onPress={() => addItem(selectedDishDetail, id as string)}
                            style={[styles.recQtyActionBtn, { width: 24, height: 24 }]}
                            activeOpacity={0.7}
                          >
                            <Feather name="plus" size={16} color="#002045" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          onPress={() => addItem(selectedDishDetail, id as string)}
                          style={[styles.recAddPill, { width: 100, height: 36, borderRadius: 18 }]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.recAddPillText, { fontSize: 16 }]}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <Text style={styles.dishModalTitle}>{selectedDishDetail.name}</Text>
                  <Text style={styles.dishModalPrice}>₹{selectedDishDetail.price}</Text>
                  
                  <View style={{flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 12}}>
                    <Text style={styles.dishModalRatingText}>★ 4.7 (34)</Text>
                  </View>

                  <Text style={styles.dishModalDesc}>
                    {selectedDishDetail.description || "Soft, thick rice pancake generously topped with fresh ingredients and lightly crisped. Served with sambar and three chutneys."}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
  fabContainer: {
    position: "absolute",
    top: 158,
    right: 36,
    zIndex: 10,
    shadowColor: "#002045",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#002045",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
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
    borderBottomWidth: 0,
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
    borderBottomWidth: 0,
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
  solidHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  solidHeaderTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  solidHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fixedTabsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 999,
    borderBottomWidth: 0,
  },
  searchHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1001,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  recommendedSection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#002045",
    marginBottom: 16,
  },
  recommendedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  recommendedCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eceef0",
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  recImageContainer: {
    width: "100%",
    height: 110,
    position: "relative",
  },
  recImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bestsellerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF6F00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestsellerText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  recDetails: {
    padding: 10,
    gap: 4,
  },
  recTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#191c1e",
  },
  recFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  recItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#191c1e",
  },
  recAddButtonContainer: {
    minWidth: 60,
    height: 26,
  },
  recAddPill: {
    width: 60,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#002045",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recAddPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#002045",
  },
  recQuantityPill: {
    width: 60,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#002045",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recQtyActionBtn: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  recQtyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#002045",
  },

  
  // Dish Detail Modal Styles
  dishModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dishModalDismissArea: {
    flex: 1,
  },
  dishModalContainer: {
    width: "100%",
    backgroundColor: "transparent",
    position: "relative",
  },
  dishModalCloseBtn: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  dishModalImage: {
    width: "100%",
    height: 280,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    resizeMode: "cover",
  },
  dishModalContent: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 40,
  },
  dishModalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dishModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dishModalBestseller: {
    color: "#E5774E",
    fontWeight: "bold",
    fontSize: 13,
  },
  dishModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 4,
  },
  dishModalPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4b5563",
  },
  dishModalRatingText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "bold",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dishModalDesc: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 22,
    marginTop: 8,
  },
});
