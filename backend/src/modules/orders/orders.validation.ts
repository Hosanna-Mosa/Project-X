import { z } from "zod";
import { ServiceType } from "../../database/models/Order";

const coordinateSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
}).refine((data) => (data.latitude !== undefined && data.longitude !== undefined) || (data.lat !== undefined && data.lng !== undefined), {
  message: "Latitude and longitude coordinates are required",
});

const stopInputSchema = z.object({
  id: z.string().optional(),
  address: z.string().optional(),
  type: z.string().optional(),
  items: z.any().optional(),
  instructions: z.string().optional(),
  deliveryAddress: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const estimateFareSchema = z.object({
  query: z.object({
    pickupLat: z.string().refine((val) => !isNaN(Number(val)), "pickupLat must be a valid number"),
    pickupLng: z.string().refine((val) => !isNaN(Number(val)), "pickupLng must be a valid number"),
    dropLat: z.string().refine((val) => !isNaN(Number(val)), "dropLat must be a valid number"),
    dropLng: z.string().refine((val) => !isNaN(Number(val)), "dropLng must be a valid number"),
    serviceType: z.nativeEnum(ServiceType).optional(),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    stops: z.array(stopInputSchema).min(1, "At least one stop is required"),
    serviceType: z.nativeEnum(ServiceType).optional(),
    vendorId: z.string().optional(),
    totals: z.object({
      subtotal: z.number().optional(),
      deliveryFee: z.number().optional(),
      total: z.number().optional(),
    }).optional(),
    radius: z.number().optional(),
    duration: z.number().optional(),
    isReserved: z.boolean().optional(),
    reservedAt: z.string().datetime({ message: "Invalid date-time format for reservedAt" }).optional().or(z.string().optional()),
    customerPrice: z.number().optional(),
    bookingFor: z.object({
      type: z.enum(["myself", "someone_else"]),
      contactNumber: z.string().optional(),
    }).optional(),
    scheduledDelivery: z.object({
      type: z.enum(["now", "later"]),
      requestedAt: z.string().datetime({ message: "Invalid date-time format for requestedAt" }).optional().or(z.string().optional()),
    }).optional(),
  }),
});

export const requestScheduledDeliverySchema = z.object({
  body: z.object({
    vendorId: z.string().min(1, "Vendor ID is required"),
    scheduledFor: z.string().datetime({ message: "scheduledFor must be a valid future ISO datetime" }).or(z.string()),
  }),
});

export const respondScheduledDeliverySchema = z.object({
  params: z.object({
    requestId: z.string().min(1, "Request ID is required"),
  }),
  body: z.object({
    vendorId: z.string().min(1, "Vendor ID is required"),
    accepted: z.boolean(),
  }),
});
