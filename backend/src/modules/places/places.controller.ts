import { Request, Response } from "express";

const GOOGLE_MAPS_APIKEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA";

export class PlacesController {
  static async getNearbyPlaces(req: Request, res: Response) {
    const { lat, lng, radius = 2000, type = "restaurant" } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_APIKEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return res.status(500).json({ message: "Error fetching from Google Places", status: data.status });
      }

      const places = (data.results || []).map((item: any) => ({
        id: item.place_id,
        name: item.name,
        address: item.vicinity,
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
        rating: item.rating,
        type: item.types?.[0] || 'place'
      }));

      res.json(places);
    } catch (error) {
      console.error("Places API Error:", error);
      res.status(500).json({ message: "Internal server error fetching places" });
    }
  }

  static async getAutocompleteSuggestions(req: Request, res: Response) {
    const { input, lat, lng, radius = 10000 } = req.query;

    if (!input) {
      return res.status(400).json({ message: "input query param is required" });
    }

    try {
      // locationbias=circle enforces strict proximity ranking
      const locationBias = lat && lng
        ? `&locationbias=circle:${radius}@${lat},${lng}`
        : "";

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input as string)}${locationBias}&language=en&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return res.status(500).json({ message: "Error from Google Autocomplete", status: data.status });
      }

      const results = (data.predictions || []).map((p: any) => ({
        id: p.place_id,
        name: p.structured_formatting?.main_text || p.description,
        address: p.description,
        main_text: p.structured_formatting?.main_text,
        secondary_text: p.structured_formatting?.secondary_text,
      }));

      res.json(results);
    } catch (error) {
      console.error("Autocomplete API Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getPlaceDetails(req: Request, res: Response) {
    const { placeId } = req.params;
    if (!placeId) {
      return res.status(400).json({ message: "placeId param is required" });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_APIKEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK") {
        return res.status(500).json({ message: "Error from Google Place Details", status: data.status });
      }

      res.json({
        lat: data.result.geometry.location.lat,
        lng: data.result.geometry.location.lng,
      });
    } catch (error) {
      console.error("Place Details API Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

