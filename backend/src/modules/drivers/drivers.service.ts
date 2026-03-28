import { AppDataSource } from "../../database/data-source";
import { Driver, DriverStatus } from "../../database/entities/Driver";

const driverRepository = AppDataSource.getRepository(Driver);

export class DriverService {
  async getNearbyDrivers(lat: number, lng: number, radiusInMeters: number = 5000) {
    // PostGIS query for nearby drivers
    // Note: TypeORM raw query or find with spatial options
    
    return driverRepository
      .createQueryBuilder("driver")
      .leftJoinAndSelect("driver.user", "user")
      .where("driver.status = :status", { status: DriverStatus.ONLINE })
      .andWhere("driver.isAvailable = :isAvailable", { isAvailable: true })
      .andWhere(
        "ST_DWithin(driver.currentLocation::geography, ST_MakePoint(:lng, :lat)::geography, :radius)",
        { lng, lat, radius: radiusInMeters }
      )
      .getMany();
  }

  async updateLocation(driverId: string, lat: number, lng: number) {
    const driver = await driverRepository.findOne({ where: { id: driverId } });
    if (!driver) throw new Error("Driver not found");

    driver.currentLocation = `POINT(${lng} ${lat})`;
    return driverRepository.save(driver);
  }

  async updateStatus(driverId: string, status: DriverStatus) {
    const driver = await driverRepository.findOne({ where: { id: driverId } });
    if (!driver) throw new Error("Driver not found");

    driver.status = status;
    return driverRepository.save(driver);
  }
}
