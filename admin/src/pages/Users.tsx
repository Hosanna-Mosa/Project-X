import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { Users as UsersIcon, UserCheck, UserX, Shield, SlidersHorizontal, UserPlus, Eye, Ban, ChevronLeft, ChevronRight, Mail } from "lucide-react";

const users = [
  { name: "Emily Carter", email: "emily.carter@email.com", id: "UX-40021", role: "Customer", status: "Active", active: true, orders: 34, joined: "Jan 15, 2024", lastActive: "2 mins ago" },
  { name: "James O'Brien", email: "james.obrien@email.com", id: "UX-40035", role: "Customer", status: "Active", active: true, orders: 12, joined: "Feb 02, 2024", lastActive: "1 hour ago" },
  { name: "Priya Sharma", email: "priya.sharma@email.com", id: "UX-40042", role: "Business", status: "Active", active: true, orders: 89, joined: "Nov 20, 2023", lastActive: "5 mins ago" },
  { name: "Tom Henderson", email: "t.henderson@email.com", id: "UX-40050", role: "Customer", status: "Suspended", active: false, orders: 3, joined: "Mar 18, 2024", lastActive: "5 days ago" },
  { name: "Lucia Fernandez", email: "lucia.f@email.com", id: "UX-40061", role: "Business", status: "Active", active: true, orders: 56, joined: "Dec 01, 2023", lastActive: "30 mins ago" },
  { name: "Alex Kim", email: "alex.kim@email.com", id: "UX-40078", role: "Customer", status: "Inactive", active: false, orders: 0, joined: "Apr 10, 2024", lastActive: "2 weeks ago" },
];

export default function Users() {
  return (
    <DashboardLayout searchPlaceholder="Search users by name, email, or ID...">
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={<UsersIcon className="h-5 w-5" />} label="Total Users" value="24,812" badge="+8% this month" badgeColor="success" />
          <StatCard icon={<UserCheck className="h-5 w-5" />} label="Active Users" value="21,490" badge="86.6% active" badgeColor="success" />
          <StatCard icon={<UserX className="h-5 w-5" />} label="Suspended" value="142" badge="-3 this week" badgeColor="muted" />
          <StatCard icon={<Shield className="h-5 w-5" />} label="Business Accounts" value="3,180" badge="+24 new" badgeColor="success" />
        </div>

        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">User Management</h3>
              <p className="text-sm text-muted-foreground mt-0.5">View and manage all registered platform users.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
                <UserPlus className="h-4 w-4" /> Add User
              </button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                <th className="table-header-text text-left px-6 py-3">User Details</th>
                <th className="table-header-text text-left px-6 py-3">Role</th>
                <th className="table-header-text text-left px-6 py-3">Status</th>
                <th className="table-header-text text-left px-6 py-3">Orders</th>
                <th className="table-header-text text-left px-6 py-3">Joined</th>
                <th className="table-header-text text-left px-6 py-3">Last Active</th>
                <th className="table-header-text text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                        {u.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${u.role === "Business" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${u.status === "Active" ? "bg-success" : u.status === "Suspended" ? "bg-destructive" : "bg-muted-foreground"}`} />
                      <span className="text-sm text-foreground">{u.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-foreground">{u.orders}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{u.joined}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{u.lastActive}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <Mail className="h-4 w-4" />
                      </button>
                      {u.status === "Suspended" ? (
                        <button className="px-3 py-1 border border-primary text-primary rounded-full text-xs font-medium hover:bg-primary/5">Activate</button>
                      ) : (
                        <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing 1 to 6 of 24,812 users</p>
            <div className="flex items-center gap-1">
              <button className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50"><ChevronLeft className="h-4 w-4" /></button>
              <button className="h-8 w-8 rounded bg-primary text-primary-foreground text-sm font-medium">1</button>
              <button className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50">2</button>
              <button className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50">3</button>
              <button className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
