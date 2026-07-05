import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Vendor from "../src/database/models/Vendor";
import FoodItem from "../src/database/models/FoodItem";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/project-x";

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Rajamahendravaram Coordinates
    const rajahmundryLat = 17.0005;
    const rajahmundryLng = 81.8040;

    // 1. Alif Restaurant
    const alifVendor = new Vendor({
      name: "Alif",
      email: "alif.rajahmundry@example.com",
      phone: "9876543210",
      address: "Main Road, Rajamahendravaram",
      location: {
        type: "Point",
        coordinates: [rajahmundryLng, rajahmundryLat + 0.005]
      },
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
      rating: 4.8,
      reviews: "1.2k+",
      categories: ["Biryani", "North Indian", "Mughlai", "Fast Food"],
      partnerType: "food",
      isOpen: true,
      isPureVeg: false,
      deliveryFee: 40,
      minOrderValue: 150
    });
    
    await alifVendor.save();
    console.log("Created Vendor: Alif");

    const alifItems = [
      {
        name: "Chicken Dum Biryani Single",
        description: "Freshly cooked Chicken Dum Biryani Single prepared using fresh ingredients and traditional recipes. Served hot and fresh.",
        price: 145,
        category: "Biryani",
        isVeg: false,
        images: ["https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80"]
      },
      {
        name: "Chicken Dum Biryani Family Pack",
        description: "Freshly cooked Chicken Dum Biryani Family Pack prepared using fresh ingredients. Serves 3-4.",
        price: 399,
        category: "Biryani",
        isVeg: false,
        images: ["https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&q=80"]
      },
      {
        name: "Chicken Tikka Kebab",
        description: "Juicy chicken chunks marinated in spices and yogurt, grilled in tandoor.",
        price: 220,
        category: "Starters",
        isVeg: false,
        images: ["https://images.unsplash.com/photo-1599487405270-864b73b3137a?w=800&q=80"]
      },
      {
        name: "Paneer Butter Masala",
        description: "Rich and creamy dish of paneer in a tomato, butter and cashew sauce.",
        price: 180,
        category: "Curries",
        isVeg: true,
        images: ["https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&q=80"]
      },
      {
        name: "Butter Naan",
        description: "Soft Indian flatbread made in tandoor and brushed with butter.",
        price: 45,
        category: "Breads",
        isVeg: true,
        images: ["https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80"]
      }
    ];

    for (const item of alifItems) {
      await FoodItem.create({ ...item, vendorId: alifVendor._id });
    }
    console.log("Created Alif Food Items");


    // 2. Barkas Arabian Kitchen
    const barkasVendor = new Vendor({
      name: "Barkas Arabian Kitchen",
      email: "barkas.rajy@example.com",
      phone: "9876543211",
      address: "Danavaipeta, Rajamahendravaram",
      location: {
        type: "Point",
        coordinates: [rajahmundryLng - 0.008, rajahmundryLat]
      },
      image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
      rating: 4.6,
      reviews: "850+",
      categories: ["Arabian", "Mandi", "Desserts", "Beverages"],
      partnerType: "food",
      isOpen: true,
      isPureVeg: false,
      deliveryFee: 50,
      minOrderValue: 200
    });
    
    await barkasVendor.save();
    console.log("Created Vendor: Barkas Arabian Kitchen");

    const barkasItems = [
      {
        name: "Chicken Faham Mandi",
        description: "Traditional Arabian Mandi with tender grilled Faham chicken served on aromatic rice.",
        price: 350,
        category: "Mandi",
        isVeg: false,
        images: ["https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80"]
      },
      {
        name: "Mutton Juicy Mandi",
        description: "Succulent, fall-off-the-bone mutton served on a bed of flavorful Mandi rice.",
        price: 450,
        category: "Mandi",
        isVeg: false,
        images: ["https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80"]
      },
      {
        name: "Chicken Shawarma",
        description: "Authentic Lebanese chicken shawarma with garlic sauce, wrapped in khubz.",
        price: 120,
        category: "Starters",
        isVeg: false,
        images: ["https://images.unsplash.com/photo-1662116766029-63a2a2f8d839?w=800&q=80"]
      },
      {
        name: "Kunafa",
        description: "Classic Middle Eastern dessert made with shredded phyllo dough, cheese, and sweet syrup.",
        price: 180,
        category: "Desserts",
        isVeg: true,
        images: ["https://images.unsplash.com/photo-1598215439218-f79b40d6c117?w=800&q=80"]
      },
      {
        name: "Mint Lemonade",
        description: "Refreshing Arabian style mint lemonade to complement your heavy meal.",
        price: 80,
        category: "Beverages",
        isVeg: true,
        images: ["https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80"]
      }
    ];

    for (const item of barkasItems) {
      await FoodItem.create({ ...item, vendorId: barkasVendor._id });
    }
    console.log("Created Barkas Food Items");

    console.log("Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
