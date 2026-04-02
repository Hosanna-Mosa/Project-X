import { Request, Response } from "express";
import { RoutingService } from "./routing.service";

const routingService = new RoutingService();

export class RoutingController {
  async optimize(req: Request, res: Response) {
    const { origin, stops } = req.body;

    console.log("Optimize Route Payload:", req.body);
    if (!origin || !stops || !Array.isArray(stops)) {
      return res.status(400).json({ message: "Origin coordinates and mapping are required" });
    }

    try {
      const getLat = (o: any) => o.lat ?? o.latitude;
      const getLng = (o: any) => o.lng ?? o.longitude;

      const mappedStops = stops.map((s: any) => ({
        id: s.id,
        address: s.address,
        latitude: getLat(s),
        longitude: getLng(s),
        type: s.type,
        items: s.items,
      }));

      const result = await routingService.optimizeAndGetRoute(
        { latitude: getLat(origin), longitude: getLng(origin) },
        mappedStops
      );

      if (!result) {
        return res.status(404).json({ message: "Could not calculate route" });
      }

      res.json(result);
    } catch (error) {
      console.error("Optimize Route Error:", error);
      res.status(500).json({ message: "Internal server error calculating route" });
    }
  }
}
