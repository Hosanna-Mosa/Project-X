/**
 * Surepass Verification Service
 *
 * Handles Aadhaar and PAN card verification via Surepass APIs.
 *
 * ── Replace mock with real API when API key is obtained ──
 * 1. Get API key from https://surepass.io/get-api-key/
 * 2. Set SURPASS_API_KEY in environment variables
 * 3. Uncomment the real HTTP request logic and remove mock returns
 *
 * Typical Surepass API pattern:
 *   POST https://api.surepass.io/v1/aadhaar/verify
 *   Authorization: Bearer <API_KEY>
 *   Content-Type: application/json
 *   { "id_number": "...", "consent": true }
 */

interface VerificationResult {
  verified: boolean;
  status: "success" | "failed";
  message: string;
  data?: Record<string, any>;
}

// ── Config (set these via environment variables) ──
const CONFIG = {
  apiKey: process.env.SURPASS_API_KEY || "",
  baseUrl: process.env.SURPASS_BASE_URL || "https://api.surepass.io/v1",
  // If true, returns mock responses instead of calling real API
  mockMode: !process.env.SURPASS_API_KEY,
};

export class SurepassService {
  /**
   * Verify an Aadhaar number against the government database.
   * @param aadhaarNumber - 12-digit Aadhaar number (string without spaces)
   * @param consent - User consent flag (required by DPDP Act)
   */
  async verifyAadhaar(
    aadhaarNumber: string,
    consent: boolean = true
  ): Promise<VerificationResult> {
    if (!consent) {
      return {
        verified: false,
        status: "failed",
        message: "User consent is required for Aadhaar verification",
      };
    }

    // Validate format
    const cleaned = aadhaarNumber.replace(/\s/g, "");
    if (!/^\d{12}$/.test(cleaned)) {
      return {
        verified: false,
        status: "failed",
        message: "Invalid Aadhaar number format. Must be 12 digits.",
      };
    }

    if (CONFIG.mockMode) {
      return this.mockVerifyAadhaar(cleaned);
    }

    // ── REAL API CALL (uncomment when API key is available) ──
    // try {
    //   const response = await fetch(`${CONFIG.baseUrl}/aadhaar/verify`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${CONFIG.apiKey}`,
    //     },
    //     body: JSON.stringify({ id_number: cleaned, consent }),
    //   });
    //   const result = await response.json();
    //   return mapSurepassAadhaarResponse(result);
    // } catch (error) {
    //   console.error("[SURPASS] Aadhaar verification API error:", error);
    //   return {
    //     verified: false,
    //     status: "failed",
    //     message: "Aadhaar verification failed. Please try again.",
    //   };
    // }

    return this.mockVerifyAadhaar(cleaned);
  }

  /**
   * Verify a PAN card number against the government database.
   * @param panNumber - 10-character PAN number
   * @param consent - User consent flag (required by DPDP Act)
   */
  async verifyPAN(
    panNumber: string,
    consent: boolean = true
  ): Promise<VerificationResult> {
    if (!consent) {
      return {
        verified: false,
        status: "failed",
        message: "User consent is required for PAN verification",
      };
    }

    // Validate format
    const cleaned = panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(cleaned)) {
      return {
        verified: false,
        status: "failed",
        message: "Invalid PAN number format. Must be 10 characters (e.g., ABCDE1234F).",
      };
    }

    if (CONFIG.mockMode) {
      return this.mockVerifyPAN(cleaned);
    }

    // ── REAL API CALL (uncomment when API key is available) ──
    // try {
    //   const response = await fetch(`${CONFIG.baseUrl}/pan/verify`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${CONFIG.apiKey}`,
    //     },
    //     body: JSON.stringify({ id_number: cleaned, consent }),
    //   });
    //   const result = await response.json();
    //   return mapSurepassPANResponse(result);
    // } catch (error) {
    //   console.error("[SURPASS] PAN verification API error:", error);
    //   return {
    //     verified: false,
    //     status: "failed",
    //     message: "PAN verification failed. Please try again.",
    //   };
    // }

    return this.mockVerifyPAN(cleaned);
  }

  // ── Mock Implementations ──

  private mockVerifyAadhaar(aadhaarNumber: string): VerificationResult {
    // Always succeed for valid format (dummy mode)
    return {
      verified: true,
      status: "success",
      message: "Aadhaar verified successfully",
      data: {
        aadhaarNumber,
        name: "Demo User", // Would come from real API
        gender: "Male", // Would come from real API
        dob: "01/01/1990", // Would come from real API
        lastFourDigits: aadhaarNumber.slice(-4),
      },
    };
  }

  private mockVerifyPAN(panNumber: string): VerificationResult {
    // Always succeed for valid format (dummy mode)
    return {
      verified: true,
      status: "success",
      message: "PAN verified successfully",
      data: {
        panNumber,
        fullName: "DEMO USER", // Would come from real API
        panStatus: "VALID",
        category: "Individual", // Would come from real API
      },
    };
  }
}

// ── Response Mappers (for when real API is integrated) ──

// function mapSurepassAadhaarResponse(apiResponse: any): VerificationResult {
//   // Map Surepass API response to our standard format
//   // This will be updated based on actual API docs
//   return {
//     verified: apiResponse.success === true,
//     status: apiResponse.success ? "success" : "failed",
//     message: apiResponse.message || "Aadhaar verification completed",
//     data: apiResponse.data || {},
//   };
// }

// function mapSurepassPANResponse(apiResponse: any): VerificationResult {
//   // Map Surepass API response to our standard format
//   return {
//     verified: apiResponse.success === true,
//     status: apiResponse.success ? "success" : "failed",
//     message: apiResponse.message || "PAN verification completed",
//     data: apiResponse.data || {},
//   };
// }

// Singleton export
export const surepassService = new SurepassService();
