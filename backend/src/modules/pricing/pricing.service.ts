export class PricingService {
  private baseFee: number;
  private perKmRate: number;
  private stopFee: number;

  constructor() {
    this.baseFee = parseFloat(process.env.PRICING_BASE_FEE || "50");
    this.perKmRate = parseFloat(process.env.PRICING_PER_KM_RATE || "12");
    this.stopFee = parseFloat(process.env.PRICING_STOP_FEE || "20");
  }

  calculatePrice(distanceInKm: number, stopCount: number): number {
    const distancePrice = distanceInKm * this.perKmRate;
    const stopPrice = stopCount * this.stopFee;
    return this.baseFee + distancePrice + stopPrice;
  }
}
