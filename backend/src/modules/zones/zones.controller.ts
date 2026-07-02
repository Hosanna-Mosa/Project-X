import { Request, Response, NextFunction } from "express";
import { ZonesService } from "./zones.service";

const zonesService = new ZonesService();

export async function createZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zone = await zonesService.createZone(req.body);
    res.status(201).json({ success: true, data: zone });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getZones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zones = await zonesService.getZones();
    res.status(200).json({ success: true, data: zones });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getZoneById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zone = await zonesService.getZoneById(req.params.id as string);
    if (!zone) {
      res.status(404).json({ success: false, message: "Zone not found" });
      return;
    }
    res.status(200).json({ success: true, data: zone });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zone = await zonesService.updateZone(req.params.id as string, req.body);
    res.status(200).json({ success: true, data: zone });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function deleteZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const success = await zonesService.deleteZone(req.params.id as string);
    if (!success) {
      res.status(404).json({ success: false, message: "Zone not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Zone deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function checkCoordinates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const serviceType = req.query.serviceType as string;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, message: "Query params lat and lng are required and must be numbers" });
      return;
    }

    const zone = await zonesService.getZoneForCoordinates(lat, lng, serviceType);
    res.status(200).json({
      success: true,
      inZone: zone !== null,
      zone: zone,
      pricingMultiplier: zone ? zone.pricingMultiplier : 1.0,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
