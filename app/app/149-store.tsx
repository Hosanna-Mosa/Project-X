import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, SafeAreaView, Platform, StatusBar, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { moderateScale } from 'react-native-size-matters';
import { customFetch } from '@/utils/api/custom-fetch';
import { useDeliveryStore } from '@/contexts/deliveryStore';
import { useCartStore } from '@/contexts/cartStore';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

export default function Store149Screen() {
  const { currentCoords } = useDeliveryStore();
  const { items: cartItems, addItem: addCartItem, updateQuantity: updateCartQuantity } = useCartStore();
  const [store149Items, setStore149Items] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateAnimFast = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createFloat = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    };
    createFloat(floatAnim, 2000);
    createFloat(floatAnim2, 3000);
    createFloat(floatAnim3, 2500);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(rotateAnimFast, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);

  const getFloatStyle = (anim: Animated.Value, range: number) => ({
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -range] }) }],
  });

  const pulsingStyle = {
    transform: [{ scale: pulseAnim }],
    opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.8, 0.0] }),
  };

  const getRotateStyle = (anim: Animated.Value, reverse = false) => ({
    transform: [{
      rotate: anim.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] })
    }],
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (currentCoords?.lat && currentCoords?.lng) {
          const data = await customFetch<any>(`/api/v1/food/store-149?lat=${currentCoords.lat}&lng=${currentCoords.lng}`);
          if (Array.isArray(data)) {
            setStore149Items(data);
          }
        }
      } catch (error) {
        console.error("Error fetching 149 store items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [currentCoords]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        
        {/* Dynamic Purple Header */}
        <LinearGradient
          colors={['#7E3AF2', '#6025C0', '#4C1D95']}
          style={styles.headerGradient}
        >
          <SafeAreaView>
            {/* Top Bar Navigation */}
            <View style={styles.topNav}>
              <TouchableOpacity style={styles.navButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={moderateScale(24)} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Header Branding */}
            <View style={styles.brandContainer}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>149</Text>
              </View>
              <Text style={styles.brandText}>Store</Text>
            </View>
            
            <Text style={styles.headerTitle}>Meals at ₹149</Text>
            <Text style={styles.headerSubtitle}>from top restaurants near you</Text>
            
            {/* Highly Animated Custom Banner Design */}
            <View style={styles.bannerDesignContainer}>
               
               {/* Multiple Pulsing Rings */}
               <Animated.View style={[styles.glowRing, pulsingStyle, { width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(253, 224, 71, 0.4)' }]} />
               <Animated.View style={[styles.glowRing, pulsingStyle, { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(245, 158, 11, 0.6)' }]} />

               {/* Particle System (Food Icons and Stars) */}
               <Animated.View style={[styles.floatingElement, { top: -10, left: 30 }, getFloatStyle(floatAnim2, 20), getRotateStyle(rotateAnimFast)]}>
                 <Ionicons name="fast-food" size={moderateScale(32)} color="#FDE047" />
               </Animated.View>
               <Animated.View style={[styles.floatingElement, { bottom: 15, left: 15 }, getFloatStyle(floatAnim3, 15), getRotateStyle(rotateAnim)]}>
                 <Ionicons name="pizza" size={moderateScale(38)} color="#F59E0B" />
               </Animated.View>
               <Animated.View style={[styles.floatingElement, { top: 15, right: 30 }, getFloatStyle(floatAnim2, 25), getRotateStyle(rotateAnim, true)]}>
                 <Ionicons name="restaurant" size={moderateScale(28)} color="#FDE047" />
               </Animated.View>
               <Animated.View style={[styles.floatingElement, { bottom: 25, right: 15 }, getFloatStyle(floatAnim3, 20), getRotateStyle(rotateAnimFast, true)]}>
                 <Ionicons name="ice-cream" size={moderateScale(36)} color="#F59E0B" />
               </Animated.View>

               <Animated.View style={[styles.floatingElement, { top: 50, left: -5 }, getFloatStyle(floatAnim, 10)]}>
                 <Ionicons name="star" size={moderateScale(20)} color="#FEF08A" />
               </Animated.View>
               <Animated.View style={[styles.floatingElement, { top: 65, right: -5 }, getFloatStyle(floatAnim, 15)]}>
                 <Ionicons name="sparkles" size={moderateScale(24)} color="#FEF08A" />
               </Animated.View>

               {/* Center 3D-like Badge */}
               <Animated.View style={[styles.centerBadgeContainer, getFloatStyle(floatAnim, 12)]}>
                  <LinearGradient colors={['#FEF08A', '#F59E0B', '#D97706']} style={styles.centerBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                     <View style={styles.centerBadgeInner}>
                       <Text style={styles.badgeTextTop}>CRAVING?</Text>
                       <Text style={styles.badgeTextMain}>₹149</Text>
                       <Text style={styles.badgeTextBottom}>ANY DISH</Text>
                     </View>
                  </LinearGradient>
               </Animated.View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Product Grid Layout */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#7E3AF2" />
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {store149Items.map((item, index) => {
              const cartItem = cartItems.find((i) => i._id === item._id);

              const handleAdd = () => {
                const foodItem = {
                  _id: item._id,
                  name: item.name,
                  description: item.description || "",
                  price: item.price,
                  category: item.category || "149 Store",
                  isVeg: item.isVeg,
                  images: item.images && item.images.length > 0 ? item.images : ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"]
                };
                addCartItem(foodItem, item.vendorId);
              };

              return (
                <View key={item._id} style={styles.productCard}>
                  
                  {/* Product Image & Select Button */}
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: item.images && item.images.length > 0 ? item.images[0] : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }} style={styles.productImage} />
                    
                    {/* Diet overlay (top-left) */}
                    <View style={styles.dietOverlay}>
                      <View style={[styles.dietIcon, { borderColor: item.isVeg ? "#16A34A" : "#E11D48" }]}>
                        <View style={[styles.dietDot, { backgroundColor: item.isVeg ? "#16A34A" : "#E11D48" }]} />
                      </View>
                    </View>

                    {/* Rating overlay (top-right) */}
                    <View style={styles.ratingOverlay}>
                      <Ionicons name="star" size={moderateScale(9)} color="#F59E0B" />
                      <Text style={styles.ratingOverlayText}>{item.rating || "4.2"}</Text>
                    </View>

                    {/* Add Button */}
                    {cartItem ? (
                      <View style={styles.qtyPill}>
                        <TouchableOpacity
                          onPress={() => updateCartQuantity(item._id, cartItem.quantity - 1)}
                          style={styles.qtyBtn}
                          activeOpacity={0.7}
                        >
                          <Feather name="minus" size={moderateScale(11)} color="#002045" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                        <TouchableOpacity
                          onPress={handleAdd}
                          style={styles.qtyBtn}
                          activeOpacity={0.7}
                        >
                          <Feather name="plus" size={moderateScale(11)} color="#002045" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.selectButton} onPress={handleAdd}>
                        <Text style={styles.selectButtonText}>ADD</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Quantity Pill equivalent (Brand) */}
                  <View style={styles.quantityPill}>
                    <Text style={styles.quantityText} numberOfLines={1}>{item.brand || "Restaurant"}</Text>
                  </View>

                  {/* Product Title */}
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {/* Pricing */}
                  <View style={styles.priceRow}>
                    <Text style={styles.discountPrice}>₹{item.price}</Text>
                    {item.originalPrice && (
                      <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
                    )}
                  </View>
                  
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),
    overflow: 'hidden',
    paddingBottom: 20,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 20,
  },
  navButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  brandContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: moderateScale(12),
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  logoBadgeText: {
    color: '#FFD700',
    fontSize: moderateScale(24),
    fontWeight: '900',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: moderateScale(28),
    fontWeight: '800',
  },
  headerTitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: moderateScale(22),
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    textAlign: 'center',
    color: '#E5E7EB',
    fontSize: moderateScale(14),
    fontWeight: '500',
    marginBottom: 20,
  },
  bannerDesignContainer: {
    height: 180,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    zIndex: -1,
  },
  floatingElement: {
    position: 'absolute',
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  centerBadgeContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  centerBadge: {
    width: moderateScale(140),
    height: moderateScale(140),
    borderRadius: moderateScale(70),
    padding: 6,
  },
  centerBadgeInner: {
    flex: 1,
    backgroundColor: '#7E3AF2',
    borderRadius: moderateScale(64),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FEF08A',
    borderStyle: 'dashed',
  },
  badgeTextTop: {
    color: '#FEF08A',
    fontSize: moderateScale(12),
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  badgeTextMain: {
    color: '#FFFFFF',
    fontSize: moderateScale(42),
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 5,
  },
  badgeTextBottom: {
    color: '#FEF08A',
    fontSize: moderateScale(14),
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  productCard: {
    width: (width - 16) / 3, // 3 columns
    padding: 8,
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: moderateScale(8),
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  selectButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: moderateScale(6),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectButtonText: {
    color: '#2563EB',
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  quantityPill: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: moderateScale(12),
    marginBottom: 8,
  },
  quantityText: {
    fontSize: moderateScale(10),
    color: '#4B5563',
    fontWeight: '600',
  },
  productName: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    minHeight: 32, // Ensures uniform height for 2 lines
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountPrice: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: '#1F2937',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  dietOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: moderateScale(4),
    padding: 2,
  },
  dietIcon: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dietDot: {
    width: moderateScale(4),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
  },
  ratingOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: moderateScale(4),
  },
  ratingOverlayText: {
    fontSize: moderateScale(9),
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 2,
  },
  qtyPill: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(6),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 4,
  },
});
