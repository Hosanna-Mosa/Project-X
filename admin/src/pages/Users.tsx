import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { Users as UsersIcon, UserCheck, UserX, Shield, SlidersHorizontal, UserPlus, Eye, Ban, ChevronLeft, ChevronRight, Mail, Trash2, Phone, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Users() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "USER"
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminFetch<any[]>("/admin/users"),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => adminFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User created successfully");
      setIsAddOpen(false);
      setNewUser({ name: "", email: "", phone: "", password: "", role: "USER" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create user");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminFetch(`/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete user");
    }
  });

  const toggleBanMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) => adminFetch(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isBlocked })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User block status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to change user status");
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.phone) {
      toast.error("Name and phone are required");
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleDeleteClick = (user: any) => {
    if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
      deleteUserMutation.mutate(user._id);
    }
  };

  const handleBanClick = (user: any) => {
    toggleBanMutation.mutate({ id: user._id, isBlocked: !user.isBlocked });
  };

  const handleViewClick = (user: any) => {
    setViewingUser(user);
    setIsViewOpen(true);
  };

  const activeUsersCount = users.filter((u: any) => u.role === "USER").length;
  const driverCount = users.filter((u: any) => u.role === "DRIVER").length;
  const adminCount = users.filter((u: any) => u.role === "ADMIN").length;

  const searchedUsers = users.filter((u: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = u.name?.toLowerCase() || "";
    const email = u.email?.toLowerCase() || "";
    const phone = u.phone?.toLowerCase() || "";
    return name.includes(query) || email.includes(query) || phone.includes(query);
  });

  const filteredUsers = searchedUsers.filter((u: any) => {
    if (roleFilter === "ALL") return true;
    if (roleFilter === "USER") return u.role === "USER";
    if (roleFilter === "DRIVER") return u.role === "DRIVER";
    if (roleFilter === "ADMIN") return u.role === "ADMIN";
    if (roleFilter === "BLOCKED") return u.isBlocked === true;
    return true;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

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
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
                    <SlidersHorizontal className="h-4 w-4" /> Filter: {roleFilter}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setRoleFilter("ALL"); setCurrentPage(1); }} className="cursor-pointer">All Users</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRoleFilter("USER"); setCurrentPage(1); }} className="cursor-pointer">Customers (USER)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRoleFilter("DRIVER"); setCurrentPage(1); }} className="cursor-pointer">Drivers</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRoleFilter("ADMIN"); setCurrentPage(1); }} className="cursor-pointer">Admins</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRoleFilter("BLOCKED"); setCurrentPage(1); }} className="cursor-pointer">Blocked Only</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button 
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
              >
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    No users found matching the filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u: any) => (
                  <tr key={u._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                          {u.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <Link to={`/users/${u._id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors hover:underline">
                            {u.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{u.email || u.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${u.isBlocked ? "bg-destructive" : "bg-success"}`} />
                        <span className="text-sm text-foreground">{u.isBlocked ? "Blocked" : "Active"}</span>
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
                      <div className="flex items-center gap-1.5">
                        <Link to={`/users/${u._id}`} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="View details">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button onClick={() => toast.success(`Initiating call with user ${u.name} at ${u.phone}...`)} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Call User">
                          <Phone className="h-4 w-4" />
                        </button>
                        <button onClick={() => toast.info(`Drafting email to ${u.email || u.phone}...`)} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Message User">
                          <Mail className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleBanClick(u)} 
                          className={`p-1.5 rounded-full transition-colors ${u.isBlocked ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary/10 text-primary hover:bg-primary/20"}`} 
                          title={u.isBlocked ? "Unblock User" : "Block User"}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(u)} className="p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Delete User">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing {paginatedUsers.length} of {filteredUsers.length} users</p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => (
                <button 
                  key={idx + 1} 
                  onClick={() => setCurrentPage(idx + 1)} 
                  className={`h-8 w-8 rounded text-sm font-medium transition-all ${
                    currentPage === idx + 1 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input 
                value={newUser.name} 
                onChange={e => setNewUser({...newUser, name: e.target.value})} 
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email"
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})} 
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input 
                value={newUser.phone} 
                onChange={e => setNewUser({...newUser, phone: e.target.value})} 
                placeholder="e.g. 9876543210"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input 
                type="password"
                value={newUser.password} 
                onChange={e => setNewUser({...newUser, password: e.target.value})} 
                placeholder="Set initial password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">System Role</label>
              <select 
                value={newUser.role} 
                onChange={e => setNewUser({...newUser, role: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="USER">Customer (USER)</option>
                <option value="DRIVER">Driver (DRIVER)</option>
                <option value="ADMIN">System Administrator (ADMIN)</option>
              </select>
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : "Confirm & Save User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">User Information</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 py-4 text-sm">
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Full Name:</span>
                <span className="font-medium text-foreground">{viewingUser.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">System Role:</span>
                <span className="font-medium text-foreground uppercase">{viewingUser.role}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Phone:</span>
                <span className="font-medium text-foreground">{viewingUser.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Email:</span>
                <span className="font-medium text-foreground">{viewingUser.email || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Addresses Count:</span>
                <span className="font-medium text-foreground">{viewingUser.addresses?.length || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Account Created:</span>
                <span className="font-medium text-foreground">{new Date(viewingUser.createdAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
