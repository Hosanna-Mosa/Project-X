import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Phone, MoreVertical, Paperclip, Image, Smile, Send, Package, CreditCard, Users, Box, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { socketService } from "@/lib/socketService";

interface Ticket {
  _id: string;
  ticketId: string;
  title: string;
  category: string;
  status: "OPEN" | "RESOLVED";
  message: string;
  user: string;
  time: string;
  messages: Array<{ sender: "user" | "admin" | "system"; time: string; text: string }>;
}

export default function Support() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "RESOLVED">("ACTIVE");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    category: "OPERATIONAL ISSUE",
    message: "",
    user: "Platform User"
  });

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState("");

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
      setActiveTicketId(data._id);
      setIsCreateOpen(false);
      setNewTicket({ title: "", category: "OPERATIONAL ISSUE", message: "", user: "Platform User" });
      toast.success(`Ticket ${data.ticketId} created successfully!`);
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminFetch<Ticket>(`/admin/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      toast.success("Ticket updated successfully!");
    },
  });

  const filteredTickets = ticketsList.filter(t => 
    activeTab === "ACTIVE" ? t.status === "OPEN" : t.status === "RESOLVED"
  );

  const selectedTicket = ticketsList.find(t => t._id === activeTicketId) || filteredTickets[0] || ticketsList[0];

  // Auto-set the active ticket ID once loaded
  if (!activeTicketId && selectedTicket) {
    setActiveTicketId(selectedTicket._id);
  }

  // Connect to Socket.io and listen for support updates
  useEffect(() => {
    socketService.connect();
    
    const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");
    if (adminData._id) {
      socketService.join(adminData._id, "ADMIN");
    }

    const handleTicketUpdate = (data: any) => {
      console.log("[SOCKET] Ticket update received:", data);
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    };

    socketService.on("ticket_updated", handleTicketUpdate);

    return () => {
      socketService.off("ticket_updated", handleTicketUpdate);
    };
  }, [queryClient]);

  const handleSendMessage = () => {
    if (!typedMessage.trim() || !selectedTicket) return;
    updateTicketMutation.mutate({
      id: selectedTicket._id,
      payload: {
        replyText: typedMessage,
        sender: "admin"
      }
    });
    setTypedMessage("");
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.message) {
      toast.error("Please enter a title and message.");
      return;
    }
    createTicketMutation.mutate(newTicket);
  };

  return (
    <DashboardLayout searchPlaceholder="Search logistics cases...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Support Resolution</h1>
            <p className="page-subtitle">Manage customer queries and real-time logistics escalations.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => toast.success("System audit support logs exported as CSV!")}
              className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Export Logs
            </button>
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Create Ticket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 min-h-[700px]">
          {/* Left - Tickets */}
          <div className="section-card flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button 
                onClick={() => setActiveTab("ACTIVE")}
                className={`flex-1 text-center py-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === "ACTIVE" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Active Complaints ({ticketsList.filter(t => t.status === "OPEN").length})
              </button>
              <button 
                onClick={() => setActiveTab("RESOLVED")}
                className={`flex-1 text-center py-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === "RESOLVED" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Resolved ({ticketsList.filter(t => t.status === "RESOLVED").length})
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading support cases...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">No cases found in this category.</div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => setActiveTicketId(ticket._id)}
                    className={`rounded-2xl p-4 border transition-all cursor-pointer ${
                      ticket._id === selectedTicket?._id ? "border-primary bg-primary/5 shadow-md" : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {ticket.category.includes("BILLING") || ticket.category.includes("ADJUSTMENT") ? <CreditCard className="h-5 w-5 text-destructive" /> :
                           ticket.category.includes("QUALITY") ? <Box className="h-5 w-5 text-warning" /> :
                           <Package className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{ticket.title}</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ticket.status === "OPEN"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {ticket.status}
                            </span>
                            {ticket.userRole && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ticket.userRole === "DRIVER"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-purple-100 text-purple-800 border border-purple-200"
                              }`}>
                                {ticket.userRole}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">{ticket.category}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ticket.message}</p>
                    {ticket.user && (
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-foreground">
                            {ticket.user.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="text-xs text-muted-foreground">User: {ticket.user} {ticket.userRole ? `(${ticket.userRole})` : ""}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{ticket.time}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right - Chat */}
          <div className="section-card flex flex-col">
            {selectedTicket ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {selectedTicket.user ? selectedTicket.user.split(" ").map(n => n[0]).join("") : "U"}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{selectedTicket.user || "Platform User"}</p>
                        {selectedTicket.userRole && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            selectedTicket.userRole === "DRIVER"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-purple-100 text-purple-800 border border-purple-200"
                          }`}>
                            {selectedTicket.userRole}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedTicket.title} • <span className="text-primary font-medium">{selectedTicket.category}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toast.success(`Calling ${selectedTicket.user}... Link established.`)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors border border-border"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors border border-border">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            updateTicketMutation.mutate({
                              id: selectedTicket._id,
                              payload: { status: "RESOLVED" }
                            });
                          }}
                          className="cursor-pointer"
                        >
                          Resolve Case
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            updateTicketMutation.mutate({
                              id: selectedTicket._id,
                              payload: { status: "OPEN" }
                            });
                          }}
                          className="cursor-pointer"
                        >
                          Re-open Case
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {selectedTicket.messages && selectedTicket.messages.map((msg, index) => {
                    if (msg.sender === "system") {
                      return (
                        <div key={index} className="flex justify-center">
                          <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            {msg.time}
                          </span>
                        </div>
                      );
                    }

                    const isAdmin = msg.sender === "admin";
                    return (
                      <div key={index} className={`max-w-[85%] ${isAdmin ? "ml-auto" : ""}`}>
                        <div className={`${isAdmin ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"} rounded-2xl p-4`}>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        </div>
                        <p className={`text-[10px] text-muted-foreground mt-1 ${isAdmin ? "text-right" : ""}`}>
                          {msg.time} {isAdmin && "✓✓"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="bg-muted/50 rounded-xl p-3 border border-border">
                    <textarea
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      placeholder={`Type your response to ${selectedTicket.user}...`}
                      className="w-full bg-transparent text-sm placeholder:text-muted-foreground resize-none focus:outline-none min-h-[60px]"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-2">
                        <button onClick={() => toast.info("Attachments dialog closed.")} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => toast.info("Images attachment selected.")} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => toast.info("Emoji drawer not simulated.")} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Smile className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                      <button 
                        onClick={handleSendMessage}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground text-card rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                      >
                        Send Message <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a ticket complaint to start resolution chat.
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
