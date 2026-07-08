import { Router } from "express";
import { SupportController } from "./support.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();
const supportController = new SupportController();

router.get("/tickets", authenticateToken, supportController.getTickets.bind(supportController));
router.post("/tickets", authenticateToken, supportController.createTicket.bind(supportController));
router.post("/tickets/:id/messages", authenticateToken, supportController.sendReply.bind(supportController));
router.post("/tickets/:id/resolve", authenticateToken, supportController.resolveTicket.bind(supportController));

export default router;
