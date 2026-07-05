import mongoose from "mongoose";
import Zone, { IZone, ZoneType } from "../../database/models/Zone";
import Driver from "../../database/models/Driver";
import Order from "../../database/models/Order";

export class ZonesService {
  async createZone(data: any): Promise<IZone> {
    const { name, type, pricingMultiplier, isActive, center, radius, boundary, description, allowedServices, activeHours, autoSurgeEnabled } = data;

    const zoneData: any = {
      name,
      type,
      pricingMultiplier: Number(pricingMultiplier) || 1.0,
      isActive: isActive !== undefined ? isActive : true,
      description,
      allowedServices: allowedServices || [],
      activeHours,
      autoSurgeEnabled: autoSurgeEnabled !== undefined ? autoSurgeEnabled : false,
    };

    if (type === ZoneType.CIRCLE) {
      if (!center || !center.coordinates || center.coordinates.length !== 2) {
        throw new Error("Circle type requires center coordinates [longitude, latitude]");
      }
      if (radius === undefined || radius <= 0) {
        throw new Error("Circle type requires a positive radius in meters");
      }
      zoneData.center = {
        type: "Point",
        coordinates: [Number(center.coordinates[0]), Number(center.coordinates[1])],
      };
      zoneData.radius = Number(radius);
    } else if (type === ZoneType.POLYGON) {
      if (!boundary || !boundary.coordinates || !Array.isArray(boundary.coordinates)) {
        throw new Error("Polygon type requires boundary coordinates");
      }
      zoneData.boundary = {
        type: "Polygon",
        coordinates: boundary.coordinates,
      };
    } else {
      throw new Error(`Unsupported zone type: ${type}`);
    }

    const zone = new Zone(zoneData);
    return await zone.save();
  }

  async getZones(): Promise<any[]> {
    const zones = await Zone.find().sort({ createdAt: -1 });
    const populated = [];
    for (const z of zones) {
      const zoneObj = z.toObject();
      const currentSurge = await this.calculateDynamicSurge(z);
      const details = await this.getZoneSupplyDemandDetails(z);
      populated.push({
        ...zoneObj,
        currentSurge,
        supplyCount: details.supplyCount,
        demandCount: details.demandCount,
      });
    }
    return populated;
  }

  async getZoneById(id: string): Promise<IZone | null> {
    return await Zone.findById(id);
  }

  async updateZone(id: string, data: any): Promise<IZone | null> {
    const zone = await Zone.findById(id);
    if (!zone) throw new Error("Zone not found");

    const { name, type, pricingMultiplier, isActive, center, radius, boundary, description, allowedServices, activeHours, autoSurgeEnabled } = data;

    if (name !== undefined) zone.name = name;
    if (pricingMultiplier !== undefined) zone.pricingMultiplier = Number(pricingMultiplier) || 1.0;
    if (isActive !== undefined) zone.isActive = isActive;
    if (description !== undefined) zone.description = description;
    if (allowedServices !== undefined) zone.allowedServices = allowedServices;
    if (activeHours !== undefined) zone.activeHours = activeHours;
    if (autoSurgeEnabled !== undefined) zone.autoSurgeEnabled = autoSurgeEnabled;

    if (type !== undefined && type !== zone.type) {
      zone.type = type;
      if (type === ZoneType.CIRCLE) {
        zone.boundary = undefined;
      } else {
        zone.center = undefined;
        zone.radius = undefined;
      }
    }

    if (zone.type === ZoneType.CIRCLE) {
      if (center && center.coordinates && center.coordinates.length === 2) {
        zone.center = {
          type: "Point",
          coordinates: [Number(center.coordinates[0]), Number(center.coordinates[1])],
        };
      }
      if (radius !== undefined) zone.radius = Number(radius);
    } else if (zone.type === ZoneType.POLYGON) {
      if (boundary && boundary.coordinates && Array.isArray(boundary.coordinates)) {
        zone.boundary = {
          type: "Polygon",
          coordinates: boundary.coordinates,
        };
      }
    }

    return await zone.save();
  }

  async deleteZone(id: string): Promise<boolean> {
    const result = await Zone.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Find an active zone containing the given coordinates.
   * Checks polygons via MongoDB spatial queries first, then falls back to circular zones.
   */
  async getZoneForCoordinates(latitude: number, longitude: number, serviceType?: string): Promise<IZone | null> {
    // 1. Check active polygon zones using $geoIntersects
    try {
      const polygonZones = await Zone.find({
        type: ZoneType.POLYGON,
        isActive: true,
        boundary: {
          $geoIntersects: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
          },
        },
      });

      for (const zone of polygonZones) {
        if (this.isWithinActiveHours(zone) && this.isServiceAllowed(zone, serviceType)) {
          if (zone.autoSurgeEnabled) {
            zone.pricingMultiplier = await this.calculateDynamicSurge(zone);
          }
          return zone;
        }
      }
    } catch (err: any) {
      console.error("Polygon zone check failed:", err.message);
    }

    // 2. Check active circular zones by retrieving them and calculating distances
    const circularZones = await Zone.find({
      type: ZoneType.CIRCLE,
      isActive: true,
    });

    for (const zone of circularZones) {
      if (zone.center && zone.center.coordinates && zone.radius) {
        const [zoneLng, zoneLat] = zone.center.coordinates;
        const distanceInMeters = this.haversineDistanceInMeters(latitude, longitude, zoneLat, zoneLng);
        if (distanceInMeters <= zone.radius) {
          if (this.isWithinActiveHours(zone) && this.isServiceAllowed(zone, serviceType)) {
            if (zone.autoSurgeEnabled) {
              zone.pricingMultiplier = await this.calculateDynamicSurge(zone);
            }
            return zone;
          }
        }
      }
    }

    return null;
  }

  isWithinActiveHours(zone: IZone): boolean {
    if (!zone.activeHours || !zone.activeHours.start || !zone.activeHours.end) {
      return true; // No time restrictions, always active
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = zone.activeHours.start.split(":").map(Number);
    const [endH, endM] = zone.activeHours.end.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnights (e.g. 22:00 to 04:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  isServiceAllowed(zone: IZone, serviceType?: string): boolean {
    if (!zone.allowedServices || zone.allowedServices.length === 0) {
      return true; // Allowed for all services
    }
    if (!serviceType) {
      return true; // If no service type passed, default to allow
    }
    
    // Support lowercase matching
    const target = serviceType.toLowerCase();
    return zone.allowedServices.some(s => s.toLowerCase() === target);
  }

  private haversineDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * (Math.PI / 180);
    const phi2 = lat2 * (Math.PI / 180);
    const deltaPhi = (lat2 - lat1) * (Math.PI / 180);
    const deltaLambda = (lng2 - lng1) * (Math.PI / 180);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  }

  async getZoneSupplyDemandDetails(zone: any) {
    const activeStatuses = ["CREATED", "SEARCHING_DRIVER", "confirmed", "driver_assigned", "en_route_pickup", "arrived_pickup"];
    let supplyCount = 0;
    let demandCount = 0;
    try {
      if (zone.type === "polygon" && zone.boundary) {
        supplyCount = await mongoose.model("Driver").countDocuments({
          status: "ONLINE",
          currentLocation: {
            $geoWithin: {
              $geometry: zone.boundary
            }
          }
        });

        demandCount = await mongoose.model("Order").countDocuments({
          status: { $in: activeStatuses },
          "stops.0.location": {
            $geoWithin: {
              $geometry: zone.boundary
            }
          }
        });
      } else if (zone.type === "circle" && zone.center && zone.radius) {
        supplyCount = await mongoose.model("Driver").countDocuments({
          status: "ONLINE",
          currentLocation: {
            $near: {
              $geometry: zone.center,
              $maxDistance: zone.radius
            }
          }
        });

        demandCount = await mongoose.model("Order").countDocuments({
          status: { $in: activeStatuses },
          "stops.0.location": {
            $near: {
              $geometry: zone.center,
              $maxDistance: zone.radius
            }
          }
        });
      }
    } catch (err) {
      console.error("Error getting supply demand details:", err);
    }
    return { supplyCount, demandCount };
  }

  async calculateDynamicSurge(zone: any): Promise<number> {
    if (!zone.autoSurgeEnabled) {
      return zone.pricingMultiplier;
    }
    const { supplyCount, demandCount } = await this.getZoneSupplyDemandDetails(zone);
    let multiplier = zone.pricingMultiplier;
    if (supplyCount === 0 && demandCount > 0) {
      multiplier = zone.pricingMultiplier + 1.0;
    } else if (supplyCount > 0) {
      const ratio = demandCount / supplyCount;
      if (ratio > 1.2) {
        multiplier = zone.pricingMultiplier + (ratio - 1.2) * 0.4;
      }
    }
    return Math.min(3.0, Math.max(1.0, Number(multiplier.toFixed(2))));
  }
}
