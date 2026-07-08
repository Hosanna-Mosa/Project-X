import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import SupportTicket from "../../database/models/SupportTicket";
import User from "../../database/models/User";
import { SocketManager } from "../../sockets/socket.manager";

export class SupportController {
  async getTickets(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const tickets = await SupportTicket.find({ userId }).sort({ createdAt: -1 });
      return res.json(tickets);
    } catch (error) {
      console.error("Get support tickets error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async createTicket(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { title, category, message } = req.body;
      if (!title || !category || !message) {
        return res.status(400).json({ message: "Title, category and message are required" });
      }

      const ticketId = `QX-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const ticket = new SupportTicket({
        ticketId,
        title,
        category,
        status: "OPEN",
        message: `"${message}"`,
        user: user.name,
        userRole: user.role,
        userId: user._id,
        time: "Just now",
        messages: [
          { sender: "system", time: `TICKET OPENED • ${now}`, text: "" },
          { sender: "user", time: now, text: message }
        ]
      });

      await ticket.save();
      
      // Emit socket event to admin support room and user personal room
      try {
        const io = SocketManager.getInstance().getIo();
        if (io) {
          io.to("support_tickets").emit("ticket_updated", ticket);
          if (ticket.userId) {
            io.to(ticket.userId.toString()).emit("ticket_updated", ticket);
          }
        }
      } catch (err) {
        console.error("Socket emit support update error:", err);
      }

      return res.status(201).json(ticket);
    } catch (error) {
      console.error("Create support ticket error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async sendReply(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Message text is required" });
      }

      const ticket = await SupportTicket.findById(id);
      if (!ticket) return res.status(404).json({ message: "Support ticket not found" });

      // Security validation: check ownership
      if (ticket.userId && ticket.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      
      ticket.messages.push({
        sender: "user",
        time: now,
        text: text.trim()
      });

      // Re-open if resolved
      ticket.status = "OPEN";
      ticket.time = "Just now";

      await ticket.save();

      // Emit socket event to admin support room and user personal room
      try {
        const io = SocketManager.getInstance().getIo();
        if (io) {
          io.to("support_tickets").emit("ticket_updated", ticket);
          if (ticket.userId) {
            io.to(ticket.userId.toString()).emit("ticket_updated", ticket);
          }
        }
      } catch (err) {
        console.error("Socket emit support update error:", err);
      }

      return res.json(ticket);
    } catch (error) {
      console.error("Send support reply error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async resolveTicket(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { approve } = req.body;

      const ticket = await SupportTicket.findById(id);
      if (!ticket) return res.status(404).json({ message: "Support ticket not found" });

      if (ticket.userId && ticket.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (approve) {
        ticket.status = "RESOLVED";
        ticket.messages.push({
          sender: "system",
          time: `TICKET RESOLVED • ${now}`,
          text: "Case marked as resolved by customer."
        });
      } else {
        ticket.status = "OPEN";
        ticket.messages.push({
          sender: "system",
          time: `RE-OPENED • ${now}`,
          text: "Customer declined resolution request. Ticket remains open."
        });
      }

      await ticket.save();

      // Emit socket event to admin support room and user personal room
      try {
        const io = SocketManager.getInstance().getIo();
        if (io) {
          io.to("support_tickets").emit("ticket_updated", ticket);
          if (ticket.userId) {
            io.to(ticket.userId.toString()).emit("ticket_updated", ticket);
          }
        }
      } catch (err) {
        console.error("Socket emit support update error:", err);
      }

      return res.json(ticket);
    } catch (error) {
      console.error("Resolve ticket error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
