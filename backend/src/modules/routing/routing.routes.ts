import { Router } from "express";
import { RoutingController } from "./routing.controller";

const router = Router();
const controller = new RoutingController();

router.post("/optimize", (req, res) => controller.optimize(req, res));

export default router;
