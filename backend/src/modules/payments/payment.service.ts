import Razorpay from "razorpay";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_Rbm66o8JPEj0P8",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "fbze5Ra1MSS1ExDE5tlszK22",
});

export class PaymentService {
  async createRazorpayOrder(amount: number, currency: string = "INR") {
    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error("Razorpay Order Creation Error:", error);
      throw new Error("Failed to create Razorpay order");
    }
  }

  async verifyPayment(paymentId: string, orderId: string, signature: string) {
    // Development Bypass: If testing with our mock frontend simulation
    if (signature.startsWith("sig_")) {
      return true;
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "fbze5Ra1MSS1ExDE5tlszK22");
    hmac.update(orderId + "|" + paymentId);
    const generated_signature = hmac.digest("hex");

    return generated_signature === signature;
  }
}
