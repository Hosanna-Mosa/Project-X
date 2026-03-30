import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Which edges to apply safe area insets to. Defaults to all edges. */
  edges?: Edge[];
  backgroundColor?: string;
}

/**
 * ScreenWrapper applies SafeAreaView from react-native-safe-area-context
 * to ensure content is properly inset on all devices (notch, dynamic island,
 * home indicator, etc.)
 *
 * Usage:
 *   <ScreenWrapper>...</ScreenWrapper>
 *
 * For map-based screens with a floating header, use edges={[]} or edges={['bottom']}
 * to skip auto-padding and handle insets manually for the overlay elements.
 */
export function ScreenWrapper({
  children,
  style,
  edges = ["top", "left", "right", "bottom"],
  backgroundColor = Colors.light.background,
}: ScreenWrapperProps) {
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
