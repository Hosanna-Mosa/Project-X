import { Response, NextFunction } from "express";
import Review from "../../database/models/Review";
import Order, { OrderStatus } from "../../database/models/Order";
import Vendor from "../../database/models/Vendor";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ValidationError, NotFoundError } from "../../utils/errors";

export class ReviewsController {
  async createReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId || (req.user as any)?.id || (req.user as any)?._id;
      const { orderId, rating, driverRating, vendorRating, comment, tags } = req.body;

      if (!orderId) {
        throw new ValidationError("Order ID is required");
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new ValidationError("Rating must be a number between 1 and 5");
      }

      // Find order
      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError("Order not found");
      }

      // Verify order belongs to user
      if (order.user.toString() !== userId?.toString()) {
        throw new ValidationError("You can only review your own orders");
      }

      // Verify order status is completed/delivered
      const isCompleted = [
        OrderStatus.COMPLETED,
        OrderStatus.DELIVERED,
        OrderStatus.DELIVERED_LC,
      ].includes(order.status) ||
      order.status.toLowerCase() === "delivered" ||
      order.status.toLowerCase() === "completed";

      if (!isCompleted) {
        throw new ValidationError("Order cannot be reviewed until it is completed");
      }

      // Check if already reviewed
      if (order.isReviewed) {
        const existingReview = await Review.findOne({ order: order._id });
        if (existingReview) {
          return res.status(200).json({
            message: "Order has already been reviewed",
            review: existingReview,
          });
        }
      }

      // Create new review
      const newReview = await Review.create({
        order: order._id,
        user: userId,
        vendor: order.vendor || undefined,
        driver: order.driver || undefined,
        rating: Number(rating),
        driverRating: driverRating ? Number(driverRating) : undefined,
        vendorRating: vendorRating ? Number(vendorRating) : undefined,
        comment: comment || "",
        tags: Array.isArray(tags) ? tags : [],
      });

      // Update Order
      order.isReviewed = true;
      order.review = newReview._id as any;
      await order.save();

      // Recalculate Vendor average rating if vendor exists
      if (order.vendor) {
        try {
          const vendorReviews = await Review.find({ vendor: order.vendor });
          if (vendorReviews.length > 0) {
            const totalRating = vendorReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = Number((totalRating / vendorReviews.length).toFixed(1));
            await Vendor.findByIdAndUpdate(order.vendor, {
              rating: avgRating,
              reviews: `${vendorReviews.length}`,
            });
          }
        } catch (vErr) {
          console.error("Failed to update vendor rating average:", vErr);
        }
      }

      return res.status(201).json({
        message: "Review submitted successfully",
        review: newReview,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReviewByOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const review = await Review.findOne({ order: orderId });
      if (!review) {
        return res.status(404).json({ message: "No review found for this order" });
      }
      return res.json({ review });
    } catch (error) {
      next(error);
    }
  }
}
