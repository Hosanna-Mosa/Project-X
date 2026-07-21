const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: 'e:/X/x25/Project-X/backend/.env' });

async function checkOrder() {
  await mongoose.connect(process.env.DATABASE_URL);
  
  const Order = mongoose.model('Order', new mongoose.Schema({ _id: String }, { strict: false }));
  
  const order = await Order.findOne({ _id: 'ORD-20260721-W3MGNP' });
  console.log("Order Stops:", JSON.stringify(order ? order.stops : "N/A", null, 2));
  
  process.exit(0);
}

checkOrder();
