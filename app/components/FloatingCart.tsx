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
  const isMenuArea = pathname.includes('restaurant-menu');
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
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
      translateY.value = context.value.y + event.translationY;

      // Check if on Home Screen
      const isHomeScreen = pathname === '/' || pathname === '/index' || ((segments as string[]).includes('(tabs)') && (segments as string[]).includes('index'));
      if (isHomeScreen) {
        const currentX = translateX.value + BUTTON_SIZE / 2;
        const currentY = translateY.value + BUTTON_SIZE / 2;
        const searchBarX = SCREEN_WIDTH / 2;
        const searchBarY = SCREEN_HEIGHT - insets.bottom - 46;

        const dx = currentX - searchBarX;
        const dy = currentY - searchBarY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const hovering = dist < 70;
        if (hovering !== isHoveringSearchShared.value) {
          isHoveringSearchShared.value = hovering;
          runOnJS(setIsHoveringSearch)(hovering);
        }
      }
    })
    .onEnd(() => {
      if (isHoveringSearchShared.value) {
        runOnJS(setIsHoveringSearch)(false);
        isHoveringSearchShared.value = false;

        // Swallow animation: center the button and scale it to 0
        const targetX = (SCREEN_WIDTH - BUTTON_SIZE) / 2;
        const targetY = SCREEN_HEIGHT - insets.bottom - 46 - (BUTTON_SIZE / 2);

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

  const handlePress = () => {
    router.push('/cart');
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
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
