import { Router } from "express";
import { ReviewsController } from "./reviews.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();
const reviewsController = new ReviewsController();

router.post("/", authenticateToken, reviewsController.createReview.bind(reviewsController));
router.get("/order/:orderId", authenticateToken, reviewsController.getReviewByOrder.bind(reviewsController));

export default router;
