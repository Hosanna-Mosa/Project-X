import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DollarSign, Truck, CreditCard, SlidersHorizontal, Download, Eye, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const revenueBreakdown = [
  { label: "Direct Shipping", pct: 65, width: "65%" },
  { label: "Premium Express", pct: 25, width: "25%" },
  { label: "Last Mile Local", pct: 10, width: "10%" },
];

export default function Payments() {
  const navigate = useNavigate();
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => adminFetch<any[]>("/admin/payments"),
  });

  const handleViewTxn = (txn: any) => {
    setSelectedTxn(txn);
    setIsViewOpen(true);
  };

  // Derive dynamic stats from transactions
  const totalEarned = transactions.reduce((acc, t) => {
    const numericFee = parseFloat(t.fee.replace("₹", "")) || 0;
    return acc + numericFee;
  }, 0);

  const filteredTxns = transactions.filter((t: any) => {
    if (statusFilter === "ALL") return true;
    return t.status === statusFilter;
  });

  return (
    <DashboardLayout searchPlaceholder="Search transactions, IDs, or drivers...">
      <div className="space-y-6">
        <div>
          <h1 className="page-header">Payments & Revenue</h1>
          <p className="page-subtitle">Real-time financial reconciliation and delivery logistics performance.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Earnings" value={`₹${totalEarned.toLocaleString()}`} badge="MONTHLY" badgeColor="primary" subtitle="+12.4% from last month" />
          <StatCard icon={<Truck className="h-5 w-5" />} label="Delivery Charges" value={`₹${(totalEarned * 0.35).toFixed(2)}`} subtitle="Updated 5 mins ago" badgeColor="primary" />
          <StatCard icon={<CreditCard className="h-5 w-5" />} label="Driver Payouts" value={`₹${(totalEarned * 0.65).toFixed(2)}`} subtitle="98.2% Payout Success Rate" badgeColor="success" />
        </div>

        {/* Table */}
        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Delivery Fees</h3>
            <div className="flex gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                    <SlidersHorizontal className="h-4 w-4" /> Filter: {statusFilter}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("ALL")} className="cursor-pointer">All Transactions</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("SETTLED")} className="cursor-pointer">Settled</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("PENDING")} className="cursor-pointer">Pending</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button 
                onClick={() => toast.success("CSV Statement compiled and downloaded!")}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                <th className="table-header-text text-left px-6 py-3">Transaction ID</th>
                <th className="table-header-text text-left px-6 py-3">Date & Time</th>
                <th className="table-header-text text-left px-6 py-3">Route Details</th>
                <th className="table-header-text text-left px-6 py-3">Delivery Fee</th>
                <th className="table-header-text text-left px-6 py-3">Status</th>
                <th className="table-header-text text-left px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Loading payments...</td>
                </tr>
              ) : filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No transactions found matching the filter.</td>
                </tr>
              ) : (
                filteredTxns.map((t: any) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">{t.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground">{t.date}</p>
                      <p className="text-xs text-muted-foreground">{t.time}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{t.route}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{t.fee}</td>
                    <td className="px-6 py-4"><StatusBadge status={t.status} variant={t.statusVariant} /></td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewTxn(t)}
                        className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing {transactions.length} of 285 transactions</p>
            <div className="flex items-center gap-1">
              <button onClick={() => toast.info("No previous pages")} className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              <button className="h-8 w-8 rounded bg-primary text-primary-foreground text-sm font-medium">1</button>
              <button onClick={() => toast.info("Page 2 not simulated")} className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50 transition-colors">2</button>
              <button onClick={() => toast.info("Page 3 not simulated")} className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50 transition-colors">3</button>
              <button onClick={() => toast.info("No next pages")} className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50 transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue Breakdown */}
          <div className="section-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Revenue Breakdown</h3>
            <div className="space-y-5">
              {revenueBreakdown.map((r) => (
                <div key={r.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{r.label}</span>
                    <span className="text-sm font-semibold text-foreground">{r.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: r.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fluidity Insight */}
          <div className="section-card p-6 bg-muted/50 flex flex-col items-center justify-center text-center">
            <Sparkles className="h-8 w-8 text-primary mb-3" />
            <h3 className="text-xl font-bold text-foreground">Fluidity Insight</h3>
            <p className="text-sm text-muted-foreground mt-3 max-w-[320px] leading-relaxed">
              Implementing automated driver routing in Zone A could reduce payout delays by 14% and increase total revenue margin.
            </p>
            <button 
              onClick={() => navigate("/analytics")}
              className="mt-5 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
            >
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Transaction Invoice</DialogTitle>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-4 py-4 text-sm">
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Invoice Reference:</span>
                <span className="font-medium text-foreground">{selectedTxn.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Date:</span>
                <span className="font-medium text-foreground">{selectedTxn.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Time:</span>
                <span className="font-medium text-foreground">{selectedTxn.time}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Fulfillment Route:</span>
                <span className="font-medium text-foreground">{selectedTxn.route}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Payout Amount:</span>
                <span className="font-bold text-foreground">{selectedTxn.fee}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Invoice Status:</span>
                <span className="font-bold uppercase text-success">{selectedTxn.status}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
