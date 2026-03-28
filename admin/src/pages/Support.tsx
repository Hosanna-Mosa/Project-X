import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MessageSquare, Phone, MoreVertical, Paperclip, Image, Smile, Send, Package, CreditCard, Users, Box } from "lucide-react";

const tickets = [
  {
    id: "QX-9901",
    title: "Order #QX-9901",
    category: "DELAYED DELIVERY",
    status: "OPEN",
    message: '"The driver has been stationary at the harbor for over 3 hours. I need an update on the medical supply shipment..."',
    user: "Alex Rivera",
    time: "2 mins ago",
    icon: <Package className="h-5 w-5 text-primary" />,
    active: true,
  },
  {
    id: "billing",
    title: "Billing Discrepancy",
    category: "MULTI-STOP ADJUSTMENT",
    status: "OPEN",
    message: '"The automated billing for the third stop didn\'t include the waiting time surcharge as per our fleet contract."',
    user: "Sarah Jenkins",
    time: "15 mins ago",
    icon: <CreditCard className="h-5 w-5 text-destructive" />,
    active: false,
  },
  {
    id: "driver",
    title: "Driver Re-assignment",
    category: "OPERATIONAL ISSUE",
    status: "RESOLVED",
    message: '"Requesting driver swap for route 442 due to vehicle..."',
    user: "",
    time: "",
    icon: <Users className="h-5 w-5 text-muted-foreground" />,
    active: false,
  },
  {
    id: "damaged",
    title: "Damaged Goods Report",
    category: "QUALITY CONTROL",
    status: "OPEN",
    message: '"Pallet arriving at warehouse B-12 shows signs of water damage. See attached photos for claim."',
    user: "David Chen",
    time: "1 hour ago",
    icon: <Box className="h-5 w-5 text-primary" />,
    active: false,
  },
];

const chatMessages = [
  { sender: "system", time: "TICKET OPENED • 10:45 AM", text: "" },
  { sender: "user", time: "10:46 AM", text: "I've been monitoring the GPS for Order #QX-9901. The driver has been at the Terminal 4 gate for 3 hours without moving. This cargo contains temperature-sensitive medical supplies." },
  { sender: "admin", time: "10:48 AM", text: "Hello Alex, I'm checking the gate manifest now. It looks like there's a localized strike at Terminal 4 affecting heavy haulage. Let me contact the fleet lead directly." },
];

export default function Support() {
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
            <button className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
              Export Logs
            </button>
            <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
              Create Ticket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 min-h-[700px]">
          {/* Left - Tickets */}
          <div className="section-card flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button className="px-6 py-3 text-sm font-medium text-primary border-b-2 border-primary">
                Active Complaints (24)
              </button>
              <button className="px-6 py-3 text-sm font-medium text-muted-foreground">
                Recently Resolved (142)
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`rounded-xl p-4 border transition-colors cursor-pointer ${
                    ticket.active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {ticket.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{ticket.title}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ticket.status === "OPEN"
                              ? "bg-[hsl(var(--badge-open))] text-[hsl(var(--badge-open-text))]"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {ticket.status === "OPEN" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1" />}
                            {ticket.status}
                          </span>
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
                        <span className="text-xs text-muted-foreground">User: {ticket.user}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{ticket.time}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right - Chat */}
          <div className="section-card flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">AR</div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Alex Rivera</p>
                  <p className="text-xs text-muted-foreground">Order #QX-9901 • <span className="text-primary">Priority Support</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* System message */}
              <div className="flex justify-center">
                <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Ticket Opened • 10:45 AM
                </span>
              </div>

              {/* User message */}
              <div className="max-w-[85%]">
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    I've been monitoring the GPS for Order #QX-9901. The driver has been at the Terminal 4 gate for 3 hours without moving. This cargo contains temperature-sensitive medical supplies.
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">10:46 AM</p>
              </div>

              {/* Admin message */}
              <div className="max-w-[85%] ml-auto">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-4">
                  <p className="text-sm leading-relaxed">
                    Hello Alex, I'm checking the gate manifest now. It looks like there's a localized strike at Terminal 4 affecting heavy haulage. Let me contact the fleet lead directly.
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">10:48 AM ✓✓</p>
              </div>

              {/* Image attachments */}
              <div className="max-w-[85%] ml-auto">
                <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                  <div className="h-28 bg-primary/10 rounded-lg" />
                  <div className="h-28 bg-primary/15 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="bg-muted/50 rounded-xl p-3">
                <textarea
                  placeholder="Type your response to Alex..."
                  className="w-full bg-transparent text-sm placeholder:text-muted-foreground resize-none focus:outline-none min-h-[60px]"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-muted rounded transition-colors">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 hover:bg-muted rounded transition-colors">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 hover:bg-muted rounded transition-colors">
                      <Smile className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-foreground text-card rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    Send Message <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
