import { Router } from "express";
import { createZone, getZones, getZoneById, updateZone, deleteZone, checkCoordinates } from "./zones.controller";
import { authenticateToken, authorizeRole } from "../../middleware/auth.middleware";
import { UserRole } from "../../database/models/User";

const router = Router();

// Public / client-facing endpoint to check if coordinate falls in a zone
router.get("/check", checkCoordinates);

// View zones
router.get("/", authenticateToken, getZones);
router.get("/:id", authenticateToken, getZoneById);

// Admin-only operations to manage zones
router.post("/", authenticateToken, authorizeRole([UserRole.ADMIN]), createZone);
router.put("/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), updateZone);
router.delete("/:id", authenticateToken, authorizeRole([UserRole.ADMIN]), deleteZone);

export default router;
