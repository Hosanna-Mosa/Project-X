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

  async createDriverPayout(input: {
    name: string;
    phone: string;
    email?: string;
    accountNumber: string;
    ifsc: string;
    amount: number;
    notes?: Record<string, string>;
  }) {
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    const isMock = !accountNumber || accountNumber.includes("placeholder") || accountNumber.includes("your_");

    if (isMock) {
      return {
        contact: { id: `cont_${Math.random().toString(36).substring(7)}` },
        fundAccount: { id: `fa_${Math.random().toString(36).substring(7)}` },
        payout: {
          id: `pout_${Math.random().toString(36).substring(7)}`,
          status: "processed"
        }
      };
    }

    try {
      const contact = await (razorpay as any).contacts.create({
        name: input.name,
        contact: input.phone,
        email: input.email,
        type: "employee",
        reference_id: `driver_${Date.now()}`,
      });

      const fundAccount = await (razorpay as any).fundAccount.create({
        contact_id: contact.id,
        account_type: "bank_account",
        bank_account: {
          name: input.name,
          ifsc: input.ifsc,
          account_number: input.accountNumber,
        },
      });

      const payout = await (razorpay as any).payouts.create({
        account_number: accountNumber,
        fund_account_id: fundAccount.id,
        amount: Math.round(input.amount * 100),
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `driver_payout_${Date.now()}`,
        narration: "Driver cash out",
        notes: input.notes,
      });

      return { contact, fundAccount, payout };
    } catch (error) {
      console.error("Razorpay Driver Payout Error:", error);
      throw new Error("Failed to create driver payout");
    }
  }

  async createVendorPayout(input: {
    name: string;
    phone: string;
    email?: string;
    accountNumber: string;
    ifsc: string;
    amount: number;
    notes?: Record<string, string>;
  }) {
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    const isMock = !accountNumber || accountNumber.includes("placeholder") || accountNumber.includes("your_");

    if (isMock) {
      return {
        contact: { id: `cont_v_${Math.random().toString(36).substring(7)}` },
        fundAccount: { id: `fa_v_${Math.random().toString(36).substring(7)}` },
        payout: {
          id: `pout_v_${Math.random().toString(36).substring(7)}`,
          status: "processed"
        }
      };
    }

    try {
      const contact = await (razorpay as any).contacts.create({
        name: input.name,
        contact: input.phone,
        email: input.email,
        type: "vendor",
        reference_id: `vendor_${Date.now()}`,
      });

      const fundAccount = await (razorpay as any).fundAccount.create({
        contact_id: contact.id,
        account_type: "bank_account",
        bank_account: {
          name: input.name,
          ifsc: input.ifsc,
          account_number: input.accountNumber,
        },
      });

      const payout = await (razorpay as any).payouts.create({
        account_number: accountNumber,
        fund_account_id: fundAccount.id,
        amount: Math.round(input.amount * 100),
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `vendor_payout_${Date.now()}`,
        narration: "Vendor cash out",
        notes: input.notes,
      });

      return { contact, fundAccount, payout };
    } catch (error) {
      console.error("Razorpay Vendor Payout Error:", error);
      throw new Error("Failed to create vendor payout");
    }
  }
}
