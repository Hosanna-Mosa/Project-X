const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { connectDB } = require("./src/database/db");
const User = require("./src/database/models/User").default;

dotenv.config();

async function run() {
  console.log("Connecting to database...");
  await connectDB();
  
  console.log("Querying users with push tokens...");
  const users = await User.find({ expoPushToken: { $exists: true, $ne: null } }).select("name phone role expoPushToken");
  
  console.log(`Found ${users.length} users/drivers with push tokens:`);
  users.forEach(u => {
    console.log(`- ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, Token: ${u.expoPushToken}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
 