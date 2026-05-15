import { Router } from "express";
import { 
  getNearbyMeatCenters, 
  createMeatCenter, 
  loginMeatCenter,
  updateGlobalMeatPrices,
  getGlobalMeatPrices,
  getMeatCenterMenu,
  updateMeatItemAvailability
} from "./meat.controller";

const router = Router();

router.post("/login", loginMeatCenter);
router.get("/nearby", getNearbyMeatCenters);
router.post("/", createMeatCenter);

// Global Price Management (Admin)
router.get("/menu/global", getGlobalMeatPrices);
router.put("/global-prices", updateGlobalMeatPrices);


// Menu & Availability (Vendor/App)
router.get("/menu/:centerId", getMeatCenterMenu);
router.put("/items/:itemId/availability", updateMeatItemAvailability);

export default router;
