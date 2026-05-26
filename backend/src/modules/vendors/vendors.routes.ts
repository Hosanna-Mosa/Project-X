import { Router } from "express";
import { getNearbyVendors, getVendorById, createVendor, searchGooglePlaces, getPlaceDetails, loginVendor, saveVendorOnboarding } from "./vendors.controller";

const router = Router();

router.get("/nearby", getNearbyVendors);
router.get("/search-google", searchGooglePlaces);
router.get("/place-details/:placeId", getPlaceDetails);
router.get("/:id", getVendorById);
router.post("/login", loginVendor);
router.post("/onboarding", saveVendorOnboarding);
router.post("/", createVendor);

export default router;
