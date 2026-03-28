import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { Colors } from "@/constants/colors";

interface SlideButtonProps {
  label: string;
  onSlideComplete: () => void;
  color?: string;
  icon?: keyof typeof Feather.glyphMap;
}

const BUTTON_WIDTH = Dimensions.get("window").width - 64;
const THUMB_SIZE = 60;
const SLIDE_THRESHOLD = BUTTON_WIDTH - THUMB_SIZE - 16;

export default function SlideButton({
  label,
  onSlideComplete,
  color = Colors.primary,
  icon = "chevron-right",
}: SlideButtonProps) {
  const [completed, setCompleted] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5,
      onPanResponderGrant: () => {
        Haptics.selectionAsync();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, SLIDE_THRESHOLD));
        translateX.setValue(newX);
        const progress = newX / SLIDE_THRESHOLD;
        opacity.setValue(1 - progress * 0.7);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SLIDE_THRESHOLD * 0.85) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: SLIDE_THRESHOLD,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setCompleted(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => {
              onSlideComplete();
              setCompleted(false);
              translateX.setValue(0);
              opacity.setValue(1);
            }, 300);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.container, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <Animated.Text style={[styles.label, { color, opacity }]}>
        {completed ? "Done!" : label}
      </Animated.Text>
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: color, transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Feather
          name={completed ? "check" : icon}
          size={24}
          color={Colors.white}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BUTTON_WIDTH,
    height: THUMB_SIZE + 16,
    borderRadius: (THUMB_SIZE + 16) / 2,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    alignSelf: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
    position: "absolute",
    zIndex: 0,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    left: 8,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
