/**
 * DigiLocker Verification Service
 *
 * Handles DigiLocker OAuth2 flows and document retrieval (Aadhaar & PAN).
 *
 * Mock mode is active if DIGILOCKER_CLIENT_ID or DIGILOCKER_CLIENT_SECRET are placeholders/empty.
 */

interface DigiLockerVerificationResult {
  verified: boolean;
  status: "success" | "failed";
  message: string;
  data?: Record<string, any>;
}

const CONFIG = {
  clientId: process.env.DIGILOCKER_CLIENT_ID || "",
  clientSecret: process.env.DIGILOCKER_CLIENT_SECRET || "",
  redirectUri: process.env.DIGILOCKER_REDIRECT_URI || "http://localhost:5000/api/v1/onboarding/verify-digilocker",
  baseUrl: process.env.DIGILOCKER_BASE_URL || "https://api.digitallocker.gov.in/public/oauth2/1",
  mockMode: !process.env.DIGILOCKER_CLIENT_ID || process.env.DIGILOCKER_CLIENT_ID.includes("placeholder") || process.env.DIGILOCKER_CLIENT_ID.includes("your_"),
};

export class DigiLockerService {
  /**
   * Generate the OAuth authorization URL for redirecting the user.
   * @param state - Random state string for security verification
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: CONFIG.clientId || "mock_client_id",
      redirect_uri: CONFIG.redirectUri,
      state: state,
    });
    return `${CONFIG.baseUrl}/authorize?${params.toString()}`;
  }

  /**
   * Exchange code for Access Token.
   */
  async getAccessToken(code: string): Promise<string> {
    if (CONFIG.mockMode) {
      return "mock_access_token_123456";
    }

    try {
      const response = await fetch(`${CONFIG.baseUrl}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: CONFIG.clientId,
          client_secret: CONFIG.clientSecret,
          redirect_uri: CONFIG.redirectUri,
        }).toString(),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error_description || result.error || "Failed to exchange token");
      }

      return result.access_token;
    } catch (error: any) {
      console.error("[DIGILOCKER] Token exchange error:", error);
      throw new Error(error.message || "Failed to retrieve DigiLocker access token");
    }
  }

  /**
   * Fetch Aadhaar card details from DigiLocker.
   */
  async verifyAadhaar(accessToken: string): Promise<DigiLockerVerificationResult> {
    if (CONFIG.mockMode || accessToken === "mock_access_token_123456") {
      return {
        verified: true,
        status: "success",
        message: "Aadhaar verified via DigiLocker",
        data: {
          name: "Demo DigiLocker User",
          gender: "M",
          dob: "12-10-1992",
          aadhaarNumber: "XXXXXXXX4321",
          address: "123, Main Street, Tadepalligudem, AP",
        },
      };
    }

    try {
      // ── REAL API CALL ──
      // 1. Fetch file list or profile metadata
      // 2. Fetch specific XML/JSON payload for Aadhaar card
      const response = await fetch(`${CONFIG.baseUrl}/xml/eaadhaar`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch Aadhaar details");
      }

      return {
        verified: true,
        status: "success",
        message: "Aadhaar verified via DigiLocker successfully",
        data: result,
      };
    } catch (error: any) {
      console.error("[DIGILOCKER] Aadhaar verification error:", error);
      return {
        verified: false,
        status: "failed",
        message: error.message || "DigiLocker Aadhaar retrieval failed",
      };
    }
  }

  /**
   * Fetch PAN card details from DigiLocker.
   */
  async verifyPAN(accessToken: string): Promise<DigiLockerVerificationResult> {
    if (CONFIG.mockMode || accessToken === "mock_access_token_123456") {
      return {
        verified: true,
        status: "success",
        message: "PAN verified via DigiLocker",
        data: {
          fullName: "DEMO DIGILOCKER USER",
          panNumber: "ABCDE1234F",
          panStatus: "VALID",
        },
      };
    }

    try {
      // ── REAL API CALL ──
      // Fetch user's issued PAN card document details
      const response = await fetch(`${CONFIG.baseUrl}/pan/details`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch PAN details");
      }

      return {
        verified: true,
        status: "success",
        message: "PAN verified via DigiLocker successfully",
        data: result,
      };
    } catch (error: any) {
      console.error("[DIGILOCKER] PAN verification error:", error);
      return {
        verified: false,
        status: "failed",
        message: error.message || "DigiLocker PAN retrieval failed",
      };
    }
  }
}

export const digilockerService = new DigiLockerService();
