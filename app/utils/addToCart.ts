import { Alert } from "react-native";
import { useCartStore, type FoodItem } from "@/contexts/cartStore";

/**
 * The cart only ever holds items from one vendor at a time — adding an item
 * from a different vendor clears whatever was there (see cartStore.addItem).
 * That's intentional (checkout is single-vendor), but doing it silently reads
 * as "my cart isn't saving my items". This wraps addItem with a confirmation
 * whenever the switch would actually drop something, so the user opts into
 * the swap instead of losing items by surprise.
 */
export function addToCartWithConfirm(item: FoodItem, vendorId: string, vendorLabel?: string, onAdded?: () => void) {
  const { vendorId: currentVendorId, items, addItem } = useCartStore.getState();

  if (currentVendorId && currentVendorId !== vendorId && items.length > 0) {
    Alert.alert(
      "Start a new cart?",
      `Your cart has ${items.length} item${items.length === 1 ? "" : "s"} from another outlet. Adding this will clear ${items.length === 1 ? "it" : "them"} and start a new cart${vendorLabel ? ` from ${vendorLabel}` : ""}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear & add",
          style: "destructive",
          onPress: () => {
            addItem(item, vendorId);
            onAdded?.();
          },
        },
      ]
    );
    return;
  }

  addItem(item, vendorId);
  onAdded?.();
}
