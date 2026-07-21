const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '.env') });

async function checkDrivers() {
  await mongoose.connect(process.env.DATABASE_URL);
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));

  // Find user Mahi
  const mahiUser = await User.findOne({ name: { $regex: /mahi/i } });
  console.log("Mahi User:", mahiUser ? mahiUser._id : "Not Found");

  if (mahiUser) {
    const mahiDriver = await Driver.findOne({ user: mahiUser._id });
    console.log("Mahi Driver Status:", mahiDriver ? mahiDriver.status : "No Driver profile");
    console.log("Mahi Driver isAvailable:", mahiDriver ? mahiDriver.isAvailable : "N/A");
    console.log("Mahi Driver vehicleType:", mahiDriver ? mahiDriver.vehicleType : "N/A");
    console.log("Mahi Driver preferredZone:", mahiDriver ? mahiDriver.preferredZone : "N/A");
    console.log("Mahi Driver ID:", mahiDriver ? mahiDriver._id : "N/A");
  }

  process.exit(0);
}

checkDrivers();
