import { Router } from "express";
import { OrdersController } from "./orders.controller";
import { authenticateToken, authorizeRole } from "../../middleware/auth.middleware";
import { UserRole } from "../../database/models/User";

const router = Router();
const ordersController = new OrdersController();

// Create order - simplifying route to / for easier frontend integration
router.post("/", authenticateToken, ordersController.create.bind(ordersController));
router.get("/:id", authenticateToken, ordersController.getOrder.bind(ordersController));
router.patch("/:id/status", authenticateToken, ordersController.updateStatus.bind(ordersController));

export default router;
