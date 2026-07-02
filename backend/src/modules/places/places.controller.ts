import { Request, Response } from "express";

const GOOGLE_MAPS_APIKEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA";

const isFiniteCoordinate = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue);
};

const getFirstAddressPart = (address: string) => address.split(",")[0]?.trim() || address;

const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value;

const mapAutocompletePrediction = (p: any) => ({
  id: p.place_id,
  name: p.structured_formatting?.main_text || p.description,
  address: p.description,
  main_text: p.structured_formatting?.main_text,
  secondary_text: p.structured_formatting?.secondary_text,
  distance_meters: p.distance_meters,
  source: "places",
});

const mapGeocodeResult = (r: any) => ({
  id: r.place_id,
  name: r.address_components?.[0]?.long_name || getFirstAddressPart(r.formatted_address || ""),
  address: r.formatted_address || "",
  main_text: r.address_components?.[0]?.long_name || getFirstAddressPart(r.formatted_address || ""),
  secondary_text: (r.formatted_address || "").split(",").slice(1).join(",").trim(),
  lat: r.geometry?.location?.lat,
  lng: r.geometry?.location?.lng,
  source: "geocode",
});

const mapPhotonFeature = (feature: any) => {
  const props = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [];
  const addressParts = [
    props.name,
    props.street,
    props.locality,
    props.city,
    props.county,
    props.state,
    props.country,
  ].filter(Boolean);
  const address = Array.from(new Set(addressParts)).join(", ");

  return {
    id: `photon:${props.osm_type || "x"}:${props.osm_id || `${lat},${lng}`}`,
    name: props.name || getFirstAddressPart(address),
    address,
    main_text: props.name || getFirstAddressPart(address),
    secondary_text: addressParts.slice(1).join(", "),
    lat: Number(lat),
    lng: Number(lng),
    source: "photon",
  };
};

const getBoundsParam = (lat: unknown, lng: unknown, radius: unknown) => {
  if (!isFiniteCoordinate(lat) || !isFiniteCoordinate(lng)) return null;

  const latitude = Number(lat);
  const longitude = Number(lng);
  const radiusKm = Math.min(Math.max(Number(radius) || 10000, 1000), 50000) / 1000;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(Math.cos(latitude * Math.PI / 180), 0.2));

  return `${latitude - latDelta},${longitude - lngDelta}|${latitude + latDelta},${longitude + lngDelta}`;
};

export class PlacesController {
  static async getNearbyPlaces(req: Request, res: Response) {
    const { lat, lng, radius = 5000, type, keyword } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    try {
      const typeParam = type ? `&type=${type}` : "";
      const keywordParam = keyword ? `&keyword=${encodeURIComponent(keyword as string)}` : "";
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}${typeParam}${keywordParam}&key=${GOOGLE_MAPS_APIKEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("GOOGLE NEARBY ERROR:", data);
        return res.status(500).json({ message: "Error fetching from Google Places", status: data.status });
      }

      const places = (data.results || []).map((item: any) => ({
        id: item.place_id,
        name: item.name,
        address: item.vicinity || item.formatted_address,
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
        rating: item.rating,
        user_ratings_total: item.user_ratings_total,
        type: item.types?.[0] || 'place',
        open_now: item.opening_hours?.open_now,
        price_level: item.price_level,
        photo_reference: item.photos?.[0]?.photo_reference
      }));

      res.json(places);
    } catch (error) {
      console.error("Places API Error:", error);
      res.status(500).json({ message: "Internal server error fetching places" });
    }
  }


  static async getAutocompleteSuggestions(req: Request, res: Response) {
    const { input, lat, lng, radius = 10000 } = req.query;
    const radiusValue = firstQueryValue(radius) ?? 10000;

    const inputText = String(input || "").trim();
    if (!inputText) {
      return res.status(400).json({ message: "input query param is required" });
    }

    try {
      const autocompleteParams = new URLSearchParams({
        input: inputText,
        language: "en",
        components: "country:in",
        key: GOOGLE_MAPS_APIKEY,
      });
      if (isFiniteCoordinate(lat) && isFiniteCoordinate(lng)) {
        autocompleteParams.set("location", `${lat},${lng}`);
        autocompleteParams.set("radius", String(radiusValue));
        autocompleteParams.set("origin", `${lat},${lng}`);
      }

      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${autocompleteParams.toString()}`;
      const autocompleteResponse = await fetch(autocompleteUrl);
      const autocompleteData = await autocompleteResponse.json();

      if (autocompleteData.status === "OK") {
        return res.json((autocompleteData.predictions || []).map(mapAutocompletePrediction));
      }

      if (autocompleteData.status !== "ZERO_RESULTS") {
        console.warn("GOOGLE AUTOCOMPLETE ERROR:", {
          status: autocompleteData.status,
          error_message: autocompleteData.error_message,
        });
      }

      const geocodeParams = new URLSearchParams({
        address: inputText,
        components: "country:IN",
        key: GOOGLE_MAPS_APIKEY,
      });
      const bounds = getBoundsParam(lat, lng, radiusValue);
      if (bounds) {
        geocodeParams.set("bounds", bounds);
      }

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?${geocodeParams.toString()}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.status === "OK") {
        return res.json((geocodeData.results || []).slice(0, 8).map(mapGeocodeResult));
      }

      if (geocodeData.status !== "ZERO_RESULTS") {
        console.warn("GOOGLE GEOCODE FALLBACK ERROR:", {
          status: geocodeData.status,
          error_message: geocodeData.error_message,
        });
      }

      const photonParams = new URLSearchParams({
        q: `${inputText} India`,
        limit: "10",
        lang: "en",
      });
      if (isFiniteCoordinate(lat) && isFiniteCoordinate(lng)) {
        photonParams.set("lat", String(lat));
        photonParams.set("lon", String(lng));
      }

      const photonUrl = `https://photon.komoot.io/api/?${photonParams.toString()}`;
      const photonResponse = await fetch(photonUrl, {
        headers: { "User-Agent": "Project-X/1.0 address autocomplete" },
      });
      const photonData = await photonResponse.json();
      const photonSuggestions = (photonData.features || [])
        .map(mapPhotonFeature)
        .filter((item: any) => item.address && Number.isFinite(item.lat) && Number.isFinite(item.lng));
      const indianSuggestions = photonSuggestions.filter((item: any) => item.address.toLowerCase().includes("india"));

      return res.json((indianSuggestions.length > 0 ? indianSuggestions : photonSuggestions).slice(0, 8));
    } catch (error) {
      console.error("Autocomplete API Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getPlaceDetails(req: Request, res: Response) {
    const placeId = String(req.params.placeId || "");
    if (!placeId) {
      return res.status(400).json({ message: "placeId param is required" });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_APIKEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        return res.json({
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        });
      }

      console.warn("GOOGLE PLACE DETAILS ERROR:", { status: data.status, error_message: data.error_message });

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${GOOGLE_MAPS_APIKEY}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.status === "OK" && geocodeData.results?.[0]?.geometry?.location) {
        return res.json({
          lat: geocodeData.results[0].geometry.location.lat,
          lng: geocodeData.results[0].geometry.location.lng,
        });
      }

      return res.status(500).json({ message: "Error from Google Place Details", status: data.status });
    } catch (error) {
      console.error("Place Details API Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async reverseGeocode(req: Request, res: Response) {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_APIKEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("GOOGLE GEOCODE ERROR:", data);
        return res.status(500).json({ message: "Error from Google Geocoding", status: data.status, detail: data.error_message });
      }


      const results = (data.results || []).map((r: any) => ({
        address: r.formatted_address || r.vicinity || "Unknown location",
        placeId: r.place_id,
        raw: r // Temporary for debugging
      }));

      console.log(`Geocoded ${lat},${lng} to:`, results[0]?.address);
      res.json(results);
    } catch (error) {
      console.error("Geocoding API Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}


