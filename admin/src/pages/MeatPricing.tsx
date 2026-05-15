import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Drumstick, Save, RefreshCw, IndianRupee } from "lucide-react";

interface GlobalPrice {
  name: string;
  weight: string;
  price: number;
  category: string;
}

export default function MeatPricing() {
  const queryClient = useQueryClient();
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});

  // Fetch current master prices
  const { data: prices, isLoading } = useQuery({
    queryKey: ["global-meat-prices"],
    queryFn: async () => {
      // If we don't have an endpoint to list global prices yet, we can fetch from a generic one
      // For now, let's assume we can get them from a mock or initial data
      const res = await adminFetch<GlobalPrice[]>("/meat/menu/global");
      return res;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedItems: { name: string; price: number }[]) =>
      adminFetch("/meat/global-prices", {
        method: "PUT",
        body: JSON.stringify({ items: updatedItems }),
      }),
    onSuccess: () => {
      toast.success("Global prices updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["global-meat-prices"] });
      setLocalPrices({});
    },
    onError: () => toast.error("Failed to update prices"),
  });

  const handlePriceChange = (name: string, value: string) => {
    setLocalPrices((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSave = () => {
    const itemsToUpdate = Object.entries(localPrices).map(([name, price]) => ({
      name,
      price,
    }));
    if (itemsToUpdate.length === 0) {
      toast.info("No changes to save");
      return;
    }
    updateMutation.mutate(itemsToUpdate);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Global Meat Pricing</h1>
            <p className="text-muted-foreground">Set daily prices for all meat centers across the platform.</p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
            {updateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Daily Prices
          </Button>
        </div>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/20">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Drumstick className="h-5 w-5 text-primary" />
              Standard Chicken Items
            </h2>
          </div>
          
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading global prices...</div>
            ) : (
              prices?.map((item) => (
                <div key={item.name} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Drumstick className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Weight: {item.weight}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative w-40">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-9 h-11 text-lg font-semibold"
                        defaultValue={item.price}
                        onChange={(e) => handlePriceChange(item.name, e.target.value)}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground uppercase font-medium">per unit</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl">
          <p className="text-sm text-blue-600 font-medium">
            💡 <strong>Note:</strong> Changes made here will instantly update the price for every Meat Center on the platform. 
            Individual vendors cannot override these prices, but they can mark items as out-of-stock.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
