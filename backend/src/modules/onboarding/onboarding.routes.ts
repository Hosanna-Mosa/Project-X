import { Router } from "express";
import { OnboardingController } from "./onboarding.controller";
import { authenticateToken, authorizeRole } from "../../middleware/auth.middleware";
import { UserRole } from "../../database/models/User";

const router = Router();
const onboardingController = new OnboardingController();

// All onboarding routes require authentication + DRIVER role
router.patch(
  "/",
  authenticateToken,
  authorizeRole([UserRole.DRIVER]),
  onboardingController.save.bind(onboardingController)
);

router.get(
  "/",
  authenticateToken,
  authorizeRole([UserRole.DRIVER]),
  onboardingController.status.bind(onboardingController)
);

router.post(
  "/verify-aadhaar",
  authenticateToken,
  authorizeRole([UserRole.DRIVER]),
  onboardingController.verifyAadhaar.bind(onboardingController)
);

router.post(
  "/verify-pan",
  authenticateToken,
  authorizeRole([UserRole.DRIVER]),
  onboardingController.verifyPAN.bind(onboardingController)
);

router.post(
  "/complete",
  authenticateToken,
  authorizeRole([UserRole.DRIVER]),
  onboardingController.complete.bind(onboardingController)
);

router.get(
  "/digilocker/auth-url",
  authenticateToken,
  authorizeRole([UserRole.DRIVER]),
  onboardingController.getDigilockerAuthUrl.bind(onboardingController)
);

router.post(
  "/verify-digilocker",
  authenticateToken,
  authorizeRole([UserRole.DRIVER]),
  onboardingController.verifyDigilocker.bind(onboardingController)
);

export default router;
