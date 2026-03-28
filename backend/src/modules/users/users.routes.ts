import { Router } from "express";
import { UsersController } from "./users.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();
const usersController = new UsersController();

router.get("/profile", authenticateToken, usersController.getProfile.bind(usersController));
router.patch("/profile", authenticateToken, usersController.updateProfile.bind(usersController));

export default router;
