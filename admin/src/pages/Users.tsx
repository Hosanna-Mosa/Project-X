import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { Users as UsersIcon, UserCheck, UserX, Shield, SlidersHorizontal, UserPlus, Eye, Ban, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";

export default function Users() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminFetch<any[]>("/admin/users"),
  });

  const activeUsersCount = users.filter((u: any) => u.role === "USER").length;
  const driverCount = users.filter((u: any) => u.role === "DRIVER").length;
  const adminCount = users.filter((u: any) => u.role === "ADMIN").length;
  return (
    <DashboardLayout searchPlaceholder="Search users by name, email, or ID...">
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={<UsersIcon className="h-5 w-5" />} label="Total Users" value={users.length.toString()} badge="+8% this month" badgeColor="success" />
          <StatCard icon={<UserCheck className="h-5 w-5" />} label="Customers" value={activeUsersCount.toString()} badge="Active" badgeColor="success" />
          <StatCard icon={<UserX className="h-5 w-5" />} label="Drivers" value={driverCount.toString()} badge="Verified" badgeColor="muted" />
          <StatCard icon={<Shield className="h-5 w-5" />} label="Admins" value={adminCount.toString()} badge="System" badgeColor="success" />
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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                          {u.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email || u.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${u.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full bg-success`} />
                        <span className="text-sm text-foreground">Active</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-foreground">{u.addresses?.length || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{new Date(u.updatedAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Mail className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing {users.length} users</p>
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
