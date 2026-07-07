import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authenticateToken, authorizeRole } from "../../middleware/auth.middleware";
import { UserRole } from "../../database/models/User";

const router = Router();
const adminController = new AdminController();

router.get("/orders", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getAllOrders.bind(adminController));
router.get("/orders/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getOrderById.bind(adminController));
router.put("/orders/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.updateOrder.bind(adminController));
router.get("/drivers", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getAllDrivers.bind(adminController));
router.get("/stats", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getDashboardStats.bind(adminController));
router.get("/users", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getAllUsers.bind(adminController));
router.post("/users", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.createUser.bind(adminController));
router.put("/users/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.updateUser.bind(adminController));
router.delete("/users/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.deleteUser.bind(adminController));
router.put("/drivers/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.updateDriver.bind(adminController));
router.delete("/drivers/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.deleteDriver.bind(adminController));
router.post("/orders", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.createOrder.bind(adminController));

// Dynamic no-mock endpoints
router.get("/payments", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getPayments.bind(adminController));
router.get("/analytics", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getAnalytics.bind(adminController));
router.get("/multistop", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getMultiStop.bind(adminController));
router.get("/tickets", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getSupportTickets.bind(adminController));
router.post("/tickets", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.createSupportTicket.bind(adminController));
router.put("/tickets/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.updateSupportTicket.bind(adminController));

// Settings and Coupons routes
router.get("/config", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getSystemConfig.bind(adminController));
router.put("/config", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.updateSystemConfig.bind(adminController));
router.get("/coupons", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getCoupons.bind(adminController));
router.post("/coupons", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.createCoupon.bind(adminController));
router.put("/coupons/:id/toggle", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.toggleCouponStatus.bind(adminController));
router.delete("/coupons/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.deleteCoupon.bind(adminController));

// User and Driver details routes
router.get("/users/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getUserDetail.bind(adminController));
router.get("/drivers/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getDriverDetail.bind(adminController));
router.get("/orders/:orderId/chat", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getOrderChat.bind(adminController));
router.get("/app-versions", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getAppVersions.bind(adminController));
router.put("/app-versions", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.updateAppVersion.bind(adminController));

export default router;
