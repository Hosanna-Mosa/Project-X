import { useState } from "react";
import { VendorLayout } from "@/components/layout/VendorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Drumstick, AlertCircle, Plus, Trash2, Check, X, IndianRupee, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MeatItem {
  _id: string;
  name: string;
  weight: string;
  price: number;
  category: string;
  image?: string;
  isAvailable: boolean;
  isGlobalItem?: boolean;
}

const blankItem = {
  name: "",
  weight: "",
  price: "",
  category: "Chicken",
  image: "",
};

export default function VendorMeatMenu() {
  const queryClient = useQueryClient();
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState(blankItem);

  // Fetch ALL items (available + unavailable)
  const { data: menu, isLoading } = useQuery({
    queryKey: ["meat-menu-vendor", vendorData._id],
    queryFn: () => adminFetch<MeatItem[]>(`/meat/vendor-menu/${vendorData._id}`),
    enabled: !!vendorData._id,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      adminFetch(`/meat/items/${itemId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ isAvailable }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meat-menu-vendor"] });
      toast.success("Availability updated");
    },
    onError: () => toast.error("Failed to update availability"),
  });

  const priceMutation = useMutation({
    mutationFn: ({ itemId, price }: { itemId: string; price: number }) =>
      adminFetch(`/meat/items/${itemId}/price`, {
        method: "PUT",
        body: JSON.stringify({ price }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meat-menu-vendor"] });
      toast.success("Price updated successfully");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update price"),
  });

  const startEditing = (item: MeatItem) => {
    setEditingId(item._id);
    setEditPrice(item.price.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditPrice("");
  };

  const savePrice = (itemId: string) => {
    const parsed = parseFloat(editPrice);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    priceMutation.mutate({ itemId, price: parsed });
  };

  return (
    <VendorLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meat Inventory</h1>
          <p className="text-muted-foreground">Manage stock availability and update your daily prices.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-12">Loading your items...</p>
          ) : !menu || menu.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-12">No meat items found for your center.</p>
          ) : (
            menu.map((item) => (
              <div
                key={item._id}
                className={`bg-card border ${
                  item.isAvailable ? "border-border" : "border-dashed border-muted-foreground/30"
                } p-6 rounded-3xl shadow-sm transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                        item.isAvailable ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <Drumstick
                        className={`h-7 w-7 ${item.isAvailable ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.weight}</p>
                      <p className="text-[10px] uppercase text-muted-foreground/60 font-semibold mt-0.5">
                        {item.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        item.isAvailable
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {item.isAvailable ? "In Stock" : "Out of Stock"}
                    </span>
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={(val) =>
                        toggleMutation.mutate({ itemId: item._id, isAvailable: val })
                      }
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                </div>

                {/* Price Section */}
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Selling Price
                    </span>

                    {editingId === item._id ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="pl-9 h-9 w-28 text-sm font-semibold"
                            autoFocus
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-success hover:text-success hover:bg-success/10"
                          onClick={() => savePrice(item._id)}
                          disabled={priceMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-foreground">₹{item.price}</span>
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-muted/30 p-6 rounded-2xl flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Your daily controls:</strong> You can update the <strong>price</strong> and toggle
              <strong> availability</strong> for each item below.
            </p>
            <p>
              Item names, weights, and categories are managed by the Admin and cannot be changed.
              New items are added automatically by the Admin through global pricing updates.
            </p>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}
