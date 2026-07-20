import mongoose from "mongoose";
import Driver, { DriverStatus } from "../../database/models/Driver";
import Order, { OrderStatus, StopType } from "../../database/models/Order";
import DriverPayout, { DriverPayoutStatus } from "../../database/models/DriverPayout";
import User from "../../database/models/User";
import { PaymentService } from "../payments/payment.service";
import { SocketManager } from "../../sockets/socket.manager";
import { ZonesService } from "../zones/zones.service";

export interface HighDemandArea {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  orderCount: number;
  surgeMultiplier: number;
  surge: string;
}

export class DriverService {
  private paymentService = new PaymentService();

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

  async getNearbyDrivers(lat: number, lng: number, radiusInMeters: number = 5000, vehicleType?: string) {
    const socketManager = SocketManager.getInstance();
    const redisClient = socketManager ? (socketManager as any).redisClient : null;

    console.log(`[DRIVER SEARCH] Query coordinates: [lng: ${lng}, lat: ${lat}] with radius: ${radiusInMeters}m, vehicleType: ${vehicleType}`);

    // Zone Serviceability Check
    const zonesService = new ZonesService();
    const activeZone = await zonesService.getZoneForCoordinates(lat, lng);
    if (!activeZone) {
      console.log(`[DRIVER SEARCH] Coordinates [lat: ${lat}, lng: ${lng}] are outside all active zones. Returning 0 drivers.`);
      return [];
    }
    const zoneId = activeZone._id;

    try {
      const allOnlineDrivers = await Driver.find({ status: DriverStatus.ONLINE });
      console.log(`[DRIVER SEARCH DB] Total Online Drivers in DB: ${allOnlineDrivers.length}`);
      allOnlineDrivers.forEach(d => {
        console.log(` -> Driver ID: ${d._id}, vehicleType: ${d.vehicleType}, status: ${d.status}, isAvailable: ${d.isAvailable}, preferredZone: ${d.preferredZone}, coordinates: ${JSON.stringify(d.currentLocation?.coordinates)}`);
      });
    } catch (err: any) {
      console.error("[DRIVER SEARCH DB] Error querying online drivers for logging:", err.message);
    }

    // For development/testing: Ensure we have at least 2 drivers of each vehicle type in the database
    if (process.env.DISABLE_DRIVER_SIMULATOR !== "true") {
      const allTypes = ["bike", "auto", "car"];
      for (const t of allTypes) {
        const totalOfType = await Driver.countDocuments({ vehicleType: t });
        if (totalOfType < 2) {
          const driverToConvert = await Driver.findOne({
            $or: [
              { vehicleType: { $exists: false } },
              { vehicleType: null },
              { vehicleType: "bike", status: DriverStatus.OFFLINE }
            ]
          });
          if (driverToConvert) {
            driverToConvert.vehicleType = t as "bike" | "auto" | "car";
            await driverToConvert.save();
            console.log(`[SIMULATOR] Converted driver ${driverToConvert._id} vehicleType to ${t}`);
          }
        }
      }

      // Ensure we have online drivers of the requested vehicle type near the user.
      const typesToEnsure = vehicleType ? [vehicleType] : ["bike", "auto", "car"];
      for (const type of typesToEnsure) {
        const activeCount = await Driver.countDocuments({
          status: DriverStatus.ONLINE,
          vehicleType: type,
        });

        if (activeCount < 2) {
          const driversToActivate = await Driver.find({
            vehicleType: type,
            status: DriverStatus.OFFLINE
          }).limit(2 - activeCount);

          for (const d of driversToActivate) {
            d.status = DriverStatus.ONLINE;
            d.isAvailable = true;
            await d.save();
            console.log(`[SIMULATOR] Set driver ${d._id} (${type}) to ONLINE`);
          }
        }

        const onlineDrivers = await Driver.find({
          status: DriverStatus.ONLINE,
          vehicleType: type
        });

        for (const d of onlineDrivers) {
          const coords = d.currentLocation?.coordinates;
          const isFar = coords ? this.haversineDistance(lat, lng, coords[1], coords[0]) > radiusInMeters : true;
          
          // Simulator auto-assign logic: Auto-simulate only for Rajahmundry zones
          const isAutoSimulatedZone = activeZone.name.toLowerCase().includes("533101") ||
                                      activeZone.name.toLowerCase().includes("rajahmundry") ||
                                      activeZone.name.toLowerCase().includes("demo") ||
                                      activeZone.name.toLowerCase().includes("palacharla");
                                      
          const needsZoneUpdate = isAutoSimulatedZone && String(d.preferredZone) !== String(zoneId);

          if (!coords || (coords[0] === 0 && coords[1] === 0) || isFar || needsZoneUpdate) {
            const randomLatOffset = (Math.random() - 0.5) * 0.03;
            const randomLngOffset = (Math.random() - 0.5) * 0.03;
            const finalLng = lng + randomLngOffset;
            const finalLat = lat + randomLatOffset;
            
            d.currentLocation = {
              type: "Point",
              coordinates: [finalLng, finalLat]
            };
            
            if (isAutoSimulatedZone) {
              d.preferredZone = activeZone._id;
            }
            
            await d.save();
            console.log(`[SIMULATOR] Moved online driver ${d._id} (${type}) to [${finalLng}, ${finalLat}] (Zone: ${activeZone.name})`);

            // Sync simulator locations to Redis geospatial store
            if (redisClient) {
              try {
                await redisClient.geoAdd("drivers:locations", {
                  longitude: finalLng,
                  latitude: finalLat,
                  member: d._id.toString()
                });
                await redisClient.set(`driver_status:${d._id}`, "online", { EX: 30 });
              } catch (err: any) {
                console.error(`[SIMULATOR REDIS] geoAdd failed:`, err.message);
              }
            }
          }
        }
      }
    }

    let results: any[] = [];

    // Attempt Geospatial lookup in Redis first
    if (redisClient) {
      try {
        console.log(`[REDIS] Querying nearby drivers within ${radiusInMeters}m of [${lng}, ${lat}] in Zone: ${activeZone.name}`);
        const nearbyDriverIds = await redisClient.geoSearch("drivers:locations",
          { longitude: lng, latitude: lat },
          { radius: radiusInMeters, unit: "m" }
        );

        if (nearbyDriverIds && nearbyDriverIds.length > 0) {
          const query: any = {
            _id: { $in: nearbyDriverIds },
            status: DriverStatus.ONLINE,
            isAvailable: true,
            preferredZone: activeZone._id, // Filter strictly by activeZone
          };
          if (vehicleType && ["bike", "auto", "car"].includes(vehicleType)) {
            query.vehicleType = vehicleType;
          }
          const drivers = await Driver.find(query).populate("user");

          // Keep distance order as returned by Redis geoSearch
          const driverMap = new Map(drivers.map((d: any) => [d._id.toString(), d]));
          results = nearbyDriverIds
            .map((id: any) => driverMap.get(id))
            .filter(Boolean);

          console.log(`[REDIS] Found ${results.length} matching drivers near coordinates`);
        }
      } catch (err: any) {
        console.warn(`[REDIS] geoSearch lookup failed, falling back to MongoDB:`, err.message);
      }
    }

    if (results.length === 0) {
      // MongoDB Fallback Proximity Query
      const query: any = {
        status: DriverStatus.ONLINE,
        isAvailable: true,
        preferredZone: activeZone._id, // Filter strictly by activeZone
        currentLocation: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            $maxDistance: radiusInMeters,
          },
        },
      };

      if (vehicleType && ["bike", "auto", "car"].includes(vehicleType)) {
        query.vehicleType = vehicleType;
      }

      results = await Driver.find(query).populate("user");
    }

    // Force include online dev drivers (check1 to check10) for testing
    try {
      const devUsers = await User.find({ name: /^check\d+$/i });
      const devUserIds = devUsers.map(u => u._id);
      const devDriversQuery: any = {
        user: { $in: devUserIds },
        status: DriverStatus.ONLINE
      };
      if (vehicleType && ["bike", "auto", "car"].includes(vehicleType)) {
        devDriversQuery.vehicleType = vehicleType;
      }
      const devDrivers = await Driver.find(devDriversQuery).populate("user");
      for (const dd of devDrivers) {
        if (!results.some(d => d._id.toString() === dd._id.toString())) {
          results.push(dd);
        }
      }
    } catch (devErr) {
      console.warn("[DEV DRIVERS SEARCH FETCH] Error loading dev drivers:", devErr);
    }

    console.log(`[DRIVER SEARCH RESULTS] Total: ${results.length}, vehicleType: ${vehicleType}`);
    results.forEach((d) => {
      console.log(` -> ID: ${d._id}, Name: ${d.user?.name}, Phone: ${d.user?.phone}, status: ${d.status}, vehicleType: ${d.vehicleType}, coords: ${JSON.stringify(d.currentLocation?.coordinates)}`);
    });

    return results;
  }

  async updateLocation(driverId: string, lat: number, lng: number) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error("Driver not found");

    driver.currentLocation = {
      type: "Point",
      coordinates: [lng, lat],
    };

    try {
      const { ZonesService } = require("../zones/zones.service");
      const zonesService = new ZonesService();
      const activeZone = await zonesService.getZoneForCoordinates(lat, lng);
      if (activeZone) {
        driver.preferredZone = activeZone._id;
      }
    } catch (zoneErr) {
      console.warn("[HTTP LOCATION UPDATE] Error resolving zone for driver:", zoneErr);
    }

    return driver.save();
  }

  async updateStatus(driverId: string, status: DriverStatus) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error("Driver not found");

    driver.status = status;
    if (status === DriverStatus.ONLINE) {
      driver.isAvailable = true;
    }
    return driver.save();
  }

  async updateHomeMode(driverId: string, homeMode: boolean) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error("Driver not found");

    driver.homeMode = homeMode;
    return driver.save();
  }

  async isOrderOnTheWayToHome(driverId: string, orderPickupCoords: number[], orderDropoffCoords: number[]): Promise<boolean> {
    const driver = await Driver.findById(driverId).populate("user");
    if (!driver || !driver.user) return false;

    const user = driver.user as any;
    const homeAddress = user.addresses?.find(
      (addr: any) => addr.label && addr.label.trim().toLowerCase() === "home"
    );

    if (!homeAddress || !homeAddress.location?.coordinates || homeAddress.location.coordinates.length < 2) {
      return false;
    }

    const driverCoords = driver.currentLocation?.coordinates;
    if (!driverCoords || driverCoords.length < 2) return false;

    const driverLng = driverCoords[0];
    const driverLat = driverCoords[1];
    const homeLng = homeAddress.location.coordinates[0];
    const homeLat = homeAddress.location.coordinates[1];
    const pickupLng = orderPickupCoords[0];
    const pickupLat = orderPickupCoords[1];
    const dropoffLng = orderDropoffCoords[0];
    const dropoffLat = orderDropoffCoords[1];

    const d_h = this.haversineDistance(driverLat, driverLng, homeLat, homeLng);
    const d_p = this.haversineDistance(driverLat, driverLng, pickupLat, pickupLng);
    const p_d = this.haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const drop_h = this.haversineDistance(dropoffLat, dropoffLng, homeLat, homeLng);

    const fs = require("fs");
    const path = require("path");
    const logPath = path.join(__dirname, "../../../debug.log");
    fs.appendFileSync(logPath, `[DETOUR CHECK] Driver: ${driverId}\n` +
      `  Driver: [${driverLng}, ${driverLat}]\n` +
      `  Home: [${homeLng}, ${homeLat}]\n` +
      `  Pickup: [${pickupLng}, ${pickupLat}]\n` +
      `  Dropoff: [${dropoffLng}, ${dropoffLat}]\n` +
      `  Distances: d_h = ${d_h.toFixed(1)}m, d_p = ${d_p.toFixed(1)}m, p_d = ${p_d.toFixed(1)}m, drop_h = ${drop_h.toFixed(1)}m\n`);

    if (d_h < 3000) {
      fs.appendFileSync(logPath, `  -> MATCHED: Driver is already within 3km of home.\n`);
      return true;
    }

    if (drop_h >= d_h) {
      fs.appendFileSync(logPath, `  -> FILTERED OUT: Dropoff is further from home than driver starting point (drop_h: ${drop_h.toFixed(1)}m >= d_h: ${d_h.toFixed(1)}m)\n`);
      return false;
    }

    const detourOverhead = (d_p + p_d + drop_h) - d_h;
    const maxAllowedDetour = Math.max(10000, 0.3 * d_h);
    const result = detourOverhead <= maxAllowedDetour;
    fs.appendFileSync(logPath, `  -> Detour overhead: ${detourOverhead.toFixed(1)}m, Max allowed detour: ${maxAllowedDetour.toFixed(1)}m. Result: ${result}\n`);
    return result;
  }

  async getHighDemandAreas(limit: number = 6): Promise<HighDemandArea[]> {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const activeDemandStatuses = [
      OrderStatus.CREATED,
      OrderStatus.SEARCHING_DRIVER,
      OrderStatus.CONFIRMED,
    ];

    const areas = await Order.aggregate<{
      _id: string;
      address: string;
      lat: number;
      lng: number;
      orderCount: number;
    }>([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: activeDemandStatuses },
        },
      },
      { $unwind: "$stops" },
      {
        $match: {
          "stops.type": { $in: [StopType.PICKUP, StopType.DROP] },
          "stops.address": { $type: "string", $ne: "" },
          "stops.location.coordinates.0": { $type: "number" },
          "stops.location.coordinates.1": { $type: "number" },
        },
      },
      {
        $addFields: {
          areaName: {
            $trim: {
              input: {
                $arrayElemAt: [{ $split: ["$stops.address", ","] }, 0],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: { $toLower: "$areaName" },
          address: { $first: "$stops.address" },
          lat: { $avg: { $arrayElemAt: ["$stops.location.coordinates", 1] } },
          lng: { $avg: { $arrayElemAt: ["$stops.location.coordinates", 0] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: Math.max(1, Math.min(limit, 10)) },
    ]);

    return areas.map((area, index) => {
      const surgeMultiplier = Math.min(2, 1 + area.orderCount * 0.1);

      return {
        id: `${area._id}-${index}`,
        name: this.getAreaName(area.address),
        address: area.address,
        lat: Number(area.lat.toFixed(6)),
        lng: Number(area.lng.toFixed(6)),
        orderCount: area.orderCount,
        surgeMultiplier,
        surge: `${surgeMultiplier.toFixed(1)}x Surge`,
      };
    });
  }

  private getAreaName(address: string) {
    return address
      .split(",")[0]
      .replace(/\s+/g, " ")
      .trim();
  }

  async getProfile(userId: string) {
    const [user, driver] = await Promise.all([
      User.findById(userId).lean(),
      Driver.findOne({ user: userId }).lean(),
    ]);

    if (!user) throw new Error("User not found");

    const completedTrips = driver
      ? await Order.countDocuments({
          driver: driver._id,
          status: { $in: this.completedStatuses() },
        })
      : 0;

    return {
      account: {
        id: user._id.toString(),
        name: user.name,
        username: user.username || null,
        email: user.email || null,
        phone: user.phone,
        profilePic: user.profilePic || null,
        role: user.role,
        defaultLocation: user.defaultLocation || null,
        addresses: user.addresses || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      driver: driver
        ? {
            id: driver._id.toString(),
            status: driver.status,
            isAvailable: driver.isAvailable,
            currentLocation: driver.currentLocation || null,
            onboardingStatus: driver.onboardingStatus,
            onboardingCompletedAt: driver.onboardingCompletedAt || null,
            gender: driver.gender || null,
            vehicleType: driver.vehicleType || null,
            aadhaarNumber: this.maskValue(driver.aadhaarNumber, 4),
            aadhaarVerified: Boolean(driver.aadhaarVerified),
            panNumber: this.maskValue(driver.panNumber, 4),
            panImage: driver.panImage || null,
            dlNumber: this.maskValue(driver.dlNumber, 4),
            dlExpiry: driver.dlExpiry || null,
            dlFrontImage: driver.dlFrontImage || null,
            dlBackImage: driver.dlBackImage || null,
            bankAccountNumber: this.maskValue(driver.bankAccountNumber, 4),
            bankIfsc: driver.bankIfsc || null,
            bankVerified: Boolean(driver.bankVerified),
            bankAccounts: (driver.bankAccounts || []).map((ba: any) => ({
              accountNumber: this.maskValue(ba.accountNumber, 4),
              ifsc: ba.ifsc,
              verified: Boolean(ba.verified),
              isDefault: Boolean(ba.isDefault),
            })),
            selfieImage: driver.selfieImage || null,
            createdAt: driver.createdAt,
            updatedAt: driver.updatedAt,
          }
        : null,
      verification: {
        identity: Boolean(driver?.aadhaarVerified || driver?.panNumber),
        drivingLicense: this.getLicenseStatus(driver?.dlExpiry),
        bank: Boolean(driver?.bankVerified),
        selfie: Boolean(driver?.selfieImage),
        documentsComplete: Boolean(
          driver?.vehicleType &&
          (driver.aadhaarVerified || driver.panNumber) &&
          driver.dlNumber &&
          driver.bankVerified,
        ),
      },
      vehicle: {
        type: driver?.vehicleType || null,
        label: this.formatVehicleType(driver?.vehicleType),
        insuranceStatus: driver?.vehicleType ? "valid" : "pending",
      },
      stats: {
        completedTrips,
        rating: 4.9,
        acceptanceRate: 98,
      },
    };
  }

  async getEarnings(userId: string) {
    const driver = await Driver.findOne({ user: userId });
    if (!driver) throw new Error("Driver profile not found");

    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const [weekOrders, previousWeekOrders, allCompletedOrders, payouts] = await Promise.all([
      this.getCompletedOrdersForDriver(driver._id, weekStart, now),
      this.getCompletedOrdersForDriver(driver._id, previousWeekStart, weekStart),
      Order.find({
        driver: driver._id,
        status: { $in: this.completedStatuses() },
      }).sort({ updatedAt: -1 }).limit(20),
      DriverPayout.find({ driver: driver._id }).sort({ createdAt: -1 }).limit(10),
    ]);

    const weeklyBreakdown = this.buildWeeklyBreakdown(weekOrders, weekStart);
    const weekGross = this.sumDriverEarnings(weekOrders);
    const previousWeekGross = this.sumDriverEarnings(previousWeekOrders);
    const paidOut = await this.getPaidOutTotal(driver._id);
    const lifetimeGross = await this.getLifetimeGross(driver._id);
    const availableBalance = Math.max(0, lifetimeGross - paidOut);
    const trendPercent = previousWeekGross > 0
      ? Math.round(((weekGross - previousWeekGross) / previousWeekGross) * 100)
      : weekGross > 0 ? 100 : 0;

    const recentActivity = [
      ...allCompletedOrders.map((order: any) => ({
        id: order._id.toString(),
        type: "earning",
        icon: order.serviceType === "delivery" || order.serviceType === "helper" ? "package" : "car",
        label: `${this.formatServiceLabel(order.serviceType)} - ${this.getOrderDestination(order)}`,
        amount: Math.round((order.totalPrice || 0) * 0.8),
        createdAt: order.updatedAt || order.createdAt,
      })),
      ...payouts.map((payout: any) => ({
        id: payout._id.toString(),
        type: "payout",
        icon: "credit-card",
        label: `Cash out - ${payout.status}`,
        amount: -payout.amount,
        createdAt: payout.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      availableBalance,
      weekBalance: weekGross,
      trendPercent,
      weeklyBreakdown,
      recentActivity,
      stats: {
        onlineHours: this.estimateActiveHours(weekOrders),
        totalDistance: Math.round(weekOrders.reduce((sum: number, order: any) => sum + (order.totalDistance || 0), 0)),
        completedTrips: weekOrders.length,
      },
      bank: {
        verified: Boolean(driver.bankVerified),
        last4: driver.bankAccountNumber?.slice(-4) || null,
        ifsc: driver.bankIfsc || null,
      },
    };
  }

  async cashOut(userId: string, password: string, amount?: number) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    const isPasswordValid = user.password ? await user.matchPassword(password) : false;
    if (!isPasswordValid) throw new Error("Invalid driver credentials");

    const driver = await Driver.findOne({ user: userId });
    if (!driver) throw new Error("Driver profile not found");
    if (!driver.bankVerified || !driver.bankAccountNumber || !driver.bankIfsc) {
      throw new Error("Verified bank account is required before cash out");
    }

    const earnings = await this.getEarnings(userId);
    const payoutAmount = amount && amount > 0 ? amount : earnings.availableBalance;

    if (payoutAmount < 100) {
      throw new Error("Minimum cash out amount is Rs.100");
    }
    if (payoutAmount > earnings.availableBalance) {
      throw new Error("Cash out amount exceeds available balance");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let payoutRecord;
    try {
      payoutRecord = new DriverPayout({
        driver: driver._id,
        user: user._id,
        amount: payoutAmount,
        status: DriverPayoutStatus.PENDING,
      });
      await payoutRecord.save({ session });

      const result = await this.paymentService.createDriverPayout({
        name: user.name,
        phone: user.phone,
        email: user.email,
        accountNumber: driver.bankAccountNumber,
        ifsc: driver.bankIfsc,
        amount: payoutAmount,
        notes: {
          driverId: driver._id.toString(),
          payoutRecordId: payoutRecord._id.toString(),
        },
      });

      payoutRecord.status = this.normalizePayoutStatus(result.payout.status);
      payoutRecord.razorpayContactId = result.contact.id;
      payoutRecord.razorpayFundAccountId = result.fundAccount.id;
      payoutRecord.razorpayPayoutId = result.payout.id;
      await payoutRecord.save({ session });

      await session.commitTransaction();

      return {
        message: "Cash out initiated",
        payout: {
          id: payoutRecord._id,
          razorpayPayoutId: payoutRecord.razorpayPayoutId,
          amount: payoutRecord.amount,
          status: payoutRecord.status,
        },
      };
    } catch (error: any) {
      await session.abortTransaction();
      
      // If we failed after creating payoutRecord, write failure status to DB outside of transaction
      if (payoutRecord) {
        try {
          await DriverPayout.findByIdAndUpdate(payoutRecord._id, {
            status: DriverPayoutStatus.FAILED,
            failureReason: error.message
          });
        } catch (dbErr) {
          console.error("Failed to write payout failure status:", dbErr);
        }
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  private completedStatuses() {
    return [OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.DELIVERED_LC];
  }

  private getCompletedOrdersForDriver(driverId: any, from: Date, to: Date) {
    return Order.find({
      driver: driverId,
      status: { $in: this.completedStatuses() },
      updatedAt: { $gte: from, $lt: to },
    });
  }

  private async getLifetimeGross(driverId: any) {
    const result = await Order.aggregate<{ total: number }>([
      { $match: { driver: driverId, status: { $in: this.completedStatuses() } } },
      { $group: { _id: null, total: { $sum: { $multiply: ["$totalPrice", 0.8] } } } },
    ]);

    return Math.round(result[0]?.total || 0);
  }

  private async getPaidOutTotal(driverId: any) {
    const result = await DriverPayout.aggregate<{ total: number }>([
      {
        $match: {
          driver: driverId,
          status: { $in: [DriverPayoutStatus.PENDING, DriverPayoutStatus.PROCESSING, DriverPayoutStatus.PROCESSED] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return Math.round(result[0]?.total || 0);
  }

  private sumDriverEarnings(orders: any[]) {
    return Math.round(orders.reduce((sum, order) => sum + (order.totalPrice || 0) * 0.8, 0));
  }

  private buildWeeklyBreakdown(orders: any[], weekStart: Date) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const totals = Array.from({ length: 7 }, (_, index) => ({
      day: days[index],
      amount: 0,
    }));

    for (const order of orders) {
      const updatedAt = new Date(order.updatedAt || order.createdAt);
      const index = Math.floor((updatedAt.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      if (index >= 0 && index < totals.length) {
        totals[index].amount += Math.round((order.totalPrice || 0) * 0.8);
      }
    }

    return totals;
  }

  private getWeekStart(date: Date) {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private formatServiceLabel(serviceType: string) {
    if (serviceType === "delivery" || serviceType === "helper") return "Delivery";
    return "Ride";
  }

  private getOrderDestination(order: any) {
    const lastStop = order.stops?.[order.stops.length - 1];
    return lastStop?.address?.split(",")[0]?.trim() || "Completed Trip";
  }

  private estimateActiveHours(orders: any[]) {
    const minutes = orders.reduce((sum, order) => {
      if (order.duration) return sum + Number(order.duration);
      return sum + (order.totalDistance || 0) * 4;
    }, 0);

    return Math.round((minutes / 60) * 10) / 10;
  }

  private normalizePayoutStatus(status: string): DriverPayoutStatus {
    if (status === "processed") return DriverPayoutStatus.PROCESSED;
    if (status === "failed" || status === "reversed" || status === "cancelled") return DriverPayoutStatus.FAILED;
    if (status === "processing" || status === "queued") return DriverPayoutStatus.PROCESSING;
    return DriverPayoutStatus.PENDING;
  }

  private maskValue(value?: string, visible: number = 4) {
    if (!value) return null;
    const cleanValue = value.replace(/\s/g, "");
    if (cleanValue.length <= visible) return cleanValue;
    return `${"*".repeat(Math.max(0, cleanValue.length - visible))}${cleanValue.slice(-visible)}`;
  }

  private getLicenseStatus(expiry?: Date | string | null): "valid" | "expired" | "pending" {
    if (!expiry) return "pending";
    return new Date(expiry).getTime() >= Date.now() ? "valid" : "expired";
  }

  private formatVehicleType(vehicleType?: string | null) {
    if (!vehicleType) return "Not added";
    if (vehicleType === "bike") return "Bike";
    if (vehicleType === "auto") return "Auto";
    if (vehicleType === "car") return "Car";
    return vehicleType;
  }
}
