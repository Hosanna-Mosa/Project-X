import { Router } from "express";
import { DriversController } from "./drivers.controller";
import { authenticateToken, authorizeRole } from "../../middleware/auth.middleware";
import { UserRole } from "../../database/models/User";

const router = Router();
const driversController = new DriversController();

router.patch("/status", authenticateToken, authorizeRole([UserRole.DRIVER]), driversController.updateStatus.bind(driversController));
router.patch("/location", authenticateToken, authorizeRole([UserRole.DRIVER]), driversController.updateLocation.bind(driversController));
router.get("/profile", authenticateToken, authorizeRole([UserRole.DRIVER]), driversController.profile.bind(driversController));
router.get("/earnings", authenticateToken, authorizeRole([UserRole.DRIVER]), driversController.earnings.bind(driversController));
router.post("/cash-out", authenticateToken, authorizeRole([UserRole.DRIVER]), driversController.cashOut.bind(driversController));
router.get("/high-demand-areas", authenticateToken, authorizeRole([UserRole.DRIVER]), driversController.highDemandAreas.bind(driversController));
router.get("/nearby", authenticateToken, driversController.nearby.bind(driversController));

export default router;
