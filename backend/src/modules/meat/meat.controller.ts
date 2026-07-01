import { Request, Response } from "express";
import MeatCenter from "../../database/models/MeatCenter";
import MeatItem from "../../database/models/MeatItem";
import MeatGlobalPrice from "../../database/models/MeatGlobalPrice";
import OTP from "../../database/models/OTP";
import Vendor from "../../database/models/Vendor";
import FoodItem from "../../database/models/FoodItem";
import generateToken from "../../utils/generateToken";
import { sendEmail, generateOTP, getOTPEmailHtml } from "../../services/email.service";
import type { AuthRequest } from "../../middleware/auth.middleware";

export const forgotMeatVendorPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const center = await MeatCenter.findOne({ email });
    if (!center) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate OTP and save
    const otp = generateOTP();
    await OTP.create({
      phone: center.phone,
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send email
    await sendEmail({
      to: email,
      subject: "Password Reset OTP — Precision Nav",
      html: getOTPEmailHtml(otp),
      text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetMeatVendorPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({
      email,
      code: otp,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Update password
    const center = await MeatCenter.findOne({ email });
    if (!center) {
      return res.status(404).json({ message: "Account not found" });
    }

    center.password = newPassword;
    await center.save();

    res.json({ message: "Password reset successfully. You can now sign in with your new password." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const DEFAULT_MEAT_IMAGE = "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800";

const getDistanceInMeters = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLat = toRad(toLat - fromLat);
  const deltaLng = toRad(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const loginMeatCenter = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").replace(/\D/g, "");
    const password = String(req.body.password || "");

    if (!password || (!email && !phone)) {
      return res.status(400).json({ message: "Email/phone and password are required" });
    }

    const center = await MeatCenter.findOne({
      $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    });

    if (!center) {
      return res.status(401).json({ message: "Invalid email/phone or password" });
    }

    const isMatch = await center.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email/phone or password" });
    }

    res.json({
      _id: center._id,
      name: center.name,
      email: center.email,
      phone: center.phone,
      role: "meat_vendor",
      token: generateToken(center._id.toString(), "meat_vendor"),
    });
  } catch (error) {
    console.error("Error logging in meat center:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getNearbyMeatCenters = async (req: Request, res: Response) => {
  try {
    const { lat, lng, page = 1, limit = 20, category, all, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and Longitude are required" });
    }

    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return res.status(400).json({ message: "Latitude and Longitude must be valid numbers" });
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const requestedLimit = Math.max(1, Number(limit) || 20);
    const fetchAll = all === "true";
    const skip = fetchAll ? 0 : (pageNumber - 1) * requestedLimit;
    const pageLimit = requestedLimit;
    const radiusInMeters = radius ? Math.max(1000, Number(radius) || 0) : 25000;

    const matchStage: any = {};
    if (category) {
      matchStage.categories = { $in: [category] };
    }

    if (fetchAll) {
      const [centers, meatVendors] = await Promise.all([
        MeatCenter.find(matchStage).lean(),
        Vendor.find({ ...matchStage, partnerType: "meat" }).lean(),
      ]);

      const filteredCenters = radiusInMeters
        ? [...centers, ...meatVendors].filter((center: any) => {
          const [centerLng = userLng, centerLat = userLat] = center.location?.coordinates || [];
          return getDistanceInMeters(userLat, userLng, centerLat, centerLng) <= radiusInMeters;
        })
        : [...centers, ...meatVendors];

      const formattedCenters = filteredCenters.map((center: any) => {
        const [centerLng = userLng, centerLat = userLat] = center.location?.coordinates || [];
        const distanceInMeters = getDistanceInMeters(userLat, userLng, centerLat, centerLng);
        const distanceInKm = distanceInMeters / 1000;
        const travelTimeMinutes = (distanceInKm / 20) * 60;
        const totalEstimatedTime = Math.round(travelTimeMinutes + 15);

        return {
          ...center,
          role: "meat_vendor",
          partnerType: "meat",
          image: center.image || DEFAULT_MEAT_IMAGE,
          rating: center.rating || 0,
          reviews: center.reviews || "0",
          time: `${totalEstimatedTime}-${totalEstimatedTime + 10} min`,
          distance: distanceInKm < 1
            ? `${Math.round(distanceInMeters)} metres`
            : `${distanceInKm.toFixed(1)} km`,
        };
      });

      return res.json(formattedCenters);
    }

    const centerPipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLng, userLat],
          },
          distanceField: "distance",
          ...(radiusInMeters ? { maxDistance: radiusInMeters } : {}),
          spherical: true,
          key: "location"
        },
      }
    ];

    if (Object.keys(matchStage).length > 0) {
      centerPipeline.push({ $match: matchStage });
    }

    if (!fetchAll) {
      centerPipeline.push({ $limit: skip + pageLimit });
    }

    const vendorPipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLng, userLat],
          },
          distanceField: "distance",
          ...(radiusInMeters ? { maxDistance: radiusInMeters } : {}),
          spherical: true,
          key: "location",
          query: { partnerType: "meat" },
        },
      },
    ];

    if (Object.keys(matchStage).length > 0) {
      vendorPipeline.push({ $match: matchStage });
    }

    if (!fetchAll) {
      vendorPipeline.push({ $limit: skip + pageLimit });
    }

    const [centers, meatVendors] = await Promise.all([
      MeatCenter.aggregate(centerPipeline),
      Vendor.aggregate(vendorPipeline),
    ]);

    const sortedCenters = [...centers, ...meatVendors].sort((a, b) => (a.distance || 0) - (b.distance || 0));
    const pageCenters = fetchAll ? sortedCenters : sortedCenters.slice(skip, skip + pageLimit);
    const formattedCenters = pageCenters.map((center) => {
      const distanceInKm = center.distance / 1000;
      const travelTimeMinutes = (distanceInKm / 20) * 60;
      const totalEstimatedTime = Math.round(travelTimeMinutes + 15);
      
      return {
        ...center,
        role: "meat_vendor",
        partnerType: "meat",
        image: center.image || DEFAULT_MEAT_IMAGE,
        rating: center.rating || 0,
        reviews: center.reviews || "0",
        time: `${totalEstimatedTime}-${totalEstimatedTime + 10} min`,
        distance: distanceInKm < 1 
          ? `${Math.round(center.distance)} metres` 
          : `${distanceInKm.toFixed(1)} km`,
      };
    });

    res.json(formattedCenters);
  } catch (error) {
    console.error("Error fetching meat centers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const DEFAULT_MEAT_ITEMS = [
  { name: "Chicken 250g", weight: "250g", price: 60, category: "Chicken" },
  { name: "Chicken 500g", weight: "500g", price: 120, category: "Chicken" },
  { name: "Full Chicken", weight: "Full", price: 240, category: "Chicken" },
  { name: "Chicken Round Figure", weight: "₹100 Pack", price: 100, category: "Chicken" },
  { name: "Mutton 500g", weight: "500g", price: 400, category: "Mutton" },
] as const;

export const createMeatCenter = async (req: Request, res: Response) => {
  try {
    const meatCenter = new MeatCenter(req.body);
    await meatCenter.save();

    // 1. Get current global prices from master list
    let masterPrices = await MeatGlobalPrice.find();
    
    // 2. If master list is empty, seed it with defaults
    if (masterPrices.length === 0) {
      masterPrices = await MeatGlobalPrice.insertMany(DEFAULT_MEAT_ITEMS);
    }

    // 3. Automatically create menu items for this center using master prices
    const menuItems = masterPrices.map(item => ({
      meatCenterId: meatCenter._id,
      name: item.name,
      weight: item.weight,
      price: item.price,
      category: item.category,
      isGlobalItem: true
    }));

    await MeatItem.insertMany(menuItems);

    res.status(201).json({ meatCenter, menuItemsCreated: menuItems.length });
  } catch (error) {
    console.error("Error creating meat center:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addMeatItem = async (req: Request, res: Response) => {
  try {
    const { meatCenterId, name, weight, price, category, image } = req.body;

    if (!meatCenterId || !name || !weight || price === undefined || !category) {
      return res.status(400).json({ message: "Center, name, weight, price and category are required" });
    }

    const item = new MeatItem({
      meatCenterId,
      name,
      weight,
      price,
      category,
      image,
      isGlobalItem: false,
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error("Error adding meat item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMeatItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    await MeatItem.findByIdAndDelete(itemId);
    res.json({ message: "Meat item deleted successfully" });
  } catch (error) {
    console.error("Error deleting meat item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin Controller to update prices globally
export const updateGlobalMeatPrices = async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of { name, price }

    for (const item of items) {
      // 1. Update the Master Template
      await MeatGlobalPrice.findOneAndUpdate(
        { name: item.name },
        { price: item.price }
      );

      // 2. Propagate to ALL centers (only for items marked as isGlobalItem)
      await MeatItem.updateMany(
        { name: item.name, isGlobalItem: true },
        { price: item.price }
      );
    }

    res.json({ message: "Global prices updated and propagated successfully" });
  } catch (error) {
    console.error("Error updating global prices:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getGlobalMeatPrices = async (req: Request, res: Response) => {
  try {
    let prices = await MeatGlobalPrice.find();
    if (prices.length === 0) {
      prices = await MeatGlobalPrice.insertMany(DEFAULT_MEAT_ITEMS);
    }
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const parsePrice = (value: unknown) => {
  if (typeof value === "number") return value;
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildOnboardedMeatItems = (meatVendor: any) => {
  const operations = meatVendor.operations || {};
  const manualCategories = Array.isArray(operations.menuCategories) ? operations.menuCategories : [];
  const uploadedRows = Array.isArray(operations.menuUploadRows) ? operations.menuUploadRows : [];

  const manualItems = manualCategories.flatMap((category: any) =>
    (Array.isArray(category.items) ? category.items : []).map((item: any, index: number) => ({
      _id: `${meatVendor._id}-${category._id || category.name}-${item._id || index}`,
      meatCenterId: meatVendor._id,
      name: item.name,
      description: item.description,
      weight: "Custom",
      price: parsePrice(item.price),
      category: category.name || "Meat",
      image: DEFAULT_MEAT_IMAGE,
      images: [DEFAULT_MEAT_IMAGE],
      isAvailable: true,
      isVeg: false,
      isGlobalItem: false,
    }))
  );

  const uploadedItems = uploadedRows.map((row: any, index: number) => ({
    _id: `${meatVendor._id}-upload-${index}`,
    meatCenterId: meatVendor._id,
    name: row.itemName,
    description: row.description,
    weight: "Custom",
    price: parsePrice(row.price),
    category: row.category || "Meat",
    image: DEFAULT_MEAT_IMAGE,
    images: [DEFAULT_MEAT_IMAGE],
    isAvailable: true,
    isVeg: false,
    isGlobalItem: false,
  }));

  return [...manualItems, ...uploadedItems].filter((item) => item.name && item.price > 0);
};


// Customer-facing — only returns available items
export const getMeatCenterMenu = async (req: Request, res: Response) => {
  try {
    const { centerId } = req.params;
    const includeUnavailable = req.query.includeUnavailable === "true";
    const items = await MeatItem.find({
      meatCenterId: centerId,
      ...(includeUnavailable ? {} : { isAvailable: true }),
    }).lean();

    if (includeUnavailable) {
      return res.json(items);
    }

    const meatVendor = await Vendor.findOne({ _id: centerId, partnerType: "meat" }).lean();
    if (!meatVendor) {
      return res.json(items);
    }

    const legacyFoodItems = await FoodItem.find({ vendorId: centerId, isAvailable: true }).lean();
    const legacyAsMeatItems = legacyFoodItems.map((item) => ({
      ...item,
      weight: "Custom",
      image: item.images?.[0],
      isVeg: false,
      isGlobalItem: false,
    }));

    res.json([...items, ...legacyAsMeatItems, ...buildOnboardedMeatItems(meatVendor)]);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Vendor-facing — returns ALL items regardless of availability
export const getVendorMeatMenu = async (req: AuthRequest, res: Response) => {
  try {
    const { centerId } = req.params;
    
    // Verify vendor owns this center
    if (req.user?.userId !== centerId) {
      return res.status(403).json({ message: "Access denied: you do not own this center" });
    }
    
    const items = await MeatItem.find({ meatCenterId: centerId }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMeatItemAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { isAvailable } = req.body;
    
    const item = await MeatItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Verify vendor owns the center this item belongs to
    if (req.user?.userId !== item.meatCenterId.toString()) {
      return res.status(403).json({ message: "Access denied: you do not own this item" });
    }
    
    item.isAvailable = isAvailable;
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changeMeatVendorPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const center = await MeatCenter.findById(req.user?.userId);
    if (!center) {
      return res.status(404).json({ message: "Meat center not found" });
    }

    const isMatch = await center.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    center.password = newPassword;
    await center.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMeatItemPrice = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { price } = req.body;

    if (price == null || price < 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    const item = await MeatItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Verify vendor owns the center this item belongs to
    if (req.user?.userId !== item.meatCenterId.toString()) {
      return res.status(403).json({ message: "Access denied: you do not own this item" });
    }

    item.price = price;
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

