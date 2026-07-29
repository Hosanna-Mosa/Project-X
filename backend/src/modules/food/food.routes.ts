import { Router } from "express";
import multer from "multer";
import { 
  getVendorMenu, 
  addFoodItem, 
  updateFoodItem, 
  deleteFoodItem,
  uploadImages,
  searchFoodItems,
  getStore149Items
} from "./food.controller";
import {
  extractMenuFromImage,
  saveRestaurantAndMenu,
  getRestaurants,
  getRestaurantAndMenu,
  updateRestaurantAndMenu,
  deleteRestaurant
} from "./restaurant-menu.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/search", searchFoodItems);
router.get("/store-149", getStore149Items);
router.get("/vendor/:vendorId", getVendorMenu);
router.post("/", addFoodItem);
router.post("/upload", upload.array("images", 5), uploadImages);
router.put("/:id", updateFoodItem);
router.delete("/:id", deleteFoodItem);

// Restaurant Menu Routes
router.post("/restaurant-menu/extract", upload.array("images", 5), extractMenuFromImage);
router.post("/restaurant-menu/save", saveRestaurantAndMenu);
router.get("/restaurant-menu/restaurants", getRestaurants);
router.get("/restaurant-menu/restaurants/:id", getRestaurantAndMenu);
router.put("/restaurant-menu/restaurants/:id", updateRestaurantAndMenu);
router.delete("/restaurant-menu/restaurants/:id", deleteRestaurant);

export default router;

