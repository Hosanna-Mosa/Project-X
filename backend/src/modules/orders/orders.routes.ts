import { Router } from "express";
import { OrdersController } from "./orders.controller";
import { authenticateToken, authorizeRole } from "../../middleware/auth.middleware";
import { UserRole } from "../../database/models/User";

const router = Router();
const ordersController = new OrdersController();

// Create order - simplifying route to / for easier frontend integration
router.post("/", authenticateToken, ordersController.create.bind(ordersController));
router.post("/scheduled-delivery-request", authenticateToken, ordersController.requestScheduledDelivery.bind(ordersController));
router.get("/scheduled-delivery/vendor/:vendorId", ordersController.getVendorScheduledDeliveries.bind(ordersController));
router.get("/scheduled-delivery/:requestId/status", authenticateToken, ordersController.getScheduledDeliveryStatus.bind(ordersController));
router.patch("/scheduled-delivery/:requestId/respond", ordersController.respondScheduledDelivery.bind(ordersController));
router.get("/driver/scheduled", authenticateToken, authorizeRole([UserRole.DRIVER]), ordersController.getDriverScheduledOrders.bind(ordersController));
router.get("/", authenticateToken, ordersController.getUserOrders.bind(ordersController));
router.get("/estimate-fare", authenticateToken, ordersController.estimateFare.bind(ordersController));
router.get("/vendor/:vendorId", ordersController.getVendorOrders.bind(ordersController));
router.get("/:id", authenticateToken, ordersController.getOrder.bind(ordersController));
router.patch("/:id/status", authenticateToken, ordersController.updateStatus.bind(ordersController));
router.post("/:id/accept", authenticateToken, authorizeRole([UserRole.DRIVER]), ordersController.accept.bind(ordersController));

export default router;
