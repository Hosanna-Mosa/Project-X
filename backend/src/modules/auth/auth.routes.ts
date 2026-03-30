import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
const authController = new AuthController();

router.post("/request-otp", authController.requestOTP.bind(authController));
router.post("/verify-otp", authController.verifyOTP.bind(authController));
router.post("/logout", authController.logout.bind(authController));

export default router;
