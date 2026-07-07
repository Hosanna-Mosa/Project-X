import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tag, Plus, Trash2, Calendar, Ticket, Check, X, ShieldAlert } from "lucide-react";

interface Coupon {
  _id: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  expiryDate?: string;
  isActive: boolean;
  usageCount: number;
}

export default function Coupons() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: 0,
    maxDiscount: 0,
    minOrderValue: 0,
    expiryDate: ""
  });

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => adminFetch<Coupon[]>("/admin/coupons"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      adminFetch("/admin/coupons", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Coupon created successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setIsAddOpen(false);
      setNewCoupon({
        code: "",
        discountType: "PERCENTAGE",
        discountValue: 0,
        maxDiscount: 0,
        minOrderValue: 0,
        expiryDate: ""
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create coupon");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/admin/coupons/${id}/toggle`, {
        method: "PUT",
      }),
    onSuccess: () => {
      toast.success("Coupon status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/admin/coupons/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Coupon deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete coupon");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discountValue) {
      toast.error("Please enter code and discount value");
      return;
    }
    createMutation.mutate({
      ...newCoupon,
      code: newCoupon.code.toUpperCase(),
      maxDiscount: newCoupon.discountType === "PERCENTAGE" ? newCoupon.maxDiscount : undefined,
      expiryDate: newCoupon.expiryDate ? newCoupon.expiryDate : undefined
    });
  };

  const handleDelete = (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete coupon ${code}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Promo Campaigns & Coupons</h1>
            <p className="text-muted-foreground">Manage active discount programs, platform coupons, and marketing campaigns.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">New Coupon Details</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Promo Code</label>
                  <Input
                    className="uppercase font-bold tracking-wide h-10"
                    placeholder="e.g. WELCOME50"
                    value={newCoupon.code}
                    onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Type</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 h-10 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={newCoupon.discountType}
                      onChange={e => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                    >
                      <option value="PERCENTAGE">PERCENTAGE (%)</option>
                      <option value="FLAT">FLAT (INR)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Value</label>
                    <Input
                      type="number"
                      className="h-10"
                      value={newCoupon.discountValue}
                      onChange={e => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                {newCoupon.discountType === "PERCENTAGE" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Max Discount (₹)</label>
                    <Input
                      type="number"
                      className="h-10"
                      value={newCoupon.maxDiscount}
                      onChange={e => setNewCoupon({ ...newCoupon, maxDiscount: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Min Order Value (₹)</label>
                    <Input
                      type="number"
                      className="h-10"
                      value={newCoupon.minOrderValue}
                      onChange={e => setNewCoupon({ ...newCoupon, minOrderValue: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Expiry Date</label>
                    <Input
                      type="date"
                      className="h-10 text-xs"
                      value={newCoupon.expiryDate}
                      onChange={e => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full rounded-xl h-10 mt-4" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Launch Coupon"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Coupons List */}
        <div className="section-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="table-header-text text-left px-6 py-3">Code & Type</th>
                <th className="table-header-text text-left px-6 py-3">Discount Details</th>
                <th className="table-header-text text-left px-6 py-3">Min Order</th>
                <th className="table-header-text text-left px-6 py-3">Usage</th>
                <th className="table-header-text text-left px-6 py-3">Expires</th>
                <th className="table-header-text text-left px-6 py-3">Status</th>
                <th className="table-header-text text-left px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">Loading coupons...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">No promo coupons active. Create one to drive sales!</td></tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-t border-border hover:bg-muted/30 transition-colors text-sm">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Ticket className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground tracking-wide">{coupon.code}</p>
                          <p className="text-[10px] text-muted-foreground">{coupon.discountType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">
                        {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Off`}
                      </p>
                      {coupon.maxDiscount && (
                        <p className="text-[10px] text-muted-foreground">Max Discount: ₹{coupon.maxDiscount}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-foreground font-medium">₹{coupon.minOrderValue || 0}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-foreground font-semibold">{coupon.usageCount || 0}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5 py-6">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : "Never"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleMutation.mutate(coupon._id)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-all uppercase flex items-center gap-1 ${
                          coupon.isActive 
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {coupon.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {coupon.isActive ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(coupon._id, coupon.code)}
                        className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
