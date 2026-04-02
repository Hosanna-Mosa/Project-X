import "reflect-metadata";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
import { connectDB } from "./database/db";
import { SocketManager } from "./sockets/socket.manager";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import driverRoutes from "./modules/drivers/drivers.routes";
import orderRoutes from "./modules/orders/orders.routes";
import adminRoutes from "./modules/admin/admin.routes";
import placesRoutes from "./modules/places/places.routes";
import routingRoutes from "./modules/routing/routing.routes";
import paymentRoutes from "./modules/payments/payment.routes";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Socket Initialization
SocketManager.getInstance(server);

// Database Initialization
connectDB().then(async () => {
  // Sample Route
  app.get("/", (req, res) => {
    res.json({ message: "Multi-Service Logistics Platform Backend API" });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/places", placesRoutes);
  app.use("/api/routing", routingRoutes);
  app.use("/api/payments", paymentRoutes);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error("Database initialization failed", error);
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
