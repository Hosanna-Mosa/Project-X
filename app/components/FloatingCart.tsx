import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { router, usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '@/contexts/cartStore';
import Colors from '@/constants/colors';
import { useThemeStore } from '@/contexts/themeStore';
import { useAuthStore } from '@/contexts/authStore';
import { Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 60;

export function FloatingCart() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { getItemCount, setIsHoveringSearch } = useCartStore();
  const { token } = useAuthStore();
  const segments = useSegments();
  const pathname = usePathname();
  const itemCount = getItemCount();

  // Check if we are in the main app area
  // (tabs) group or specific menu/checkout screens
  const isTabArea = (segments as string[]).includes('(tabs)');
  const isMenuArea = pathname.includes('restaurant-menu') || pathname.includes('149-store');
  const isFoodOrderArea = pathname.includes('cart') || pathname.includes('checkout') || pathname.includes('payment');
  const shouldShow = !!token && (isTabArea || isMenuArea) && !isFoodOrderArea && itemCount > 0;

  // Dynamic Calculation for Search Bar Height & Position
  // On iOS, search bar has paddingVertical: 15. On Android: 8.
  // Search bar bottom is consistently: insets.bottom + 75
  const SEARCH_BAR_PADDING = Platform.OS === 'ios' ? 15 : 8;
  const SEARCH_BAR_TEXT = Platform.OS === 'ios' ? 24 : 20; 
  const SEARCH_BAR_HEIGHT = (SEARCH_BAR_PADDING * 2) + SEARCH_BAR_TEXT + 4; 
  const SEARCH_BAR_BOTTOM_OFFSET = insets.bottom + 75;
  
  // Custom gap for Android (0) vs iOS (4)
  const GAP = Platform.OS === 'android' ? 0 : 4;
  const restingY = SCREEN_HEIGHT - (SEARCH_BAR_BOTTOM_OFFSET + SEARCH_BAR_HEIGHT) - BUTTON_SIZE - GAP;
  const initialX = (SCREEN_WIDTH - BUTTON_SIZE) / 2;

  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(restingY);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const context = useSharedValue({ x: initialX, y: restingY });
  const isHoveringSearchShared = useSharedValue(false);
  const isHoveringAltDropzone = useSharedValue(false);
  const isDragging = useSharedValue(false);
  const dropzoneOpacity = useSharedValue(0);

  const ALT_DROPZONE_X = SCREEN_WIDTH / 2;
  const ALT_DROPZONE_Y = SCREEN_HEIGHT - insets.bottom - 150;

  const navigateToCart = () => {
    router.push('/cart');
    // Reset scale and position for when the user navigates back
    setTimeout(() => {
      scale.value = 1;
      translateX.value = initialX;
      translateY.value = restingY;
    }, 400);
  };

  useEffect(() => {
    if (shouldShow) {
      opacity.value = withTiming(1, { duration: 600 });
      scale.value = withSpring(1);
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withSpring(0);
    }
    
    // Animate to the dynamically calculated resting position
    translateY.value = withSpring(restingY);
    translateX.value = withSpring(initialX);
  }, [insets.bottom, insets.top, shouldShow, restingY]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
      isDragging.value = true;
      dropzoneOpacity.value = withTiming(1, { duration: 300 });
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
      translateY.value = context.value.y + event.translationY;

      const currentX = translateX.value + BUTTON_SIZE / 2;
      const currentY = translateY.value + BUTTON_SIZE / 2;

      const dx = currentX - ALT_DROPZONE_X;
      const dy = currentY - ALT_DROPZONE_Y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const hovering = dist < 70;
      if (hovering !== isHoveringAltDropzone.value) {
        isHoveringAltDropzone.value = hovering;
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      dropzoneOpacity.value = withTiming(0, { duration: 300 });

      if (isHoveringAltDropzone.value) {
        isHoveringAltDropzone.value = false;

        // Swallow animation for alt dropzone
        const targetX = ALT_DROPZONE_X - (BUTTON_SIZE / 2);
        const targetY = ALT_DROPZONE_Y - (BUTTON_SIZE / 2);

        translateX.value = withTiming(targetX, { duration: 200 });
        translateY.value = withTiming(targetY, { duration: 200 });
        scale.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(navigateToCart)();
          }
        });
      } else {
        // Keep within bounds
        if (translateX.value < 10) translateX.value = withSpring(10);
        if (translateX.value > SCREEN_WIDTH - BUTTON_SIZE - 10) {
          translateX.value = withSpring(SCREEN_WIDTH - BUTTON_SIZE - 10);
        }
        if (translateY.value < insets.top + 10) translateY.value = withSpring(insets.top + 10);
        if (translateY.value > SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - 10) {
          translateY.value = withSpring(SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - 10);
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      display: opacity.value === 0 ? 'none' : 'flex',
    };
  });

  const dropzoneAnimatedStyle = useAnimatedStyle(() => {
    const scale = isHoveringAltDropzone.value ? withSpring(1.2) : withSpring(1);
    return {
      opacity: dropzoneOpacity.value,
      transform: [{ scale }],
      position: 'absolute',
      left: ALT_DROPZONE_X - 45,
      top: ALT_DROPZONE_Y - 45,
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderWidth: 2,
      borderColor: isHoveringAltDropzone.value ? colors.primary : '#d1d5db',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isHoveringAltDropzone.value ? 0.6 : 0.2,
      shadowRadius: isHoveringAltDropzone.value ? 15 : 5,
      elevation: 5,
      pointerEvents: 'none',
    };
  });

  const handlePress = () => {
    router.push('/cart');
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={dropzoneAnimatedStyle}>
        <Ionicons name="bag-check" size={32} color={colors.primary} />
        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>CHECKOUT</Text>
      </Animated.View>
      
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.button, { backgroundColor: colors.primary }, animatedStyle]}>
          <TouchableOpacity
            style={styles.touchable}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={30} color="white" />
            {itemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    pointerEvents: 'box-none',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute',
  },
  touchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
