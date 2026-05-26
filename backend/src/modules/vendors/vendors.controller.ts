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

export const getVendorById = async (req: Request, res: Response) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
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

const fileName = (file?: { name?: string } | null) => file?.name || undefined;

const requireFields = (payload: any) => {
  const missing: string[] = [];
  const requireText = (value: unknown, label: string) => {
    if (typeof value !== "string" || value.trim().length === 0) missing.push(label);
  };

  requireText(payload.restaurantName, "Restaurant name");
  if (!Array.isArray(payload.cuisines) || payload.cuisines.length === 0) missing.push("Cuisine / Food Category");
  requireText(payload.ownerName, "Owner full name");
  if (!payload.ownerEmail || !String(payload.ownerEmail).includes("@")) missing.push("Owner email address");
  if (!/^\d{10}$/.test(String(payload.ownerPhone || ""))) missing.push("Owner phone number");
  if (payload.otp !== "1234" || !payload.otpVerified) missing.push("OTP verification");
  if (!payload.location?.lat || !payload.location?.lng) missing.push("GPS location");
  requireText(payload.address?.area, "Area / Sector / Locality");
  requireText(payload.address?.city, "City");
  requireText(payload.address?.landmark, "Nearby landmark");
  if (!Array.isArray(payload.selectedDays) || payload.selectedDays.length === 0) missing.push("Days of operation");
  const dayTimeSlots = payload.dayTimeSlots || {};
  if (Array.isArray(payload.selectedDays)) {
    payload.selectedDays.forEach((day: string) => {
      if (!Array.isArray(dayTimeSlots[day]) || !dayTimeSlots[day].some((slot: any) => slot.open && slot.close)) {
        missing.push(`${day} timings`);
      }
    });
  }
  if (payload.menuSetupMode === "upload") {
    if (!fileName(payload.menuReferenceFile) || !payload.menuUploadValid) missing.push("Valid uploaded menu sheet");
  } else if (!Array.isArray(payload.menuCategories) || !payload.menuCategories.some((category: any) => Array.isArray(category.items) && category.items.length > 0)) {
    missing.push("Manual menu category and item");
  }

  requireText(payload.panNumber, "PAN number");
  if (!fileName(payload.panFile)) missing.push("PAN file");
  if (!payload.gstExempt) {
    requireText(payload.gstin, "GSTIN");
    if (!fileName(payload.gstFile)) missing.push("GST file");
  }
  if (!/^\d{14}$/.test(String(payload.fssaiNumber || ""))) missing.push("FSSAI number");
  requireText(payload.fssaiExpiry, "FSSAI expiry");
  if (!fileName(payload.fssaiFile)) missing.push("FSSAI file");
  if (String(payload.bankAccount || "").length < 9) missing.push("Bank account number");
  if (payload.bankAccount !== payload.bankConfirm) missing.push("Matching bank account confirmation");
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(payload.ifsc || ""))) missing.push("IFSC code");
  if (!payload.ifscFetched) missing.push("IFSC verification");
  if (!fileName(payload.chequeFile)) missing.push("Cancelled cheque / bank statement");
  if (!payload.acceptedTos) missing.push("Accepted contract terms");
  requireText(payload.signature, "Digital signature");

  return missing;
};

export const saveVendorOnboarding = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const status = payload.status === "submitted" ? "submitted" : "draft";

    if (status === "submitted") {
      const missing = requireFields(payload);
      if (missing.length > 0) {
        return res.status(400).json({
          message: `Please complete required fields: ${missing.join(", ")}`,
          missing,
        });
      }
    }

    const ownerPhoneInput = String(payload.ownerPhone || payload.phone || "").replace(/\D/g, "");
    const ownerEmail = String(payload.ownerEmail || payload.email || "").trim().toLowerCase();
    const ownerPhone = ownerPhoneInput || (status === "draft" && ownerEmail ? `draft-${ownerEmail}` : "");
    const lat = Number(payload.location?.lat);
    const lng = Number(payload.location?.lng);
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
    const addressParts = [
      payload.address?.shopNo,
      payload.address?.floor,
      payload.address?.area,
      payload.address?.city,
      payload.address?.landmark,
    ].filter(Boolean);
    const formattedAddress = payload.address?.formattedAddress || addressParts.join(", ");

    if (!ownerPhone) {
      return res.status(400).json({ message: "Owner phone number is required to save onboarding" });
    }

    const vendorData = {
      name: payload.restaurantName || "Draft restaurant",
      email: ownerEmail || undefined,
      phone: ownerPhone,
      googlePlaceId: payload.googlePlaceId,
      onboardingStatus: status,
      owner: {
        name: payload.ownerName,
        email: ownerEmail,
        phone: ownerPhoneInput || "",
        primaryContact: payload.primaryContact || ownerPhoneInput,
        otpVerified: payload.otpVerified && payload.otp === "1234",
      },
      location: {
        type: "Point",
        coordinates: hasLocation ? [lng, lat] : [0, 0],
      },
      address: formattedAddress || "Draft address",
      detailedAddress: {
        shopNo: payload.address?.shopNo,
        floor: payload.address?.floor,
        area: payload.address?.area,
        city: payload.address?.city,
        landmark: payload.address?.landmark,
        formattedAddress,
      },
      image: payload.image || "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500",
      categories: payload.cuisines || [],
      operations: {
        selectedDays: payload.selectedDays || [],
        timeSlots: payload.timeSlots || [],
        dayTimeSlots: payload.dayTimeSlots || {},
        menuSetupMode: payload.menuSetupMode || "manual",
        menuReferenceFileName: fileName(payload.menuReferenceFile),
        menuUploadValid: Boolean(payload.menuUploadValid),
        menuCategories: (payload.menuCategories || []).map((category: any) => ({
          name: category.name,
          items: (category.items || []).map((item: any) => ({
            name: item.name,
            price: item.price,
            description: item.description,
            isVeg: item.isVeg,
            isBestseller: item.isBestseller,
            photoFileName: fileName(item.photo),
          })),
        })),
      },
      legal: {
        panNumber: payload.panNumber,
        panFileName: fileName(payload.panFile),
        gstin: payload.gstin,
        gstFileName: fileName(payload.gstFile),
        gstExempt: Boolean(payload.gstExempt),
        fssaiNumber: payload.fssaiNumber,
        fssaiExpiry: payload.fssaiExpiry,
        fssaiFileName: fileName(payload.fssaiFile),
        bankAccount: payload.bankAccount,
        accountType: payload.accountType || "savings",
        ifsc: payload.ifsc,
        ifscVerified: Boolean(payload.ifscFetched),
        chequeFileName: fileName(payload.chequeFile),
      },
      contract: {
        acceptedTos: Boolean(payload.acceptedTos),
        signature: payload.signature,
        signedAt: status === "submitted" ? new Date() : undefined,
      },
    };

    const vendor = await Vendor.findOneAndUpdate(
      ownerEmail ? { $or: [{ phone: ownerPhone }, { email: ownerEmail }] } : { phone: ownerPhone },
      { $set: vendorData },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(status === "submitted" ? 201 : 200).json({
      message: status === "submitted" ? "Onboarding submitted successfully" : "Draft saved successfully",
      vendor,
    });
  } catch (error: any) {
    console.error("Error saving vendor onboarding:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Vendor with this email or phone already exists" });
    }
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
