import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { RestaurantListItem } from "@/components/RestaurantListItem";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors), [theme]);
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const data = await customFetch<any[]>("/api/v1/users/favorites");
      if (Array.isArray(data)) {
        setFavorites(data);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on mount/focus to stay in sync
  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  // Sync if user's favorites count changed elsewhere
  useEffect(() => {
    fetchFavorites();
  }, [user?.favorites?.length]);

  const handleRefresh = () => {
    fetchFavorites();
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {/* Content */}
      {loading && favorites.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RestaurantListItem
              _id={item._id}
              name={item.name}
              rating={item.rating || 4.2}
              reviews={item.reviews || "120"}
              time="20-30 min"
              distance="1.5 km"
              categories={item.categories?.join(", ") || "General"}
              location={item.address}
              image={item.image}
              isPureVeg={item.isPureVeg}
              isMeat={item.partnerType === "meat"}
              deliveryFee={item.deliveryFee}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.heartCircle}>
                <Ionicons name="heart" size={54} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Favorites Yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart icon on outlets to save them here for quick access.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.browseButtonText}>Explore Outlets</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight || "#F1F5F9",
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
    },
    listContent: {
      paddingTop: 16,
      paddingBottom: 40,
    },
    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    heartCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    browseButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    browseButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
  });
