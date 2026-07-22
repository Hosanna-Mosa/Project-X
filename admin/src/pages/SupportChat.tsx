import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Phone,
  MoreVertical,
  Paperclip,
  Image,
  Smile,
  Send,
  Package,
  CreditCard,
  Box,
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  messages: Array<{ sender: "user" | "admin" | "system"; time: string; text: string }>;
}

export default function SupportChat() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [typedMessage, setTypedMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all support tickets
  const { data: ticketsList = [], isLoading } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => adminFetch<Ticket[]>("/admin/tickets"),
  });

  // Filter for ACTIVE (OPEN or PENDING_RESOLVE) tickets to display in the sidebar
  const activeTickets = ticketsList.filter(
    (t) => t.status === "OPEN" || t.status === "PENDING_RESOLVE"
  );

  // Determine the selected ticket. If deep-linked, look for matches in ticketsList.
  // Otherwise, default to first active ticket in the list.
  const selectedTicket = id 
    ? ticketsList.find((t) => t._id === id)
    : activeTickets[0];

  // Auto-redirect if no ID is specified in the route but we have active tickets
  useEffect(() => {
    if (!id && activeTickets.length > 0) {
      navigate(`/support/chats/${activeTickets[0]._id}`, { replace: true });
    }
  }, [id, activeTickets, navigate]);

  // Connect to Socket.io and listen for real-time support updates
  useEffect(() => {
    socketService.connect();

    const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");
    if (adminData._id) {
      socketService.join(adminData._id, "ADMIN");
    }

    const handleTicketUpdate = (data: any) => {
      console.log("[SOCKET] Ticket update received in Chat Hub:", data);
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    };

    socketService.on("ticket_updated", handleTicketUpdate);

    return () => {
      socketService.off("ticket_updated", handleTicketUpdate);
    };
  }, [queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket?.messages]);

  // Mutation to update ticket (send reply or update status)
  const updateTicketMutation = useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: any }) =>
      adminFetch<Ticket>(`/admin/tickets/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      // If the ticket was resolved, it might be filtered out from active. Notify and potentially navigate away.
      if (data.status === "RESOLVED") {
        toast.success(`Ticket ${data.ticketId} marked as Resolved!`);
      } else if (data.status === "PENDING_RESOLVE") {
        toast.success(`Resolution request sent for ticket ${data.ticketId}`);
      } else {
        toast.success("Ticket updated successfully!");
      }
    },
  });

  const handleSendMessage = () => {
    if (!typedMessage.trim() || !selectedTicket) return;
    updateTicketMutation.mutate({
      ticketId: selectedTicket._id,
      payload: {
        replyText: typedMessage,
        sender: "admin",
      },
    });
    setTypedMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout searchPlaceholder="Search active chats...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/support-cases")}
            className="p-2 hover:bg-muted rounded-xl transition-colors border border-border bg-card shadow-sm"
            title="Back to Support Cases"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="page-header">Active Chats</h1>
            <p className="page-subtitle">Real-time chat portal for ongoing user issues and resolution.</p>
          </div>
        </div>

        {/* Dual Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[720px]">
          {/* Left - Active Chats List */}
          <div className="section-card flex flex-col h-full lg:col-span-1">
            <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-primary" /> Active Chats ({activeTickets.length})
              </h3>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-2">
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground font-medium flex flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading chats...
                </div>
              ) : activeTickets.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">No active chats</p>
                  <p className="text-[11px] mt-0.5">All tickets are resolved or pending resolve.</p>
                </div>
              ) : (
                activeTickets.map((ticket) => {
                  const isCurrent = ticket._id === selectedTicket?._id;
                  const lastMessage = ticket.messages[ticket.messages.length - 1];

                  return (
                    <div
                      key={ticket._id}
                      onClick={() => navigate(`/support/chats/${ticket._id}`)}
                      className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-primary font-mono shrink-0">
                            {ticket.ticketId}
                          </span>
                          <h4 className="text-xs font-bold text-foreground truncate min-w-0">
                            {ticket.title}
                          </h4>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase shrink-0 ${
                          ticket.status === "PENDING_RESOLVE"
                            ? "bg-amber-100 text-amber-700 animate-pulse"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {ticket.status === "PENDING_RESOLVE" ? "PENDING" : "OPEN"}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
                        {lastMessage ? lastMessage.text : ticket.message}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground truncate font-medium">
                          {ticket.user} ({ticket.userRole || "USER"})
                        </span>
                        <span className="text-[9px] text-muted-foreground shrink-0 font-medium">
                          {ticket.time || "Recently"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right - Chat Window */}
          <div className="section-card flex flex-col h-full lg:col-span-2">
            {selectedTicket ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                        {selectedTicket.user ? selectedTicket.user.split(" ").map((n) => n[0]).join("") : "U"}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{selectedTicket.user}</p>
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
                      <p className="text-xs text-muted-foreground">
                        {selectedTicket.ticketId} • <span className="font-bold text-primary">{selectedTicket.category}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown / Phone call */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toast.success(`Calling ${selectedTicket.user}... Connection established.`)}
                      className="p-2 hover:bg-muted rounded-xl transition-colors border border-border bg-card shadow-sm"
                      title="Call User"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-xl transition-colors border border-border bg-card shadow-sm">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem
                          onClick={() => {
                            updateTicketMutation.mutate({
                              ticketId: selectedTicket._id,
                              payload: { status: "RESOLVED" },
                            });
                          }}
                          className="cursor-pointer font-medium"
                        >
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Resolve Case
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            updateTicketMutation.mutate({
                              ticketId: selectedTicket._id,
                              payload: { status: "OPEN" },
                            });
                          }}
                          className="cursor-pointer font-medium"
                        >
                          <Clock className="mr-2 h-4 w-4 text-red-500" />
                          Re-open Case
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-auto p-4 space-y-4 bg-muted/5">
                  {selectedTicket.messages && selectedTicket.messages.map((msg, index) => {
                    if (msg.sender === "system") {
                      return (
                        <div key={index} className="flex justify-center my-2">
                          <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider border border-border/55">
                            {msg.time} {msg.text ? `• ${msg.text}` : ""}
                          </span>
                        </div>
                      );
                    }

                    const isAdmin = msg.sender === "admin";
                    return (
                      <div key={index} className={`max-w-[80%] ${isAdmin ? "ml-auto" : ""}`}>
                        <div
                          className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                            isAdmin
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-card text-foreground rounded-bl-sm border border-border"
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>
                        <p className={`text-[10px] text-muted-foreground mt-1 px-1 ${isAdmin ? "text-right" : ""}`}>
                          {msg.time} {isAdmin && "✓✓"}
                        </p>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-border shrink-0 bg-muted/10">
                  <div className="bg-card rounded-xl p-3 border border-border shadow-sm flex flex-col">
                    <textarea
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={`Type your response to ${selectedTicket.user}...`}
                      className="w-full bg-transparent text-sm placeholder:text-muted-foreground resize-none focus:outline-none min-h-[60px]"
                    />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toast.info("Attachments dialog clicked.")}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
                          title="Attach files"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => toast.info("Images attachment selected.")}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
                          title="Attach images"
                        >
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => toast.info("Emoji drawer clicked.")}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
                          title="Add emojis"
                        >
                          <Smile className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!typedMessage.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
                      >
                        Send Message <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40 animate-pulse" />
                <div className="text-center">
                  <p className="font-semibold text-foreground">No active conversation</p>
                  <p className="text-xs">Select a chat from the sidebar, or go back to the issues list.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
