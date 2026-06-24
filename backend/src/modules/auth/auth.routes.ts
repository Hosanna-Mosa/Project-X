import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../middleware/validation.middleware";
import { requestOtpSchema, verifyOtpSchema, loginWithPasswordSchema } from "./auth.validation";

const router = Router();
const authController = new AuthController();

router.post("/request-otp", validateRequest(requestOtpSchema), authController.requestOTP.bind(authController));
router.post("/verify-otp", validateRequest(verifyOtpSchema), authController.verifyOTP.bind(authController));
router.post("/login-password", validateRequest(loginWithPasswordSchema), authController.loginWithPassword.bind(authController));
router.post("/logout", authController.logout.bind(authController));

export default router;
