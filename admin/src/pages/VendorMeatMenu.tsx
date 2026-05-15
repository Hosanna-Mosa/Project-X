import { VendorLayout } from "@/components/layout/VendorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Drumstick, AlertCircle } from "lucide-react";

interface MeatItem {
  _id: string;
  name: string;
  weight: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

export default function VendorMeatMenu() {
  const queryClient = useQueryClient();
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");

  const { data: menu, isLoading } = useQuery({
    queryKey: ["meat-menu", vendorData._id],
    queryFn: () => adminFetch<MeatItem[]>(`/meat/menu/${vendorData._id}`),
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

  return (
    <VendorLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meat Inventory</h1>
          <p className="text-muted-foreground">Manage your stock. Prices are set globally by the Admin.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <p>Loading your items...</p>
          ) : (
            menu?.map((item) => (
              <div key={item._id} className="bg-card border border-border p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${item.isAvailable ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Drumstick className={`h-7 w-7 ${item.isAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">Weight: {item.weight}</p>
                    <p className="text-primary font-bold mt-1">₹{item.price}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    item.isAvailable ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>
                    {item.isAvailable ? "In Stock" : "Out of Stock"}
                  </span>
                  <Switch 
                    checked={item.isAvailable} 
                    onCheckedChange={(val) => toggleMutation.mutate({ itemId: item._id, isAvailable: val })}
                    disabled={toggleMutation.isPending}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-muted/30 p-6 rounded-2xl flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <strong>Note for Vendor:</strong> You cannot change the item names or prices. 
            If the market price changes, the Admin will update it automatically for you. 
            Your only responsibility is to toggle the <strong>In Stock</strong> switch if an item is sold out.
          </p>
        </div>
      </div>
    </VendorLayout>
  );
}
