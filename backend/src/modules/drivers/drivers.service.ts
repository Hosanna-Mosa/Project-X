import Driver, { DriverStatus } from "../../database/models/Driver";

export class DriverService {
  async getNearbyDrivers(lat: number, lng: number, radiusInMeters: number = 5000) {
    return Driver.find({
      status: DriverStatus.ONLINE,
      isAvailable: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radiusInMeters,
        },
      },
    }).populate("user");
  }

  async updateLocation(driverId: string, lat: number, lng: number) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error("Driver not found");

    driver.currentLocation = {
      type: "Point",
      coordinates: [lng, lat],
    };
    return driver.save();
  }

  async updateStatus(driverId: string, status: DriverStatus) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error("Driver not found");

    driver.status = status;
    return driver.save();
  }
}
