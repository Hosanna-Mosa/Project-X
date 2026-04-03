import { Request, Response, Router } from "express";
import { PaymentService } from "./payment.service";
import { authenticateToken, AuthRequest } from "../../middleware/auth.middleware";
import { OrdersService } from "../orders/orders.service";

const router = Router();
const paymentService = new PaymentService();
const ordersService = new OrdersService();

router.post("/create-order", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: "Amount is required" });
    
    const amountInPaise = Math.round(amount * 100);
    const order = await paymentService.createRazorpayOrder(amount);
    
    // Send back the configuration required for the SDK together with the order
    res.json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_Rbm66o8JPEj0P8",
      name: "Precision Logistics",
      prefill: {
        email: "customer@example.com", // This could also come from user session
      },
      theme: { color: "#0EA5E9" } // Matches primary color
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/verify", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      orderData // New: Optional order data to create after verification
    } = req.body;

    const isValid = await paymentService.verifyPayment(
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    );

    if (isValid) {
      if (orderData && req.user) {
        // Automatically create order if data provided
        const order = await ordersService.createOrder(req.user.userId, orderData.stops);
        return res.json({ 
          message: "Payment verified and order created", 
          order 
        });
      }
      return res.json({ message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ message: "Payment verification failed" });
    }
  } catch (error: any) {
    console.error("Payment Verification/Order Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

export default router;
