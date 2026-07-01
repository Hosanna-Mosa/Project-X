import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
// Clamping points
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 100; // Almost full page

interface Props {
  children: React.ReactNode;
  style?: any;
  defaultHeight?: number;
  disableExpand?: boolean;
}

export function BottomSheet({ children, style, defaultHeight = 220, disableExpand = false }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  const MIN_TRANSLATE_Y = -defaultHeight;

  const translateY = useSharedValue(MIN_TRANSLATE_Y);
  const context = useSharedValue({ y: 0 });

  // Spring animate transition to new defaultHeight dynamically when state changes
  React.useEffect(() => {
    translateY.value = withSpring(MIN_TRANSLATE_Y, { damping: 50 });
  }, [defaultHeight]);

  const gesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onStart(() => {
      if (disableExpand) return;
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      if (disableExpand) return;
      translateY.value = event.translationY + context.value.y;
      // Clamp values so it doesn't go off screen
      translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
      translateY.value = Math.min(translateY.value, MIN_TRANSLATE_Y);
    })
    .onEnd((event) => {
      if (disableExpand) return;
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
      <Animated.View style={[styles.container, style, animatedStyle, { paddingBottom: insets.bottom }]}>
        <View style={styles.line} />
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: colors.surface,
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
    backgroundColor: colors.border,
    alignSelf: "center",
    marginVertical: 15,
    borderRadius: 2,
  },
});

