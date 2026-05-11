import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom + 4 }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        if (options.href === null) return null;

        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const renderIcon = () => {
          const color = isFocused ? colors.primary : colors.textMuted;
          const size = 24;
          switch (route.name) {
            case "index":
              return <Ionicons name={isFocused ? "home" : "home-outline"} size={size} color={color} />;
            case "orders":
              return <Ionicons name={isFocused ? "cube" : "cube-outline"} size={size} color={color} />;
            case "profile":
              return <Ionicons name={isFocused ? "person" : "person-outline"} size={size} color={color} />;
            default:
              return null;
          }
        };

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
              {renderIcon()}
            </View>
            <Text style={[styles.tabLabel, isFocused && { color: colors.primary }]}>
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,

    paddingTop: 10,
    paddingHorizontal: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: colors.surface === "#FFFFFF" ? 0.05 : 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconContainer: {
    width: 60,
    height: 32,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    backgroundColor: colors.surface === "#FFFFFF" ? "#F1F5F9" : colors.surfaceSecondary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
