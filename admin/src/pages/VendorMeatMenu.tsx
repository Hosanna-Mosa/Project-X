import { useState } from "react";
import { VendorLayout } from "@/components/layout/VendorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState(blankItem);

  const { data: menu, isLoading } = useQuery({
    queryKey: ["meat-menu", vendorData._id],
    queryFn: () => adminFetch<MeatItem[]>(`/meat/menu/${vendorData._id}?includeUnavailable=true`),
    enabled: !!vendorData._id,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      adminFetch(`/meat/items/${itemId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ isAvailable }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meat-menu"] });
      toast.success("Availability updated");
    },
    onError: () => toast.error("Failed to update availability"),
  });

  const addMeatMutation = useMutation({
    mutationFn: (data: typeof blankItem) =>
      adminFetch("/meat/items", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          meatCenterId: vendorData._id,
          price: Number(data.price),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meat-menu"] });
      toast.success("Meat item added successfully");
      setIsAddOpen(false);
      setNewItem(blankItem);
    },
    onError: (error: any) => toast.error(error.message || "Failed to add meat item"),
  });

  const deleteMeatMutation = useMutation({
    mutationFn: (itemId: string) => adminFetch(`/meat/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meat-menu"] });
      toast.success("Meat item removed");
    },
    onError: () => toast.error("Failed to remove meat item"),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItem.name.trim() || !newItem.weight.trim() || !newItem.price || !newItem.category.trim()) {
      toast.error("Please enter name, weight, price and category");
      return;
    }
    addMeatMutation.mutate(newItem);
  };

  return (
    <VendorLayout searchPlaceholder="Search meat inventory...">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meat Inventory</h1>
            <p className="text-muted-foreground">Add meat products and manage stock shown in the customer app.</p>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex h-11 items-center gap-2 rounded-xl px-6">
                <Plus className="h-4 w-4" />
                Add Meat Item
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">Add Meat Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input
                    value={newItem.name}
                    onChange={(event) => setNewItem({ ...newItem, name: event.target.value })}
                    placeholder="e.g. Chicken Curry Cut"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Weight</label>
                    <Input
                      value={newItem.weight}
                      onChange={(event) => setNewItem({ ...newItem, weight: event.target.value })}
                      placeholder="e.g. 500g"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price</label>
                    <Input
                      type="number"
                      value={newItem.price}
                      onChange={(event) => setNewItem({ ...newItem, price: event.target.value })}
                      placeholder="180"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={newItem.category}
                      onChange={(event) => setNewItem({ ...newItem, category: event.target.value })}
                      placeholder="Chicken"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Image URL</label>
                    <Input
                      value={newItem.image}
                      onChange={(event) => setNewItem({ ...newItem, image: event.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <Button type="submit" className="mt-4 h-11 w-full rounded-xl" disabled={addMeatMutation.isPending}>
                  {addMeatMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {isLoading ? (
            <p>Loading your items...</p>
          ) : menu?.length === 0 ? (
            <div className="col-span-full rounded-3xl border-2 border-dashed border-border bg-muted/20 py-20 text-center">
              <Drumstick className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-bold">Your meat inventory is empty</h3>
              <p className="mt-1 text-muted-foreground">Add products to show them in the app's Meat section.</p>
            </div>
          ) : (
            menu?.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between rounded-3xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.isAvailable ? "bg-primary/10" : "bg-muted"}`}>
                    <Drumstick className={`h-7 w-7 ${item.isAvailable ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">Weight: {item.weight}</p>
                    <p className="text-xs text-muted-foreground">Category: {item.category}</p>
                    <p className="mt-1 font-bold text-primary">Rs.{item.price}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    item.isAvailable ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>
                    {item.isAvailable ? "In Stock" : "Out of Stock"}
                  </span>
                  <Switch
                    checked={item.isAvailable}
                    onCheckedChange={(value) => toggleMutation.mutate({ itemId: item._id, isAvailable: value })}
                    disabled={toggleMutation.isPending}
                  />
                  {!item.isGlobalItem && (
                    <button
                      type="button"
                      onClick={() => deleteMeatMutation.mutate(item._id)}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-start gap-4 rounded-2xl bg-muted/30 p-6">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Items added here are saved as meat inventory and are fetched by the app's Meat section.
            Use the <strong>In Stock</strong> switch to hide sold-out products from customers.
          </p>
        </div>
      </div>
    </VendorLayout>
  );
}
