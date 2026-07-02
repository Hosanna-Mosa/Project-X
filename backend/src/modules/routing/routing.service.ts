import { getDistance } from "geolib";
import { performance } from "perf_hooks";

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
  instructions?: any;
  deliveryAddress?: any;
}

export class RoutingService {
  async optimizeAndGetRoute(origin: Coordinate, stops: StopInput[]) {
    if (stops.length === 0) return null;

    const startTime = performance.now();
    // Choose the best algorithm based on input size
    let optimizedSequence: StopInput[];
    let algoName = "";
    if (stops.length <= 12) {
      algoName = "Held-Karp DP";
      optimizedSequence = solveHeldKarp(origin, stops);
    } else {
      algoName = "2-Opt Local Search";
      optimizedSequence = solve2Opt(origin, stops);
    }
    const endTime = performance.now();
    console.log(`Routing Service: ${algoName} optimized ${stops.length} stops in ${(endTime - startTime).toFixed(4)}ms.`);

    // Calculate total direct straight-line distance
    let totalDirectDistance = getDistanceBetween(origin, optimizedSequence[0]);
    for (let i = 0; i < optimizedSequence.length - 1; i++) {
      totalDirectDistance += getDistanceBetween(optimizedSequence[i], optimizedSequence[i + 1]);
    }

    // 2. Fetch Polyline from Google Directions API
    // The final optimized stop is the destination, so only intermediate stops
    // belong in the waypoints list.
    const waypointStops = optimizedSequence.slice(0, -1);
    const waypoints = waypointStops.map(s => `${s.latitude},${s.longitude}`).join('|');
    const destination = `${optimizedSequence[optimizedSequence.length - 1].latitude},${optimizedSequence[optimizedSequence.length - 1].longitude}`;

    try {
      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination,
        mode: "driving",
        key: GOOGLE_MAPS_APIKEY,
      });
      if (waypoints) {
        params.set("waypoints", waypoints);
      }
      const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
      
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
          routeSource: "google",
        };
      } else {
        console.warn("Google Directions API status:", data.status, data.error_message);
      }
    } catch (error) {
      console.error("Routing Service Error:", error);
    }

    try {
      const osrmResult = await fetchOsrmRoute([
        { latitude: origin.latitude, longitude: origin.longitude },
        ...optimizedSequence,
      ]);

      if (osrmResult) {
        console.log("Routing Service: Successfully fetched route from OSRM.");
        return {
          optimizedStops: optimizedSequence,
          polyline: osrmResult.polyline,
          totalDistance: Math.round(osrmResult.totalDistance * 10) / 10,
          estimatedTime: Math.round(osrmResult.estimatedTime),
          routeSource: "osrm",
        };
      }
    } catch (error) {
      console.error("OSRM Routing Service Error:", error);
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
      routeSource: "fallback",
    };
  }
}

async function fetchOsrmRoute(points: Coordinate[]) {
  if (points.length < 2) return null;

  const coordinates = points.map((point) => `${point.longitude},${point.latitude}`).join(";");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "polyline",
    steps: "false",
  });
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== "Ok" || !data.routes?.[0]?.geometry) {
    console.warn("OSRM status:", data.code, data.message);
    return null;
  }

  const route = data.routes[0];
  return {
    polyline: route.geometry,
    totalDistance: Number(route.distance || 0) / 1000,
    estimatedTime: Number(route.duration || 0) / 60,
  };
}

// Helper to compute geographic distance between two coordinates
function getDistanceBetween(c1: Coordinate, c2: Coordinate): number {
  return getDistance(
    { latitude: c1.latitude, longitude: c1.longitude },
    { latitude: c2.latitude, longitude: c2.longitude }
  );
}

// Held-Karp Dynamic Programming Solver for exact open-loop TSP (N <= 12)
function solveHeldKarp(origin: Coordinate, stops: StopInput[]): StopInput[] {
  const n = stops.length;
  if (n === 0) return [];
  if (n === 1) return [stops[0]];

  // 1. Precompute distance matrix
  const distMatrix = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distMatrix[i][j] = 0;
      } else {
        distMatrix[i][j] = getDistanceBetween(stops[i], stops[j]);
      }
    }
  }

  // distToOrigin[i] is distance from origin to stops[i]
  const distToOrigin = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    distToOrigin[i] = getDistanceBetween(origin, stops[i]);
  }

  const numStates = 1 << n;
  // memo[mask][i] stores the min distance to visit subset 'mask' of stops, ending at stop i.
  const memo: number[][] = Array.from({ length: numStates }, () => new Array(n).fill(Infinity));
  // parent[mask][i] stores the index of the stop visited immediately before stop i.
  const parent: number[][] = Array.from({ length: numStates }, () => new Array(n).fill(-1));

  // Base cases: paths starting from origin to stop i
  for (let i = 0; i < n; i++) {
    memo[1 << i][i] = distToOrigin[i];
  }

  // DP transitions
  for (let mask = 1; mask < numStates; mask++) {
    for (let u = 0; u < n; u++) {
      if ((mask & (1 << u)) === 0) continue;
      const currentDist = memo[mask][u];
      if (currentDist === Infinity) continue;

      for (let v = 0; v < n; v++) {
        if ((mask & (1 << v)) !== 0) continue; // v is already visited in mask

        const nextMask = mask | (1 << v);
        const newDist = currentDist + distMatrix[u][v];
        if (newDist < memo[nextMask][v]) {
          memo[nextMask][v] = newDist;
          parent[nextMask][v] = u;
        }
      }
    }
  }

  // Find the end stop that minimizes the total distance
  let minCost = Infinity;
  let lastIndex = -1;
  const fullMask = numStates - 1;
  for (let i = 0; i < n; i++) {
    if (memo[fullMask][i] < minCost) {
      minCost = memo[fullMask][i];
      lastIndex = i;
    }
  }

  // Reconstruct optimal path backwards
  const path: StopInput[] = [];
  let currMask = fullMask;
  let currIndex = lastIndex;

  while (currIndex !== -1) {
    path.push(stops[currIndex]);
    const prev = parent[currMask][currIndex];
    currMask ^= (1 << currIndex);
    currIndex = prev;
  }

  return path.reverse();
}

// 2-Opt Local Search Solver for open-loop TSP (N > 12)
function solve2Opt(origin: Coordinate, stops: StopInput[]): StopInput[] {
  const n = stops.length;
  if (n === 0) return [];
  if (n === 1) return [stops[0]];

  // Start with a Greedy Nearest Neighbor route
  let currentPos = origin;
  const remainingStops = [...stops];
  let route: StopInput[] = [];

  while (remainingStops.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remainingStops.length; i++) {
      const dist = getDistanceBetween(currentPos, remainingStops[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nearestStop = remainingStops.splice(nearestIndex, 1)[0];
    route.push(nearestStop);
    currentPos = nearestStop;
  }

  // Iteratively improve using 2-Opt swaps
  let improved = true;
  let iterations = 0;
  const maxIterations = 1000;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        let delta = 0;

        // Connection before/at the start of reversed segment
        if (i > 0) {
          delta += getDistanceBetween(route[i - 1], route[j]) - getDistanceBetween(route[i - 1], route[i]);
        } else {
          delta += getDistanceBetween(origin, route[j]) - getDistanceBetween(origin, route[0]);
        }

        // Connection after/at the end of reversed segment
        if (j < n - 1) {
          delta += getDistanceBetween(route[i], route[j + 1]) - getDistanceBetween(route[j], route[j + 1]);
        }

        // If total distance is reduced, perform the swap
        if (delta < -1e-5) {
          route = [
            ...route.slice(0, i),
            ...route.slice(i, j + 1).reverse(),
            ...route.slice(j + 1)
          ];
          improved = true;
          break; // restart outer loops immediately (First Improvement)
        }
      }
      if (improved) break;
    }
  }

  return route;
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
