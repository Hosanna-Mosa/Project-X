import { SocketManager } from "../sockets/socket.manager";
import { NotificationService } from "./notification.service";
import Order, { OrderStatus } from "../database/models/Order";
import Driver, { DriverStatus } from "../database/models/Driver";

export interface CandidateDriverInfo {
  driverId: string; // Driver document _id string
  driverUserId: string; // Driver's User account _id string
  distanceMeters: number;
  driverName?: string;
  driverPhone?: string;
}

export interface ActiveDispatchSession {
  orderId: string;
  candidates: CandidateDriverInfo[];
  currentIndex: number;
  declinedDriverUserIds: Set<string>;
  timer?: NodeJS.Timeout;
  orderPayload: any;
  createdAt: number;
}

export class DispatchManagerService {
  private static instance: DispatchManagerService;
  private activeDispatches: Map<string, ActiveDispatchSession> = new Map();
  private OFFER_TIMEOUT_MS = 16000; // 16 seconds (15s UI timer + 1s grace period)

  private constructor() {}

  public static getInstance(): DispatchManagerService {
    if (!DispatchManagerService.instance) {
      DispatchManagerService.instance = new DispatchManagerService();
    }
    return DispatchManagerService.instance;
  }

  /**
   * Start sequential dispatch for an order to sorted candidate drivers
   */
  public async startDispatch(
    orderId: string,
    sortedCandidates: CandidateDriverInfo[],
    orderPayload: any
  ): Promise<boolean> {
    // Clear any existing session for this order
    this.cancelDispatch(orderId);

    if (!sortedCandidates || sortedCandidates.length === 0) {
      console.warn(`[DISPATCH MANAGER] No candidate drivers provided for order ${orderId}`);
      this.notifyNoDriversAvailable(orderId, orderPayload?.customerUserId);
      return false;
    }

    console.log(`[DISPATCH MANAGER] Starting sequential dispatch for order ${orderId} with ${sortedCandidates.length} sorted candidates:`);
    sortedCandidates.forEach((c, idx) => {
      console.log(`   ${idx + 1}. Driver User ID: ${c.driverUserId} | Driver Doc ID: ${c.driverId} | Distance: ${Math.round(c.distanceMeters)}m`);
    });

    const session: ActiveDispatchSession = {
      orderId,
      candidates: sortedCandidates,
      currentIndex: 0,
      declinedDriverUserIds: new Set<string>(),
      orderPayload,
      createdAt: Date.now(),
    };

    this.activeDispatches.set(orderId, session);
    await this.offerNextDriver(orderId);
    return true;
  }

  /**
   * Offer the order to the current candidate driver in sequence
   */
  private async offerNextDriver(orderId: string) {
    const session = this.activeDispatches.get(orderId);
    if (!session) return;

    // Clear any existing timer
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = undefined;
    }

    // Check if order was already accepted or cancelled in DB
    try {
      const dbOrder = await Order.findById(orderId);
      if (!dbOrder || dbOrder.status !== OrderStatus.SEARCHING_DRIVER) {
        console.log(`[DISPATCH MANAGER] Order ${orderId} is no longer searching (Status: ${dbOrder?.status}). Terminating dispatch.`);
        this.activeDispatches.delete(orderId);
        return;
      }
    } catch (e) {
      console.error(`[DISPATCH MANAGER] Error checking order status for ${orderId}:`, e);
    }

    // Advance index past any already declined or invalid drivers
    while (session.currentIndex < session.candidates.length) {
      const candidate = session.candidates[session.currentIndex];

      // Skip if driver already declined
      if (session.declinedDriverUserIds.has(candidate.driverUserId)) {
        session.currentIndex++;
        continue;
      }

      // Check if driver is still online and available in DB
      try {
        const driverDoc = await Driver.findOne({ user: candidate.driverUserId });
        if (!driverDoc || driverDoc.status !== DriverStatus.ONLINE || driverDoc.isAvailable === false) {
          console.log(`[DISPATCH MANAGER] Skipping candidate driverUser ${candidate.driverUserId} (Status: ${driverDoc?.status}, Available: ${driverDoc?.isAvailable})`);
          session.currentIndex++;
          continue;
        }
      } catch (dErr) {
        session.currentIndex++;
        continue;
      }

      // Valid driver found! Break to offer
      break;
    }

    // If candidate index exhausted, attempt fallback / notify no drivers
    if (session.currentIndex >= session.candidates.length) {
      console.log(`⚠️ [DISPATCH MANAGER] All ${session.candidates.length} candidate drivers declined or were unavailable for order ${orderId}`);
      this.notifyNoDriversAvailable(orderId, session.orderPayload?.customerUserId);
      this.activeDispatches.delete(orderId);
      return;
    }

    const currentCandidate = session.candidates[session.currentIndex];
    console.log(
      `🎯 [DISPATCH OFFER] Offering order ${orderId} to Driver #${session.currentIndex + 1}: ` +
      `User ${currentCandidate.driverUserId} (Doc: ${currentCandidate.driverId}, Distance: ${Math.round(currentCandidate.distanceMeters)}m)`
    );

    const socketManager = SocketManager.getInstance();

    // 1. Emit Socket event to this specific driver
    const payloadWithTimer = {
      ...session.orderPayload,
      offerTimeoutSeconds: 15,
      candidateSequenceIndex: session.currentIndex + 1,
      totalCandidateDrivers: session.candidates.length,
    };

    socketManager.emitToDriver(currentCandidate.driverUserId, "new_order", payloadWithTimer, "DispatchManager.offerNextDriver");

    // 2. Send Push Notification to this specific driver
    (async () => {
      try {
        const earnings = session.orderPayload.earnings || 0;
        await NotificationService.getInstance().sendNotification({
          userId: currentCandidate.driverUserId,
          title: "New Order Offer Nearby! 🚖",
          body: `Earn ~₹${earnings}. Tap to view order details before time expires!`,
          data: {
            orderId: orderId,
            type: "NEW_ORDER_OFFER",
          },
        });
      } catch (pErr: any) {
        console.warn(`[DISPATCH MANAGER] Failed to send push notification to driverUser ${currentCandidate.driverUserId}:`, pErr.message);
      }
    })();

    // 3. Set fallback 16s server timer for timeout cascade
    session.timer = setTimeout(async () => {
      console.log(`⏰ [DISPATCH TIMEOUT] Driver ${currentCandidate.driverUserId} did not accept order ${orderId} within 15s.`);

      // Revoke offer from driver screen via socket
      socketManager.emitToDriver(currentCandidate.driverUserId, "order_offer_expired", { orderId }, "DispatchManager.timeout");

      // Mark driver as declined for this order session
      session.declinedDriverUserIds.add(currentCandidate.driverUserId);
      session.currentIndex++;

      // Offer to next driver in sequence
      await this.offerNextDriver(orderId);
    }, this.OFFER_TIMEOUT_MS);
  }

  /**
   * Handle when a driver accepts the order
   */
  public handleDriverAccept(orderId: string, driverUserId: string): boolean {
    const session = this.activeDispatches.get(orderId);
    if (!session) return true; // Order may not be tracked in active dispatch

    const currentCandidate = session.candidates[session.currentIndex];

    // Verify driver is the active candidate
    if (currentCandidate && currentCandidate.driverUserId !== driverUserId) {
      console.warn(`[DISPATCH MANAGER] Driver ${driverUserId} attempted to accept order ${orderId}, but active candidate is ${currentCandidate.driverUserId}`);
    }

    if (session.timer) {
      clearTimeout(session.timer);
    }
    this.activeDispatches.delete(orderId);
    console.log(`✅ [DISPATCH SUCCESS] Order ${orderId} accepted by driver ${driverUserId}`);
    return true;
  }

  /**
   * Handle when a driver declines the order
   */
  public async handleDriverDecline(orderId: string, driverUserId: string): Promise<boolean> {
    const session = this.activeDispatches.get(orderId);
    if (!session) return false;

    console.log(`🛑 [DISPATCH DECLINE] Driver ${driverUserId} explicitly declined order ${orderId}`);

    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = undefined;
    }

    // Revoke offer from driver screen
    const socketManager = SocketManager.getInstance();
    socketManager.emitToDriver(driverUserId, "order_offer_expired", { orderId }, "DispatchManager.decline");

    session.declinedDriverUserIds.add(driverUserId);
    session.currentIndex++;

    // Immediately offer to next driver
    await this.offerNextDriver(orderId);
    return true;
  }

  /**
   * Handle when customer cancels order while dispatching
   */
  public handleCustomerCancel(orderId: string): void {
    const session = this.activeDispatches.get(orderId);
    if (!session) return;

    if (session.timer) {
      clearTimeout(session.timer);
    }

    const currentCandidate = session.candidates[session.currentIndex];
    if (currentCandidate) {
      const socketManager = SocketManager.getInstance();
      socketManager.emitToDriver(currentCandidate.driverUserId, "order_cancelled", { orderId }, "DispatchManager.customerCancel");
    }

    this.activeDispatches.delete(orderId);
    console.log(`🚫 [DISPATCH CANCELLED] Dispatch sequence cancelled for order ${orderId}`);
  }

  /**
   * Check which driver is currently being offered the order
   */
  public getCurrentOfferedDriverUserId(orderId: string): string | null {
    const session = this.activeDispatches.get(orderId);
    if (!session) return null;
    const current = session.candidates[session.currentIndex];
    return current ? current.driverUserId : null;
  }

  /**
   * Helper to notify customer when no drivers are available
   */
  private notifyNoDriversAvailable(orderId: string, customerUserId?: string) {
    if (!customerUserId) return;
    try {
      const socketManager = SocketManager.getInstance();
      socketManager.emitToUser(customerUserId, "no_drivers_available", {
        orderId,
        message: "No drivers available near your location right now. Please try again in a few moments.",
      }, "DispatchManager.noDrivers");
    } catch (e) {
      console.warn("[DISPATCH MANAGER] Failed to emit no_drivers_available:", e);
    }
  }

  /**
   * Cancel and clean up an order dispatch
   */
  public cancelDispatch(orderId: string): void {
    const session = this.activeDispatches.get(orderId);
    if (session) {
      if (session.timer) clearTimeout(session.timer);
      this.activeDispatches.delete(orderId);
    }
  }
}

export const dispatchManager = DispatchManagerService.getInstance();
