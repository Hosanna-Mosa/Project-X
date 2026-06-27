import { Request, Response } from "express";
import FoodItem from "../../database/models/FoodItem";
import { CloudinaryService } from "../../services/cloudinary.service";

const cloudinaryService = new CloudinaryService();

export const getVendorMenu = async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const menu = await FoodItem.find({ vendorId });
    res.json(menu);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addFoodItem = async (req: Request, res: Response) => {
  try {
    const { vendorId, name, description, price, images, category, isVeg } = req.body;
    
    const foodItem = new FoodItem({
      vendorId,
      name,
      description,
      price,
      images,
      category,
      isVeg
    });

    await foodItem.save();
    res.status(201).json(foodItem);
  } catch (error) {
    console.error("Error adding food item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFoodItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedItem = await FoodItem.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating food item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteFoodItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await FoodItem.findByIdAndDelete(id);
    res.json({ message: "Food item deleted successfully" });
  } catch (error) {
    console.error("Error deleting food item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const uploadImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const fileBuffers = files.map(file => file.buffer);
    const imageUrls = await cloudinaryService.uploadMultipleImages(fileBuffers);
    
    res.json({ imageUrls });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    res.status(500).json({ message: "Upload failed" });
  }
};

export const searchFoodItems = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    
    const dishes = await FoodItem.find({
      $or: [
        { name: { $regex: query as string, $options: "i" } },
        { description: { $regex: query as string, $options: "i" } },
        { category: { $regex: query as string, $options: "i" } }
      ]
    }).populate("vendorId");
    
    res.json(dishes);
  } catch (error) {
    console.error("Error searching food items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
