import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
// Clamping points
const COLLAPSED_HEIGHT = 320;
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 100; // Almost full page
const MIN_TRANSLATE_Y = -COLLAPSED_HEIGHT; // Default view

interface Props {
  children: React.ReactNode;
  style?: any;
}

export function BottomSheet({ children, style }: Props) {
  const translateY = useSharedValue(MIN_TRANSLATE_Y);
  const context = useSharedValue({ y: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      // Clamp values so it doesn't go off screen
      translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
      translateY.value = Math.min(translateY.value, -100);
    })
    .onEnd((event) => {
      // Determine snap point based on velocity and position
      if (translateY.value < MIN_TRANSLATE_Y - 50 || event.velocityY < -500) {
        translateY.value = withSpring(MAX_TRANSLATE_Y, { damping: 50 });
      } else {
        translateY.value = withSpring(MIN_TRANSLATE_Y, { damping: 50 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, style, animatedStyle]}>
        <View style={styles.line} />
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: Colors.light.surface,
    position: "absolute",
    top: SCREEN_HEIGHT,
    borderRadius: 30,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 24,
    zIndex: 1000,
  },
  line: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginVertical: 15,
    borderRadius: 2,
  },
});


