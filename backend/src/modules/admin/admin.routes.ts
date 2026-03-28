import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authenticateToken, authorizeRole } from "../../middleware/auth.middleware";
import { UserRole } from "../../database/entities/User";

const router = Router();
const adminController = new AdminController();

router.get("/orders", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getAllOrders.bind(adminController));
router.get("/drivers", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getAllDrivers.bind(adminController));
router.get("/stats", authenticateToken, authorizeRole([UserRole.ADMIN]), adminController.getDashboardStats.bind(adminController));

export default router;
