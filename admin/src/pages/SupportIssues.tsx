import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Phone,
  MessageSquare,
  Eye,
  Plus,
  CreditCard,
  Box,
  Package,
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { socketService } from "@/lib/socketService";

interface Ticket {
  _id: string;
  ticketId: string;
  title: string;
  category: string;
  status: "OPEN" | "RESOLVED" | "PENDING_RESOLVE";
  message: string;
  user: string;
  userRole?: string;
  time: string;
  createdAt: string;
  messages: Array<{ sender: "user" | "admin" | "system"; time: string; text: string }>;
}

export default function SupportIssues() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "RESOLVED">("ACTIVE");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    category: "OPERATIONAL ISSUE",
    message: "",
    user: "Platform User"
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { data: ticketsList = [], isLoading } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => adminFetch<Ticket[]>("/admin/tickets"),
  });

  const createTicketMutation = useMutation({
    mutationFn: (payload: any) =>
      adminFetch<Ticket>("/admin/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      setIsCreateOpen(false);
      setNewTicket({ title: "", category: "OPERATIONAL ISSUE", message: "", user: "Platform User" });
      toast.success(`Ticket ${data.ticketId} created successfully!`);
      // Navigate to chat for the newly created ticket
      navigate(`/support/chats/${data._id}`);
    },
  });

  // Listen for socket updates in real-time
  useEffect(() => {
    socketService.connect();
    
    const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");
    if (adminData._id) {
      socketService.join(adminData._id, "ADMIN");
    }

    const handleTicketUpdate = (data: any) => {
      console.log("[SOCKET] Ticket update received in Issues Selection:", data);
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    };

    socketService.on("ticket_updated", handleTicketUpdate);

    return () => {
      socketService.off("ticket_updated", handleTicketUpdate);
    };
  }, [queryClient]);

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.message) {
      toast.error("Please enter a title and message.");
      return;
    }
    createTicketMutation.mutate(newTicket);
  };

  const filteredTickets = ticketsList.filter((ticket) => {
    // 1. Filter by Active vs Resolved Tab
    const matchesTab =
      activeTab === "ACTIVE"
        ? ticket.status === "OPEN" || ticket.status === "PENDING_RESOLVE"
        : ticket.status === "RESOLVED";

    // 2. Filter by Category
    const matchesCategory =
      categoryFilter === "ALL" || ticket.category === categoryFilter;

    // 3. Filter by Search (Title, ID, or Username)
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesCategory && matchesSearch;
  });

  return (
    <DashboardLayout searchPlaceholder="Search tickets...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Support Cases</h1>
            <p className="page-subtitle">Track, filter, and resolve user issues and logistics complaints.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => toast.success("System audit support logs exported as CSV!")}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors shadow-sm"
            >
              Export Logs
            </button>
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create Ticket
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-3 gap-6">
          <div className="section-card p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Active Tickets</p>
              <h3 className="text-2xl font-bold text-foreground">
                {ticketsList.filter(t => t.status === "OPEN" || t.status === "PENDING_RESOLVE").length}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <div className="section-card p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Resolution</p>
              <h3 className="text-2xl font-bold text-warning">
                {ticketsList.filter(t => t.status === "PENDING_RESOLVE").length}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning" />
            </div>
          </div>
          <div className="section-card p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolved Tickets</p>
              <h3 className="text-2xl font-bold text-[#00665c]">
                {ticketsList.filter(t => t.status === "RESOLVED").length}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#e6f4f2] flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-[#00665c]" />
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="section-card flex flex-col min-h-[500px]">
          {/* Controls Bar */}
          <div className="p-4 border-b border-border flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20">
            {/* Tabs */}
            <div className="flex bg-muted p-1 rounded-xl w-full md:w-auto">
              <button 
                onClick={() => setActiveTab("ACTIVE")}
                className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "ACTIVE" 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active Complaints ({ticketsList.filter(t => t.status === "OPEN" || t.status === "PENDING_RESOLVE").length})
              </button>
              <button 
                onClick={() => setActiveTab("RESOLVED")}
                className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "RESOLVED" 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Resolved ({ticketsList.filter(t => t.status === "RESOLVED").length})
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, ID, or user..."
                  className="w-full pl-9 pr-4 py-2 border border-border bg-card rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-1.5 border border-border bg-card rounded-xl px-3 py-2 shrink-0">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-foreground focus:outline-none border-none p-0 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="OPERATIONAL ISSUE">Operational Issue</option>
                  <option value="DELAYED DELIVERY">Delayed Delivery</option>
                  <option value="MULTI-STOP ADJUSTMENT">Multi-Stop Adjustment</option>
                  <option value="QUALITY CONTROL">Quality Control</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="py-20 text-center text-muted-foreground font-medium flex flex-col items-center justify-center gap-2">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading support cases...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 text-muted-foreground/60 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No cases found</p>
                <p className="text-xs mt-1">Try modifying your filters or search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTickets.map((ticket) => {
                  const isActive = ticket.status === "OPEN" || ticket.status === "PENDING_RESOLVE";
                  return (
                    <div
                      key={ticket._id}
                      className="rounded-2xl p-5 border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Ticket Meta Info */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary font-mono">{ticket.ticketId}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ticket.status === "OPEN"
                                ? "bg-red-100 text-red-700"
                                : ticket.status === "PENDING_RESOLVE"
                                ? "bg-amber-100 text-amber-700 animate-pulse"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {ticket.status === "PENDING_RESOLVE" ? "PENDING RESOLVE" : ticket.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">{ticket.time || "Recently"}</span>
                        </div>

                        {/* Title and Category */}
                        <h4 className="text-sm font-bold text-foreground mt-2 line-clamp-1">{ticket.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="p-1 rounded bg-muted">
                            {ticket.category.includes("BILLING") || ticket.category.includes("ADJUSTMENT") ? (
                              <CreditCard className="h-3 w-3 text-destructive" />
                            ) : ticket.category.includes("QUALITY") ? (
                              <Box className="h-3 w-3 text-warning" />
                            ) : (
                              <Package className="h-3 w-3 text-primary" />
                            )}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {ticket.category}
                          </span>
                        </div>

                        {/* Message Preview */}
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">
                          {ticket.message ? ticket.message.replace(/^"|"$/g, "") : "No description provided."}
                        </p>
                      </div>

                      {/* User & Action Panel */}
                      <div className="flex items-center justify-between border-t border-border mt-4 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                            {ticket.user ? ticket.user.split(" ").map(n => n[0]).join("") : "U"}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">{ticket.user}</span>
                            {ticket.userRole && (
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                                {ticket.userRole}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/support/chats/${ticket._id}`)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                            isActive
                              ? "bg-primary text-primary-foreground hover:opacity-90"
                              : "bg-muted text-foreground hover:bg-muted/70"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <MessageSquare className="h-3.5 w-3.5" /> Open Chat
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" /> View Chat
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Support Case</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTicketSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Issue Summary / Title</label>
              <Input 
                value={newTicket.title} 
                onChange={e => setNewTicket({...newTicket, title: e.target.value})} 
                placeholder="e.g. Order #QX-9903 Damage"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Affected User Name</label>
              <Input 
                value={newTicket.user} 
                onChange={e => setNewTicket({...newTicket, user: e.target.value})} 
                placeholder="e.g. Alex Rivera"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Support Category</label>
              <select 
                value={newTicket.category} 
                onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="OPERATIONAL ISSUE">OPERATIONAL ISSUE</option>
                <option value="DELAYED DELIVERY">DELAYED DELIVERY</option>
                <option value="MULTI-STOP ADJUSTMENT">MULTI-STOP ADJUSTMENT</option>
                <option value="QUALITY CONTROL">QUALITY CONTROL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Detailed Issue Message</label>
              <Textarea 
                value={newTicket.message}
                onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                placeholder="Describe the complaint or logistics issue in detail..."
                required
              />
            </div>
            <Button type="submit" className="w-full mt-4 bg-primary text-primary-foreground">
              Submit Ticket Case
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
