import { Request, Response, NextFunction } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import DigitalMenuRestaurant from "../../database/models/DigitalMenuRestaurant";
import DigitalMenuItem from "../../database/models/DigitalMenuItem";
import mongoose from "mongoose";

// Initialize Gemini API
const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables.");
  }
  return new GoogleGenerativeAI(apiKey || "");
};

/**
 * Extracts menu items from uploaded images using Google Gemini 1.5 Flash.
 */
export const extractMenuFromImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: "No images uploaded for extraction." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ 
        message: "Gemini API Key is missing. Please add GEMINI_API_KEY to your backend .env file to enable OCR." 
      });
      return;
    }

    const genAI = getGeminiAI();
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // Prepare image data for Gemini API
    const imageParts = files.map((file) => ({
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      },
    }));

    const prompt = `
      You are an expert OCR and menu parsing assistant. 
      Analyze the provided menu image(s) and extract all the food items. 
      For each item, identify:
      1. 'name': The exact name of the item.
      2. 'price': The price as a number (clean any currency symbols like ₹, $, etc. and parse as float/integer). If no price is found, default to 0.
      3. 'description': A brief description of the item if available, or empty string.
      4. 'category': The category it belongs to (e.g. Starters, Main Course, Desserts, Beverages). If none is specified, group logically or use 'General'.
      5. 'isVeg': A boolean indicating if the item is vegetarian. Infer from green dot, item name (e.g. paneer, veg, chicken, egg, mutton), or category.

      Return ONLY a valid JSON array of these items. Do not include markdown code block wrapper, do not write 'json' or use backticks. Just return raw JSON.
      Example structure:
      [
        {
          "name": "Paneer Butter Masala",
          "price": 220,
          "description": "Cottage cheese cooked in rich tomato gravy",
          "category": "Main Course",
          "isVeg": true
        }
      ]
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text().trim();

    // Clean any markdown backticks if Gemini still included them
    let cleanJson = responseText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(json)?/, "").replace(/```$/, "").trim();
    }

    try {
      const parsedMenu = JSON.parse(cleanJson);
      res.status(200).json({ items: parsedMenu });
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON response:", responseText);
      res.status(500).json({ 
        message: "Failed to parse the extracted menu structure. Gemini returned invalid JSON.", 
        rawText: responseText 
      });
    }
  } catch (error: any) {
    console.error("Error in extractMenuFromImage:", error);
    res.status(500).json({ message: error.message || "Error extracting menu from image" });
  }
};

/**
 * Saves a new restaurant (Vendor) and its menu items (FoodItems).
 */
export const saveRestaurantAndMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, phone, address, isPureVeg, items } = req.body;

    if (!name || !phone || !address) {
      res.status(400).json({ message: "Name, phone, and address are required." });
      return;
    }

    // Create unique email if not provided
    const cleanEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now()}@example.com`;

    // Create the digital menu restaurant
    const newRestaurant = new DigitalMenuRestaurant({
      name,
      email: cleanEmail,
      phone,
      address,
      isPureVeg: !!isPureVeg,
    });

    await newRestaurant.save({ session });

    // Save menu items
    if (items && Array.isArray(items) && items.length > 0) {
      const foodItemsToCreate = items.map((item: any) => ({
        restaurantId: newRestaurant._id,
        name: item.name,
        description: item.description || "",
        price: Number(item.price) || 0,
        category: item.category || "General",
        images: item.images || [],
        isVeg: !!item.isVeg,
        isAvailable: true,
      }));

      await DigitalMenuItem.insertMany(foodItemsToCreate, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ 
      message: "Restaurant and menu saved successfully", 
      restaurant: newRestaurant 
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error saving restaurant and menu:", error);
    res.status(500).json({ message: error.message || "Error saving restaurant and menu" });
  }
};

/**
 * Gets all restaurants (partnerType = food).
 */
export const getRestaurants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const restaurants = await DigitalMenuRestaurant.find().sort({ createdAt: -1 });
    res.status(200).json(restaurants);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error fetching restaurants" });
  }
};

/**
 * Gets a single restaurant and its menu.
 */
export const getRestaurantAndMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await DigitalMenuRestaurant.findById(id);
    if (!restaurant) {
      res.status(404).json({ message: "Restaurant not found" });
      return;
    }

    const menuItems = await DigitalMenuItem.find({ restaurantId: id });
    res.status(200).json({ restaurant, menu: menuItems });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error fetching restaurant and menu" });
  }
};

/**
 * Updates a restaurant and its menu.
 */
export const updateRestaurantAndMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { name, email, phone, address, isPureVeg, items } = req.body;

    const restaurant = await DigitalMenuRestaurant.findById(id);
    if (!restaurant) {
      res.status(404).json({ message: "Restaurant not found" });
      return;
    }

    // Update restaurant details
    restaurant.name = name || restaurant.name;
    restaurant.email = email || restaurant.email;
    restaurant.phone = phone || restaurant.phone;
    restaurant.address = address || restaurant.address;
    restaurant.isPureVeg = isPureVeg !== undefined ? !!isPureVeg : restaurant.isPureVeg;

    await restaurant.save({ session });

    if (items && Array.isArray(items)) {
      // Delete existing menu items first, then insert the new list
      await DigitalMenuItem.deleteMany({ restaurantId: id }, { session });

      const foodItemsToCreate = items.map((item: any) => ({
        restaurantId: id,
        name: item.name,
        description: item.description || "",
        price: Number(item.price) || 0,
        category: item.category || "General",
        images: item.images || [],
        isVeg: !!item.isVeg,
        isAvailable: true,
      }));

      await DigitalMenuItem.insertMany(foodItemsToCreate, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Restaurant and menu updated successfully", restaurant });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating restaurant and menu:", error);
    res.status(500).json({ message: error.message || "Error updating restaurant and menu" });
  }
};

/**
 * Deletes a restaurant and all its menu items.
 */
export const deleteRestaurant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const restaurant = await DigitalMenuRestaurant.findByIdAndDelete(id, { session });
    if (!restaurant) {
      res.status(404).json({ message: "Restaurant not found" });
      return;
    }

    // Delete associated food items
    await DigitalMenuItem.deleteMany({ restaurantId: id }, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Restaurant and its menu deleted successfully" });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting restaurant:", error);
    res.status(500).json({ message: error.message || "Error deleting restaurant" });
  }
};
