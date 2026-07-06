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

export default router;
