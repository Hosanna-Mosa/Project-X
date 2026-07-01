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

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/search", searchFoodItems);
router.get("/store-149", getStore149Items);
router.get("/vendor/:vendorId", getVendorMenu);
router.post("/", addFoodItem);
router.post("/upload", upload.array("images", 5), uploadImages);
router.put("/:id", updateFoodItem);
router.delete("/:id", deleteFoodItem);

export default router;
