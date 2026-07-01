import { create } from "zustand";

export interface FoodItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  images: string[];
}

export interface CartItem extends FoodItem {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  vendorId: string | null;
  isHoveringSearch: boolean;
  setIsHoveringSearch: (hovering: boolean) => void;
  addItem: (item: FoodItem, vendorId: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  vendorId: null,
  isHoveringSearch: false,
  setIsHoveringSearch: (hovering) => set({ isHoveringSearch: hovering }),

  addItem: (item, vendorId) => {
    const { items, vendorId: currentVendorId } = get();

    // If adding item from a different vendor, clear cart first
    if (currentVendorId && currentVendorId !== vendorId) {
      set({ items: [{ ...item, quantity: 1 }], vendorId });
      return;
    }

    const existingItem = items.find((i) => i._id === item._id);
    if (existingItem) {
      set({
        items: items.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        ),
        vendorId,
      });
    } else {
      set({ items: [...items, { ...item, quantity: 1 }], vendorId });
    }
  },

  removeItem: (itemId) => {
    set((state) => {
      const newItems = state.items.filter((i) => i._id !== itemId);
      return {
        items: newItems,
        vendorId: newItems.length === 0 ? null : state.vendorId,
      };
    });
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i._id === itemId ? { ...i, quantity } : i
      ),
    }));
  },

  clearCart: () => set({ items: [], vendorId: null }),

  getTotalPrice: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
