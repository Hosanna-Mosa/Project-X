import React, { useState, useRef, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useDeliveryStore, DeliveryItem } from "@/contexts/deliveryStore";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Dynamic suggestions will be fetched from backend

export default function AddStopScreen() {
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [storeName, setStoreName] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [nearbySuggestions, setNearbySuggestions] = useState<any[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { addStop, currentCoords } = useDeliveryStore();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (currentCoords) {
      fetchNearbySuggestions(currentCoords.lat, currentCoords.lng);
    }
  }, [currentCoords]);

  const fetchNearbySuggestions = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/places/nearby?lat=${lat}&lng=${lng}&radius=3000`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setNearbySuggestions(data.slice(0, 8));
      }
    } catch (error) {
      console.error("Error fetching nearby suggestions:", error);
    }
  };

  const fetchAutocompleteSuggestions = useCallback((input: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!input.trim() || input.length < 2) {
      setAutocompleteSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const latParam = currentCoords ? `&lat=${currentCoords.lat}&lng=${currentCoords.lng}` : "";
        const response = await fetch(
          `${BACKEND_URL}/api/places/autocomplete?input=${encodeURIComponent(input)}${latParam}&radius=10000`
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setAutocompleteSuggestions(data.slice(0, 6));
          setShowDropdown(data.length > 0);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 350); // 350ms debounce
  }, [currentCoords]);

  const handleAddressInput = (text: string) => {
    setAddressInput(text);
    // Clear confirmed selection if user types again
    if (address && text !== address) {
      setAddress("");
      setCoords(undefined);
    }
    fetchAutocompleteSuggestions(text);
  };

  const handleSelectSuggestion = async (item: any) => {
    const displayAddress = item.address || item.description || item.name;
    setAddress(displayAddress);
    setAddressInput(displayAddress);
    
    if (item.lat && item.lng) {
      setCoords({ lat: item.lat, lng: item.lng });
    } else if (item.id) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/places/details/${item.id}`);
        const data = await response.json();
        if (data.lat && data.lng) {
          setCoords({ lat: data.lat, lng: data.lng });
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }

    if (!storeName && item.name) {
      setStoreName(item.name);
    }
    setAutocompleteSuggestions([]);
    setShowDropdown(false);
  };

  const handleAddStop = () => {
    if (!address.trim()) {
      Alert.alert("Required", "Please provide an address for the pickup.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Items Needed", "Please add at least one item to pickup at this location.");
      return;
    }
    addStop(address, storeName || undefined, items, coords?.lat, coords?.lng);
    router.back();
  };

  const addItemToLocal = () => {
    if (!newItemName.trim()) return;
    const item: DeliveryItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      quantity: 1, // Defaulting to 1 for now
    };
    setItems([...items, item]);
    setNewItemName("");
  };

  const removeItemFromLocal = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Pickup Location</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Store Name (optional)</Text>
          <View style={styles.inputRow}>
            <Feather name="shopping-bag" size={16} color={Colors.light.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Artisan Bakery & Co."
              placeholderTextColor={Colors.light.textMuted}
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { zIndex: 100 }]}>
          <Text style={styles.inputLabel}>Pickup Address</Text>
          <View style={styles.autocompleteWrapper}>
            <View style={[styles.placesInputContainer, showDropdown && styles.placesInputContainerActive]}>
              <Feather name="map-pin" size={16} color={address ? Colors.light.primary : Colors.light.textMuted} />
              <TextInput
                style={styles.placesInput}
                placeholder="Search nearby store or address"
                placeholderTextColor={Colors.light.textMuted}
                value={addressInput}
                onChangeText={handleAddressInput}
                onFocus={() => autocompleteSuggestions.length > 0 && setShowDropdown(true)}
                returnKeyType="search"
              />
              {isSearching && <ActivityIndicator size="small" color={Colors.light.primary} />}
              {address && !isSearching && (
                <Feather name="check-circle" size={16} color={Colors.light.primary} />
              )}
            </View>

            {showDropdown && autocompleteSuggestions.length > 0 && (
              <View style={styles.dropdownContainer}>
                {autocompleteSuggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={[styles.dropdownRow, idx < autocompleteSuggestions.length - 1 && styles.dropdownRowBorder]}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownIcon}>
                      <Feather name="map-pin" size={12} color={Colors.light.primary} />
                    </View>
                    <View style={styles.dropdownTextContainer}>
                      <Text style={styles.dropdownMainText} numberOfLines={1}>
                        {item.name || item.main_text}
                      </Text>
                      <Text style={styles.dropdownSecondaryText} numberOfLines={1}>
                        {item.address || item.secondary_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>What to pickup?</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Add Item</Text>
          <View style={[styles.inputRow, newItemName ? styles.inputRowActive : null]}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2x Milk, 1kg Flour..."
              placeholderTextColor={Colors.light.textMuted}
              value={newItemName}
              onChangeText={setNewItemName}
              onSubmitEditing={addItemToLocal}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addItemToLocal} disabled={!newItemName.trim()}>
              <Feather 
                name="plus-circle" 
                size={24} 
                color={newItemName.trim() ? Colors.light.primary : Colors.light.textMuted} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{item.name}</Text>
                <TouchableOpacity onPress={() => removeItemFromLocal(item.id)}>
                  <Feather name="x" size={14} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
        </View>

        <Text style={styles.quickLabel}>Nearby Suggestions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalQuick}>
          {nearbySuggestions.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickChip}
              onPress={() => handleSelectSuggestion(item)}
              activeOpacity={0.7}
            >
              <Feather name="map-pin" size={10} color={Colors.light.primary} style={{ marginRight: 4 }} />
              <Text style={styles.quickChipText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
          {nearbySuggestions.length === 0 && (
            <View style={styles.quickChip}>
              <ActivityIndicator size="small" color={Colors.light.textMuted} />
              <Text style={[styles.quickChipText, { marginLeft: 6, opacity: 0.6 }]}>
                Loading nearby spots...
              </Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.addBtn, (!address || items.length === 0) && styles.addBtnDisabled]}
          onPress={handleAddStop}
          disabled={!address || items.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>Add Stop to Route</Text>
          <Feather name="check-circle" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
  },
  content: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  inputRowActive: {
    borderColor: Colors.light.primary,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.light.text,
  },
  autocompleteWrapper: {
    position: 'relative',
    zIndex: 200,
  },
  placesInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    paddingHorizontal: 12,
    height: 40,
  },
  placesInputContainerActive: {
    borderColor: Colors.light.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  placesInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Colors.light.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dropdownIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTextContainer: {
    flex: 1,
  },
  dropdownMainText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  dropdownSecondaryText: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.light.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.light.primary}30`,
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: -4,
  },
  horizontalQuick: {
    gap: 10,
    paddingRight: 20,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  addBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  addBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
