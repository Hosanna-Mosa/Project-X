import { Router } from "express";
import { getNearbyVendors, createVendor, searchGooglePlaces, getPlaceDetails, loginVendor } from "./vendors.controller";

const router = Router();

router.get("/nearby", getNearbyVendors);
router.get("/search-google", searchGooglePlaces);
router.get("/place-details/:placeId", getPlaceDetails);
router.post("/login", loginVendor);
router.post("/", createVendor);

export default router;
