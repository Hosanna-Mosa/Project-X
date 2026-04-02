import { getDistance } from "geolib";

const GOOGLE_MAPS_APIKEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface StopInput extends Coordinate {
  id: string;
  address: string;
  type?: string;
  items?: any;
}

export class RoutingService {
  async optimizeAndGetRoute(origin: Coordinate, stops: StopInput[]) {
    if (stops.length === 0) return null;

    // 1. Greedy TSP to find optimized sequence
    let currentPos = origin;
    const remainingStops = [...stops];
    const optimizedSequence: StopInput[] = [];
    let totalDirectDistance = 0;

    while (remainingStops.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remainingStops.length; i++) {
        const dist = getDistance(
          { latitude: currentPos.latitude, longitude: currentPos.longitude },
          { latitude: remainingStops[i].latitude, longitude: remainingStops[i].longitude }
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      totalDirectDistance += minDistance;
      const nearestStop = remainingStops.splice(nearestIndex, 1)[0];
      optimizedSequence.push(nearestStop);
      currentPos = nearestStop;
    }

    // 2. Fetch Polyline from Google Directions API
    // Waypoints for the URL (all optimized stops except origin)
    const waypoints = optimizedSequence.map(s => `${s.latitude},${s.longitude}`).join('|');
    const destination = `${optimizedSequence[optimizedSequence.length - 1].latitude},${optimizedSequence[optimizedSequence.length - 1].longitude}`;
    
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination}&waypoints=${waypoints}&key=${GOOGLE_MAPS_APIKEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        console.log("Routing Service: Successfully fetched route from Google Directions API.");
        const route = data.routes[0];
        const polyline = route.overview_polyline.points;
        const totalDistance = route.legs.reduce((acc: number, leg: any) => acc + leg.distance.value, 0) / 1000;
        const estimatedTime = route.legs.reduce((acc: number, leg: any) => acc + leg.duration.value, 300) / 60; // in minutes

        return {
          optimizedStops: optimizedSequence,
          polyline,
          totalDistance: Math.round(totalDistance * 10) / 10,
          estimatedTime: Math.round(estimatedTime),
        };
      } else {
        console.warn("Google Directions API status:", data.status, data.error_message);
      }
    } catch (error) {
      console.error("Routing Service Error:", error);
    }

    // Fallback: Generate a simple encoded polyline from optimizedSequence
    console.warn("Routing Service: Using straight-line fallback polyline.");
    const fallbackPolyline = encodePolyline([
      { latitude: origin.latitude, longitude: origin.longitude },
      ...optimizedSequence
    ]);

    return {
      optimizedStops: optimizedSequence,
      polyline: fallbackPolyline,
      totalDistance: Math.round(totalDirectDistance / 100) / 10,
      estimatedTime: Math.round(totalDirectDistance / 400),
    };
  }
}

// Simple internal encoder for fallback routes
function encodePolyline(points: Coordinate[]) {
  const encodeValue = (value: number) => {
    let encrypted = Math.round(value * 1e5);
    encrypted <<= 1;
    if (encrypted < 0) encrypted = ~encrypted;
    let res = '';
    while (encrypted >= 0x20) {
      res += String.fromCharCode((0x20 | (encrypted & 0x1f)) + 63);
      encrypted >>= 5;
    }
    res += String.fromCharCode(encrypted + 63);
    return res;
  };

  let res = '';
  let oldLat = 0, oldLng = 0;
  for (const p of points) {
    res += encodeValue(p.latitude - oldLat / 1e5);
    res += encodeValue(p.longitude - oldLng / 1e5);
    oldLat = Math.round(p.latitude * 1e5);
    oldLng = Math.round(p.longitude * 1e5);
  }
  return res;
}
