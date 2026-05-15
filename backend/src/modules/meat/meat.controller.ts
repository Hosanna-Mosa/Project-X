import { Request, Response } from "express";
import MeatCenter from "../../database/models/MeatCenter";
import generateToken from "../../utils/generateToken";

export const loginMeatCenter = async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;

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
    const { lat, lng, page = 1, limit = 20, category } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and Longitude are required" });
    }

    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const skip = (Number(page) - 1) * Number(limit);

    const matchStage: any = {};
    if (category) {
      matchStage.categories = { $in: [category] };
    }

    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLng, userLat],
          },
          distanceField: "distance",
          spherical: true,
          key: "location"
        },
      }
    ];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    const centers = await MeatCenter.aggregate(pipeline);

    const formattedCenters = centers.map((center) => {
      const distanceInKm = center.distance / 1000;
      const travelTimeMinutes = (distanceInKm / 20) * 60;
      const totalEstimatedTime = Math.round(travelTimeMinutes + 15);
      
      return {
        ...center,
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

import MeatItem from "../../database/models/MeatItem";
import MeatGlobalPrice from "../../database/models/MeatGlobalPrice";

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


export const getMeatCenterMenu = async (req: Request, res: Response) => {
  try {
    const { centerId } = req.params;
    const items = await MeatItem.find({ meatCenterId: centerId, isAvailable: true });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMeatItemAvailability = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { isAvailable } = req.body;
    const item = await MeatItem.findByIdAndUpdate(itemId, { isAvailable }, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

