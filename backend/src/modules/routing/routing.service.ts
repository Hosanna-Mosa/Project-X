import { getDistance } from "geolib";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface StopInput extends Coordinate {
  type: string;
  items?: any;
}

export class RoutingService {
  optimizeRoute(start: Coordinate, stops: StopInput[]) {
    let currentPos = start;
    const remainingStops = [...stops];
    const optimizedStops: StopInput[] = [];
    let totalDistance = 0;

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

      totalDistance += minDistance;
      const nearestStop = remainingStops.splice(nearestIndex, 1)[0];
      optimizedStops.push(nearestStop);
      currentPos = nearestStop;
    }

    // Convert distance from meters to km
    const distanceInKm = totalDistance / 1000;
    
    // Simple ETE estimate: 5 min per stop + 2 min per km
    const estimatedTimeInMin = (optimizedStops.length * 5) + (distanceInKm * 2);

    return {
      optimizedStops,
      totalDistance: distanceInKm,
      estimatedTime: estimatedTimeInMin,
    };
  }
}
