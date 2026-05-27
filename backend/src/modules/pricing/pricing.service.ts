import { ServiceType } from "../../database/models/Order";

interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  total: number;
}

interface RateConfig {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
}

const DEFAULT_RATES: Record<ServiceType, RateConfig> = {
  [ServiceType.BIKE]: {
    baseFare: parseFloat(process.env.RATE_BIKE_BASE || "15"),
    perKmRate: parseFloat(process.env.RATE_BIKE_PER_KM || "5"),
    perMinRate: parseFloat(process.env.RATE_BIKE_PER_MIN || "1"),
  },
  [ServiceType.AUTO]: {
    baseFare: parseFloat(process.env.RATE_AUTO_BASE || "25"),
    perKmRate: parseFloat(process.env.RATE_AUTO_PER_KM || "8"),
    perMinRate: parseFloat(process.env.RATE_AUTO_PER_MIN || "2"),
  },
  [ServiceType.CAB]: {
    baseFare: parseFloat(process.env.RATE_CAB_BASE || "50"),
    perKmRate: parseFloat(process.env.RATE_CAB_PER_KM || "12"),
    perMinRate: parseFloat(process.env.RATE_CAB_PER_MIN || "3"),
  },
  [ServiceType.CAB_PRIME]: {
    baseFare: parseFloat(process.env.RATE_CAB_PRIME_BASE || "80"),
    perKmRate: parseFloat(process.env.RATE_CAB_PRIME_PER_KM || "18"),
    perMinRate: parseFloat(process.env.RATE_CAB_PRIME_PER_MIN || "4"),
  },
  [ServiceType.DELIVERY]: {
    baseFare: parseFloat(process.env.RATE_DELIVERY_BASE || "50"),
    perKmRate: parseFloat(process.env.RATE_DELIVERY_PER_KM || "12"),
    perMinRate: parseFloat(process.env.RATE_DELIVERY_PER_MIN || "2"),
  },
  [ServiceType.HELPER]: {
    baseFare: parseFloat(process.env.RATE_HELPER_BASE || "99"),
    perKmRate: parseFloat(process.env.RATE_HELPER_PER_KM || "15"),
    perMinRate: parseFloat(process.env.RATE_HELPER_PER_MIN || "2"),
  },
};

export class PricingService {
  getRateConfig(serviceType: ServiceType): RateConfig {
    return DEFAULT_RATES[serviceType] || DEFAULT_RATES[ServiceType.CAB];
  }

  calculateFareBreakdown(
    serviceType: ServiceType,
    distanceInKm: number,
    estimatedMinutes: number = 0,
  ): FareBreakdown {
    const rates = this.getRateConfig(serviceType);

    const baseFare = rates.baseFare;
    const distanceFare = Math.round(distanceInKm * rates.perKmRate * 100) / 100;
    const timeFare = Math.round(estimatedMinutes * rates.perMinRate * 100) / 100;
    const surgeMultiplier = 1; // can be dynamic based on demand

    const total = Math.round((baseFare + distanceFare + timeFare) * surgeMultiplier * 100) / 100;

    return { baseFare, distanceFare, timeFare, surgeMultiplier, total };
  }

  // Keep backward compatibility with delivery pricing
  calculatePrice(distanceInKm: number, stopCount: number): number {
    const rates = DEFAULT_RATES[ServiceType.DELIVERY];
    const distancePrice = distanceInKm * rates.perKmRate;
    const stopPrice = stopCount * 20;
    return rates.baseFare + distancePrice + stopPrice;
  }
}
