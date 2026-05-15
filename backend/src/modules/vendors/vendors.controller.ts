import { Request, Response } from "express";
import Vendor from "../../database/models/Vendor";

export const getNearbyVendors = async (req: Request, res: Response) => {
  try {
    const { lat, lng, page = 1, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and Longitude are required" });
    }

    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const skip = (Number(page) - 1) * Number(limit);

    console.log(`[API] Fetching nearby vendors - Lat: ${userLat}, Lng: ${userLng}, Page: ${page}`);

    // MongoDB Proximity Query with Pagination
    const vendors = await Vendor.aggregate([
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
      },
      { $skip: skip },
      { $limit: Number(limit) }
    ]);

    // Apply Time Estimation (Option B)
    const formattedVendors = vendors.map((vendor) => {
      const distanceInKm = vendor.distance / 1000;
      
      // Assume 20km/h speed + 15 mins prep time
      const travelTimeMinutes = (distanceInKm / 20) * 60;
      const totalEstimatedTime = Math.round(travelTimeMinutes + 15);
      
      return {
        ...vendor,
        time: `${totalEstimatedTime}-${totalEstimatedTime + 10} min`,
        distance: distanceInKm < 1 
          ? `${Math.round(vendor.distance)} metres` 
          : `${distanceInKm.toFixed(1)} km`,
        offer: vendor.deliveryFee === 0 
          ? "FREE delivery fee" 
          : `USD 0 delivery fee over USD 12`,
      };
    });

    res.json(formattedVendors);
    console.log(`[API] Found ${vendors.length} vendors nearby`);
  } catch (error) {
    console.error("Error fetching nearby vendors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

import generateToken from "../../utils/generateToken";

export const loginVendor = async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;

    const vendor = await Vendor.findOne({
      $or: [{ email }, { phone }],
    });

    if (vendor && (await vendor.matchPassword(password))) {
      res.json({
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        role: "restaurant_vendor",
        token: generateToken(vendor._id.toString(), "restaurant_vendor"),
      });
    } else {
      res.status(401).json({ message: "Invalid email/phone or password" });
    }
  } catch (error) {
    console.error("Error logging in vendor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const createVendor = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, googlePlaceId, location, address, image, categories, isPureVeg, deliveryFee, minOrderValue } = req.body;

    const existingVendor = await Vendor.findOne({ $or: [{ email }, { phone }] });
    if (existingVendor) {
      return res.status(400).json({ message: "Vendor with this email or phone already exists" });
    }

    const vendor = new Vendor({
      name,
      email,
      phone,
      password,
      googlePlaceId,
      location,
      address,
      image,
      categories,
      isPureVeg,
      deliveryFee,
      minOrderValue
    });

    await vendor.save();
    res.status(201).json({ message: "Vendor created successfully", vendor });
  } catch (error) {
    console.error("Error creating vendor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

import axios from "axios";

export const searchGooglePlaces = async (req: Request, res: Response) => {
  try {
    const { query, mode, types } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // ── TEXT SEARCH MODE ────────────────────────────────────────────────────────
    // Best for category-matched results (e.g. "aa chicken mutton shop in City")
    // No type restriction — query keywords do the category filtering
    if (mode === "textsearch") {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json`,
        { params: { query, key: apiKey } }
      );

      const results = (response.data.results || []).map((item: any) => ({
        place_id: item.place_id,
        description: item.formatted_address,
        structured_formatting: {
          main_text: item.name,
          secondary_text: item.formatted_address,
        },
      }));

      return res.json(results);
    }

    // ── AUTOCOMPLETE + MEAT FILTER MODE ────────────────────────────────────────
    // Runs Google Autocomplete with ONLY the raw typed prefix (e.g. "aa").
    // DO NOT append location text to the input — Autocomplete does literal prefix
    // matching, so "aa in Rajahmundry" will never match "Aadab Mutton & Chicken"
    // Center. Location scope is handled via the `components` country filter.
    // Results are then post-filtered by meat keywords to strip non-food places.
    if (mode === "autocomplete-meat") {
      const MEAT_KEYWORDS = [
        "chicken", "mutton", "meat", "gosht", "fish", "poultry",
        "butcher", "non-veg", "nalli", "nihari", "halal", "beef",
        "lamb", "kheema", "keema", "maas", "murgi", "bakra",
        "center", "centre", "shop", "store", "fresh",
      ];

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input: query,   // raw typed prefix ONLY (e.g. "aa", "mub")
            key: apiKey,
            types: "establishment",
            language: "en",
            components: "country:in",  // scope to India; avoids appending city text
          },
        }
      );

      const results = (response.data.predictions || [])
        .filter((item: any) => {
          // Keep only places whose name or address mentions a meat-related keyword
          const text = (
            (item.structured_formatting?.main_text || "") + " " +
            (item.structured_formatting?.secondary_text || "") + " " +
            (item.description || "")
          ).toLowerCase();
          return MEAT_KEYWORDS.some((kw) => text.includes(kw));
        })
        .map((item: any) => ({
          place_id: item.place_id,
          description: item.description,
          structured_formatting: {
            main_text: item.structured_formatting?.main_text || item.description,
            secondary_text: item.structured_formatting?.secondary_text || "",
          },
        }));

      return res.json(results);
    }

    // ── AUTOCOMPLETE MODE (default) ─────────────────────────────────────────────
    // Used for vendor/restaurant searches (types=food scopes to food businesses)
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
      {
        params: {
          input: query,
          key: apiKey,
          types: types || "establishment",
          language: "en",
        },
      }
    );

    const results = (response.data.predictions || []).map((item: any) => ({
      place_id: item.place_id,
      description: item.description,
      structured_formatting: {
        main_text: item.structured_formatting?.main_text || item.description,
        secondary_text: item.structured_formatting?.secondary_text || "",
      },
    }));

    res.json(results);
  } catch (error) {
    console.error("Error searching Google Places:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPlaceDetails = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id: placeId,
          key: apiKey,
          fields: "place_id,name,formatted_address,geometry,rating,user_ratings_total,photos",
        },
      }
    );

    res.json(response.data.result);
  } catch (error) {
    console.error("Error fetching place details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
