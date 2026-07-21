const mongoose = require('mongoose');

async function testQuery() {
  try {
    await mongoose.connect('mongodb+srv://sunandvemavarapu_db_user:h5wPWY3uxifM95Rr@cluster0.tdar1ey.mongodb.net/?appName=Cluster0');
    const drivers = await mongoose.connection.collection('drivers').find({ status: "ONLINE", isAvailable: true }).toArray();
    console.log("Online drivers found in Atlas:", drivers.length);
    for (const d of drivers) {
      console.log(`Driver: ${d._id}, vehicleType: ${d.vehicleType}, status: ${d.status}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}
testQuery();
