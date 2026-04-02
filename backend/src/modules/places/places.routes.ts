import { Router } from "express";
import { PlacesController } from "./places.controller";

const router = Router();

router.get("/nearby", PlacesController.getNearbyPlaces);
router.get("/autocomplete", PlacesController.getAutocompleteSuggestions);
router.get("/details/:placeId", PlacesController.getPlaceDetails);

export default router;
