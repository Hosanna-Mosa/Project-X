import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import { getNearbyVendors, getVendorById, createVendor, searchGooglePlaces, getPlaceDetails, loginVendor, saveVendorOnboarding, changeVendorPassword, forgotVendorPassword, resetVendorPassword } from "./vendors.controller";

const router = Router();

router.get("/nearby", getNearbyVendors);
router.get("/search-google", searchGooglePlaces);
router.get("/place-details/:placeId", getPlaceDetails);
router.get("/:id", getVendorById);
router.post("/login", loginVendor);
router.post("/onboarding", saveVendorOnboarding);
router.post("/", createVendor);
router.put("/change-password", authenticateToken, changeVendorPassword);
router.post("/forgot-password", forgotVendorPassword);
router.post("/reset-password", resetVendorPassword);

export default router;
