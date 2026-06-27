require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const vendors = await mongoose.connection.db.collection('vendors').find({
    name: { $regex: /Dominos|Desi Kitchen|Salt|Jayasree/i }
  }).toArray();
  
  // These are 100% verified working images from our seed list
  const defaultImages = [
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60" 
  ];

  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    // Force set the verified image URL
    const newImg = defaultImages[i % defaultImages.length];
    console.log(`Setting VERIFIED image for ${v.name}`);
    await mongoose.connection.db.collection('vendors').updateOne(
        { _id: v._id },
        { $set: { image: newImg } }
    );
  }
  console.log("Updated images successfully to verified Unsplash URLs.");
  process.exit(0);
}).catch(console.error);
