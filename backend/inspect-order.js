const mongoose = require('mongoose');

const DATABASE_URL = "mongodb+srv://sunandvemavarapu_db_user:h5wPWY3uxifM95Rr@cluster0.tdar1ey.mongodb.net/?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB!");
    
    // Find the latest order
    const order = await mongoose.connection.db.collection('orders')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
      
    if (!order) {
      console.log("No orders found in DB!");
    } else {
      console.log("Order ID:", order._id);
      console.log("Status:", order.status);
      console.log("Stops:", JSON.stringify(order.stops, null, 2));
      console.log("Polyline length:", order.polyline ? order.polyline.length : 0);
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
