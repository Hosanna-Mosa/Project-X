import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import { 
  getNearbyMeatCenters, 
  createMeatCenter, 
  loginMeatCenter,
  updateGlobalMeatPrices,
  getGlobalMeatPrices,
  getMeatCenterMenu,
  getVendorMeatMenu,
  updateMeatItemAvailability,
  updateMeatItemPrice,
  changeMeatVendorPassword,
  forgotMeatVendorPassword,
  resetMeatVendorPassword,
  updateMeatCenter,
  deleteMeatCenter
} from "./meat.controller";

const router = Router();

router.post("/login", loginMeatCenter);
router.get("/nearby", getNearbyMeatCenters);
router.post("/", createMeatCenter);
router.put("/:id", updateMeatCenter);
router.delete("/:id", deleteMeatCenter);


// Global Price Management (Admin)
router.get("/menu/global", getGlobalMeatPrices);
router.put("/global-prices", updateGlobalMeatPrices);


// Menu (Customer App)
router.get("/menu/:centerId", getMeatCenterMenu);

// Forgot / Reset Password
router.post("/forgot-password", forgotMeatVendorPassword);
router.post("/reset-password", resetMeatVendorPassword);

// Menu & Pricing (Vendor Dashboard) — auth-protected
router.get("/vendor-menu/:centerId", authenticateToken, getVendorMeatMenu);
router.put("/items/:itemId/availability", authenticateToken, updateMeatItemAvailability);
router.put("/items/:itemId/price", authenticateToken, updateMeatItemPrice);
router.put("/change-password", authenticateToken, changeMeatVendorPassword);

export default router;
