import "reflect-metadata";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
import { connectDB } from "./database/db";
import { SocketManager } from "./sockets/socket.manager";
import { globalErrorHandler } from "./middleware/error.middleware";
import { QueueManager } from "./services/queue.service";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import driverRoutes from "./modules/drivers/drivers.routes";
import orderRoutes from "./modules/orders/orders.routes";
import adminRoutes from "./modules/admin/admin.routes";
import placesRoutes from "./modules/places/places.routes";
import routingRoutes from "./modules/routing/routing.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import vendorRoutes from "./modules/vendors/vendors.routes";
import foodRoutes from "./modules/food/food.routes";
import meatRoutes from "./modules/meat/meat.routes";
import onboardingRoutes from "./modules/onboarding/onboarding.routes";
import zonesRoutes from "./modules/zones/zones.routes";

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
import Order, { OrderStatus } from "./database/models/Order";

connectDB().then(async () => {
  // Sample Route
  app.get("/", (req, res) => {
    res.json({ message: "Multi-Service Logistics Platform Backend API" });
  });

  // API Routes
  // API Routes v1
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/drivers", driverRoutes);
  app.use("/api/v1/orders", orderRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/places", placesRoutes);
  app.use("/api/v1/routing", routingRoutes);
  app.use("/api/v1/payments", paymentRoutes);
  app.use("/api/v1/vendors", vendorRoutes);
  app.use("/api/v1/food", foodRoutes);
  app.use("/api/v1/meat", meatRoutes);
  app.use("/api/v1/onboarding", onboardingRoutes);
  app.use("/api/v1/zones", zonesRoutes);

  // Global Error Handler Middleware
  app.use(globalErrorHandler);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Initialize BullMQ worker
    QueueManager.getInstance().startWorker();
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
