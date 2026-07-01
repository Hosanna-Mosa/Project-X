const mongoose = require('mongoose');

const DATABASE_URL = "mongodb+srv://sunandvemavarapu_db_user:h5wPWY3uxifM95Rr@cluster0.tdar1ey.mongodb.net/?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB!");
    
    // Find the latest 10 orders
    const orders = await mongoose.connection.db.collection('orders')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
      
    if (orders.length === 0) {
      console.log("No orders found in DB!");
    } else {
      orders.forEach(order => {
        console.log(`Order ID: ${order._id} | Status: ${order.status} | isReserved: ${order.isReserved} | Driver: ${order.driver} | CreatedAt: ${order.createdAt}`);
      });
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
