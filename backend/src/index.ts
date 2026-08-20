import "reflect-metadata";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
dotenv.config();
import { connectDB } from "./database/db";
import { SocketManager } from "./sockets/socket.manager";
import { globalErrorHandler } from "./middleware/error.middleware";
import { QueueManager } from "./services/queue.service";
import { SchedulerService } from "./services/scheduler.service";

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
import notificationsRoutes from "./modules/notifications/notifications.routes";
import supportRoutes from "./modules/support/support.routes";
import reviewRoutes from "./modules/reviews/reviews.routes";
import bannersRoutes from "./modules/banners/banners.routes";

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
import { seedDatabase } from "./database/seeder";

connectDB().then(async () => {
  // Run seed script
  await seedDatabase();

  // Sample Route
  app.get("/", (req, res) => {
    res.json({ message: "Multi-Service Logistics Platform Backend API" });
  });

  // Universal/App Links verification files — let a plain https:// link (shared via
  // WhatsApp/SMS/etc.) open the customer app directly instead of a browser, on whichever
  // domain app/app.config.js's associatedDomains/intentFilters point at.
  //
  // Both files below need one real, account-specific value filled in before this actually
  // works — nothing in this repo can generate them, they come from your own developer
  // accounts. Until then this is safe to leave as-is: links will just always open the web
  // fallback page instead of the app, matching current behavior.
  app.get("/.well-known/apple-app-site-association", (req, res) => {
    // APPLE_TEAM_ID: Apple Developer account → Membership → Team ID.
    const teamId = process.env.APPLE_TEAM_ID || "TEAMID";
    res.type("application/json").json({
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.com.flavour.customer`,
            paths: ["/restaurant-menu/*", "/restaurant-menu"],
          },
        ],
      },
    });
  });

  app.get("/.well-known/assetlinks.json", (req, res) => {
    // ANDROID_SHA256_FINGERPRINT: your release-signing certificate's SHA256 fingerprint,
    // from `cd app && eas credentials` (Android → your build profile → view credentials).
    const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT || "AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA";
    res.type("application/json").json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.flavour.customer",
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ]);
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
  app.use("/api/v1/notifications", notificationsRoutes);
  app.use("/api/v1/support", supportRoutes);
  app.use("/api/v1/reviews", reviewRoutes);
  app.use("/api/v1/banners", bannersRoutes);

  // Global Error Handler Middleware
  app.use(globalErrorHandler);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Initialize BullMQ worker
    QueueManager.getInstance().startWorker();

    // Initialize periodic scheduler
    SchedulerService.getInstance().startScheduler();
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
