import User, { UserRole } from "./models/User";
import Driver, { DriverStatus } from "./models/Driver";
import Order, { OrderStatus, ServiceType, StopType } from "./models/Order";
import SupportTicket from "./models/SupportTicket";

export async function seedDatabase() {
  try {
    console.log("Checking database seed requirements...");

    // 1. Ensure at least one USER and one DRIVER exists
    let customer = await User.findOne({ role: UserRole.USER });
    if (!customer) {
      customer = new User({
        name: "Alex Rivera",
        email: "alex@example.com",
        phone: "+15550199",
        password: "password123",
        role: UserRole.USER
      });
      await customer.save();
      console.log("Seeded default Customer user Alex Rivera");
    }

    let driverUser = await User.findOne({ role: UserRole.DRIVER });
    if (!driverUser) {
      driverUser = new User({
        name: "Marcus Rodriguez",
        email: "marcus@example.com",
        phone: "+15550299",
        password: "password123",
        role: UserRole.DRIVER
      });
      await driverUser.save();
      console.log("Seeded default Driver user Marcus Rodriguez");
    }

    let driver = await Driver.findOne({ user: driverUser._id });
    if (!driver) {
      driver = new Driver({
        user: driverUser._id,
        vehicleType: "car",
        vehicleNumber: "CHI-402",
        status: DriverStatus.ONLINE,
        isAvailable: true,
        gender: "male",
        onboardingStatus: "completed"
      });
      await driver.save();
      console.log("Seeded default Driver profile CHI-402");
    }

    // 2. Ensure at least some Orders exist (including completed & multi-stops)
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      const order1 = new Order({
        _id: "ORD-9901",
        user: customer._id,
        driver: driver._id,
        status: OrderStatus.DELIVERED,
        serviceType: ServiceType.DELIVERY,
        totalDistance: 12.4,
        totalPrice: 180,
        priceBreakdown: {
          baseFare: 50,
          distanceFare: 100,
          timeFare: 30,
          surgeMultiplier: 1,
          total: 180
        },
        stops: [
          { sequence: 1, type: StopType.PICKUP, address: "Whole Foods Market, Chicago", location: { type: "Point", coordinates: [-87.63, 41.90] } },
          { sequence: 2, type: StopType.DROP, address: "Private Residence, 211 E Ohio St", location: { type: "Point", coordinates: [-87.62, 41.89] } }
        ],
        createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
      });
      await order1.save();

      const order2 = new Order({
        _id: "ORD-9918",
        user: customer._id,
        driver: driver._id,
        status: OrderStatus.DRIVER_ASSIGNED,
        serviceType: ServiceType.DELIVERY,
        totalDistance: 24.5,
        totalPrice: 320,
        priceBreakdown: {
          baseFare: 100,
          distanceFare: 200,
          timeFare: 20,
          surgeMultiplier: 1,
          total: 320
        },
        stops: [
          { sequence: 1, type: StopType.PICKUP, address: "North Star Distribution Center", location: { type: "Point", coordinates: [-87.65, 41.92] } },
          { sequence: 2, type: StopType.STOP, address: "Regional Hub B, Chicago", location: { type: "Point", coordinates: [-87.64, 41.91] } },
          { sequence: 3, type: StopType.DROP, address: "Downtown Retail Hub", location: { type: "Point", coordinates: [-87.63, 41.88] } }
        ],
        createdAt: new Date(Date.now() - 600000) // 10 mins ago
      });
      await order2.save();

      const order3 = new Order({
        _id: "ORD-9921",
        user: customer._id,
        driver: driver._id,
        status: OrderStatus.IN_TRANSIT,
        serviceType: ServiceType.DELIVERY,
        totalDistance: 42.8,
        totalPrice: 580,
        priceBreakdown: {
          baseFare: 150,
          distanceFare: 400,
          timeFare: 30,
          surgeMultiplier: 1,
          total: 580
        },
        stops: [
          { sequence: 1, type: StopType.PICKUP, address: "Port of Chicago, Terminal 4", location: { type: "Point", coordinates: [-87.68, 41.95] } },
          { sequence: 2, type: StopType.STOP, address: "Storage Hub 04", location: { type: "Point", coordinates: [-87.65, 41.93] } },
          { sequence: 3, type: StopType.DROP, address: "Residential Sector D", location: { type: "Point", coordinates: [-87.62, 41.90] } }
        ],
        createdAt: new Date()
      });
      await order3.save();

      console.log("Seeded completed, active, and multi-stop orders successfully");
    }

    // 3. Ensure support tickets exist
    const ticketCount = await SupportTicket.countDocuments();
    if (ticketCount === 0) {
      const tickets = [
        {
          ticketId: "QX-9901",
          title: "Order #ORD-9921 Delay",
          category: "DELAYED DELIVERY",
          status: "OPEN" as const,
          message: '"The driver has been stationary at the harbor for over 3 hours. I need an update on the medical supply shipment..."',
          user: "Alex Rivera",
          time: "2 mins ago",
          messages: [
            { sender: "system" as const, time: "TICKET OPENED • 10:45 AM", text: "" },
            { sender: "user" as const, time: "10:46 AM", text: "I've been monitoring the GPS for Order #ORD-9921. The driver has been at the Terminal 4 gate for 3 hours without moving. This cargo contains temperature-sensitive medical supplies." },
            { sender: "admin" as const, time: "10:48 AM", text: "Hello Alex, I'm checking the gate manifest now. It looks like there's a localized strike at Terminal 4 affecting heavy haulage. Let me contact the fleet lead directly." }
          ]
        },
        {
          ticketId: "QX-9902",
          title: "Billing Discrepancy",
          category: "MULTI-STOP ADJUSTMENT",
          status: "OPEN" as const,
          message: '"The automated billing for the third stop didn\'t include the waiting time surcharge as per our fleet contract."',
          user: "Sarah Jenkins",
          time: "15 mins ago",
          messages: [
            { sender: "system" as const, time: "TICKET OPENED • 10:30 AM", text: "" },
            { sender: "user" as const, time: "10:31 AM", text: "The automated billing for the third stop didn't include the waiting time surcharge as per our fleet contract." }
          ]
        },
        {
          ticketId: "QX-9903",
          title: "Damaged Goods Report",
          category: "QUALITY CONTROL",
          status: "OPEN" as const,
          message: '"Pallet arriving at warehouse B-12 shows signs of water damage. See attached photos for claim."',
          user: "David Chen",
          time: "1 hour ago",
          messages: [
            { sender: "system" as const, time: "TICKET OPENED • 9:45 AM", text: "" },
            { sender: "user" as const, time: "9:46 AM", text: "Pallet arriving at warehouse B-12 shows signs of water damage. See attached photos for claim." }
          ]
        }
      ];

      await SupportTicket.insertMany(tickets);
      console.log("Seeded default SupportTickets successfully");
    }

    console.log("Seed requirement check complete!");
  } catch (error) {
    console.error("Database seed failed", error);
  }
}
