import { Request, Response, Router } from "express";
import { PaymentService } from "./payment.service";

const router = Router();
const paymentService = new PaymentService();

router.post("/create-order", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: "Amount is required" });

    const order = await paymentService.createRazorpayOrder(amount);
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const isValid = await paymentService.verifyPayment(
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    );

    if (isValid) {
      res.json({ message: "Payment verified successfully" });
    } else {
      res.status(400).json({ message: "Payment verification failed" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
