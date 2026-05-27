import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { OnboardingService } from "./onboarding.service";

const onboardingService = new OnboardingService();

export class OnboardingController {
  /**
   * PATCH /api/v1/onboarding
   * Save onboarding data incrementally (merges with existing).
   */
  async save(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const data = req.body;

      const result = await onboardingService.saveOnboardingData(userId, data);
      return res.json(result);
    } catch (error: any) {
      console.error("[ONBOARDING] Save error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * POST /api/v1/onboarding/verify-aadhaar
   * Verify Aadhaar through Surepass.
   */
  async verifyAadhaar(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const { aadhaarNumber } = req.body;

      if (!aadhaarNumber) {
        return res.status(400).json({ message: "Aadhaar number is required" });
      }

      const result = await onboardingService.verifyAadhaar(userId, aadhaarNumber);
      return res.json(result);
    } catch (error: any) {
      console.error("[ONBOARDING] Verify Aadhaar error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * POST /api/v1/onboarding/verify-pan
   * Verify PAN through Surepass.
   */
  async verifyPAN(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const { panNumber } = req.body;

      if (!panNumber) {
        return res.status(400).json({ message: "PAN number is required" });
      }

      const result = await onboardingService.verifyPAN(userId, panNumber);
      return res.json(result);
    } catch (error: any) {
      console.error("[ONBOARDING] Verify PAN error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * GET /api/v1/onboarding
   * Get current driver's onboarding status and saved data.
   */
  async status(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const result = await onboardingService.getOnboardingStatus(userId);
      return res.json(result);
    } catch (error: any) {
      console.error("[ONBOARDING] Status error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * POST /api/v1/onboarding/complete
   * Mark onboarding as completed.
   */
  async complete(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.user!;
      const result = await onboardingService.completeOnboarding(userId);
      return res.json(result);
    } catch (error: any) {
      console.error("[ONBOARDING] Complete error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }
}
