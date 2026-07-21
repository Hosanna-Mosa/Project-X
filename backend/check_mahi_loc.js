const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '.env') });

async function checkDrivers() {
  await mongoose.connect(process.env.DATABASE_URL);
  
  const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));
  
  const mahiDriver = await Driver.findOne({ user: new mongoose.Types.ObjectId('6a453f1cecb0e2672c8b06aa') });
  console.log("Mahi Driver Location:", mahiDriver ? mahiDriver.currentLocation : "N/A");
  
  process.exit(0);
}

checkDrivers();
