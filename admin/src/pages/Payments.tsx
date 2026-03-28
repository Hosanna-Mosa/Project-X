import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DollarSign, Truck, CreditCard, SlidersHorizontal, Download, Eye, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const transactions = [
  { id: "#TXN-90214", date: "Oct 24, 2023", time: "02:45 PM", route: "Zone A → Downtown Hub", fee: "$24.50", status: "SETTLED", statusVariant: "settled" as const },
  { id: "#TXN-90215", date: "Oct 24, 2023", time: "03:12 PM", route: "North Wharf → Storage 04", fee: "$18.20", status: "SETTLED", statusVariant: "settled" as const },
  { id: "#TXN-90216", date: "Oct 24, 2023", time: "03:55 PM", route: "Central → Airport Cargo", fee: "$42.00", status: "PENDING", statusVariant: "pending" as const },
  { id: "#TXN-90217", date: "Oct 24, 2023", time: "04:10 PM", route: "Zone B → Residential P", fee: "$12.75", status: "SETTLED", statusVariant: "settled" as const },
];

const revenueBreakdown = [
  { label: "Direct Shipping", pct: 65, width: "65%" },
  { label: "Premium Express", pct: 25, width: "25%" },
  { label: "Last Mile Local", pct: 10, width: "10%" },
];

export default function Payments() {
  return (
    <DashboardLayout searchPlaceholder="Search transactions, IDs, or drivers...">
      <div className="space-y-6">
        <div>
          <h1 className="page-header">Payments & Revenue</h1>
          <p className="page-subtitle">Real-time financial reconciliation and delivery logistics performance.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Earnings" value="$142,580.00" badge="MONTHLY" badgeColor="primary" subtitle="+12.4% from last month" />
          <StatCard icon={<Truck className="h-5 w-5" />} label="Delivery Charges" value="$48,210.50" subtitle="Updated 5 mins ago" badgeColor="primary" />
          <StatCard icon={<CreditCard className="h-5 w-5" />} label="Driver Payouts" value="$94,369.50" subtitle="98.2% Payout Success Rate" badgeColor="success" />
        </div>

        {/* Table */}
        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Delivery Fees</h3>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
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
              {transactions.map((t) => (
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
                    <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing 4 of 285 transactions</p>
            <div className="flex items-center gap-1">
              <button className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50"><ChevronLeft className="h-4 w-4" /></button>
              <button className="h-8 w-8 rounded bg-primary text-primary-foreground text-sm font-medium">1</button>
              <button className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50">2</button>
              <button className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50">3</button>
              <button className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50"><ChevronRight className="h-4 w-4" /></button>
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
            <button className="mt-5 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
