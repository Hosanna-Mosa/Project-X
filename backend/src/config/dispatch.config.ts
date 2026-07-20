export interface ExpansionStage {
  stage: number;
  name: string;
  radiusMeters: number;
}

export interface VehicleDispatchConfig {
  stages: ExpansionStage[];
}

export const DISPATCH_CONFIG: Record<string, VehicleDispatchConfig> = {
  bike: {
    stages: [
      { stage: 1, name: "Stage 1 (Inner Ring - 3 km)", radiusMeters: 3000 },
      { stage: 2, name: "Stage 2 (Middle Ring - 6 km)", radiusMeters: 6000 },
      { stage: 3, name: "Stage 3 (City Outer - 10 km)", radiusMeters: 10000 },
    ],
  },
  auto: {
    stages: [
      { stage: 1, name: "Stage 1 (Inner Ring - 3 km)", radiusMeters: 3000 },
      { stage: 2, name: "Stage 2 (Middle Ring - 6 km)", radiusMeters: 6000 },
      { stage: 3, name: "Stage 3 (City Outer - 10 km)", radiusMeters: 10000 },
    ],
  },
  cab: {
    stages: [
      { stage: 1, name: "Stage 1 (Inner Ring - 5 km)", radiusMeters: 5000 },
      { stage: 2, name: "Stage 2 (Middle Ring - 8 km)", radiusMeters: 8000 },
      { stage: 3, name: "Stage 3 (City Outer - 15 km)", radiusMeters: 15000 },
    ],
  },
  cab_prime: {
    stages: [
      { stage: 1, name: "Stage 1 (Inner Ring - 5 km)", radiusMeters: 5000 },
      { stage: 2, name: "Stage 2 (Middle Ring - 8 km)", radiusMeters: 8000 },
      { stage: 3, name: "Stage 3 (City Outer - 15 km)", radiusMeters: 15000 },
    ],
  },
  delivery: {
    stages: [
      { stage: 1, name: "Stage 1 (Inner Ring - 4 km)", radiusMeters: 4000 },
      { stage: 2, name: "Stage 2 (Middle Ring - 8 km)", radiusMeters: 8000 },
      { stage: 3, name: "Stage 3 (City Outer - 12 km)", radiusMeters: 12000 },
    ],
  },
  helper: {
    stages: [
      { stage: 1, name: "Stage 1 (Inner Ring - 4 km)", radiusMeters: 4000 },
      { stage: 2, name: "Stage 2 (Middle Ring - 8 km)", radiusMeters: 8000 },
      { stage: 3, name: "Stage 3 (City Outer - 12 km)", radiusMeters: 12000 },
    ],
  },
  default: {
    stages: [
      { stage: 1, name: "Stage 1 (Inner Ring - 4 km)", radiusMeters: 4000 },
      { stage: 2, name: "Stage 2 (Middle Ring - 8 km)", radiusMeters: 8000 },
      { stage: 3, name: "Stage 3 (City Outer - 12 km)", radiusMeters: 12000 },
    ],
  },
};

export function getDispatchStagesForVehicle(vehicleType?: string): ExpansionStage[] {
  if (!vehicleType) return DISPATCH_CONFIG.default.stages;
  const normalized = vehicleType.toLowerCase();
  return (DISPATCH_CONFIG[normalized] || DISPATCH_CONFIG.default).stages;
}
