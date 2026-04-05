import { Router } from "express";
import { UsersController } from "./users.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";

const router = Router();
const usersController = new UsersController();

router.get("/profile", authenticateToken, usersController.getProfile.bind(usersController));
router.patch("/profile", authenticateToken, usersController.updateProfile.bind(usersController));
router.post("/profile-pic", authenticateToken, upload.single("image"), usersController.uploadProfilePic.bind(usersController));

router.get("/addresses", authenticateToken, usersController.getAddresses.bind(usersController));
router.post("/addresses", authenticateToken, usersController.addAddress.bind(usersController));
router.patch("/addresses/:id", authenticateToken, usersController.updateAddress.bind(usersController));
router.delete("/addresses/:id", authenticateToken, usersController.deleteAddress.bind(usersController));

export default router;

