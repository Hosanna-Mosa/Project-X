import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Vendor from "../database/models/Vendor";
import FoodItem from "../database/models/FoodItem";

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL || "mongodb://localhost:27017/logistics-platform";

// Mock Images for Restaurants
const VEG_REST_IMAGES = [
  "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=60", // South Indian Meals
  "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=60", // Samosa/Snacks
  "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=60", // Paneer Tikka
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60", // Healthy Veg Salad
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=60", // Buddha Bowl
];

const NON_VEG_REST_IMAGES = [
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60", // Biryani
  "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&auto=format&fit=crop&q=60", // Tandoori Chicken
  "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=60", // Chicken Fried Rice
  "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=60", // Fried Chicken
  "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=60", // Gravy Chicken
];

// Mock Images for Menu Items
const MENU_IMAGES = {
  idli: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&auto=format&fit=crop&q=60",
  dosa: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&auto=format&fit=crop&q=60",
  vada: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&auto=format&fit=crop&q=60",
  paneer: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=60",
  vegBiryani: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=60",
  meals: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=400&auto=format&fit=crop&q=60",
  chickenBiryani: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&auto=format&fit=crop&q=60",
  muttonBiryani: "https://images.unsplash.com/photo-1545247181-516773cae76d?w=400&auto=format&fit=crop&q=60",
  chicken65: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&auto=format&fit=crop&q=60",
  butterChicken: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=60",
  fishCurry: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&auto=format&fit=crop&q=60",
};

// Cities Config
const CITIES = [
  {
    name: "Visakhapatnam",
    coordinates: [83.2185, 17.6868],
    areas: ["Gajuwaka", "MVP Colony", "Siripuram", "Jagadamba Junction", "Rushikonda", "Maharanipeta", "Seethammadhara", "Akkayyapalem", "Dwaraka Nagar"]
  },
  {
    name: "East Godavari",
    coordinates: [82.2475, 16.9891], // Kakinada Center
    areas: ["Bhanugudi Junction", "Ramaraopeta", "Srinagar", "Kandarada", "Anakapalle Road", "Subhash Road", "Jagatmapeta", "NFCL Road", "Gandhinagar"]
  },
  {
    name: "West Godavari",
    coordinates: [81.1018, 16.7107], // Eluru Center
    areas: ["Powerpet", "RR Pet", "Vatluru", "Sanivarapupeta", "Ramachandra Rao Pet", "Ashok Nagar", "Tangellamudi", "Eluru Bazar", "Chodimella"]
  },
  {
    name: "Rajahmundry",
    coordinates: [81.7831, 17.0005],
    areas: ["Danavaipeta", "Innespeta", "Aryapuram", "Syed Appalaswamy Street", "Kambala Cheruvu", "Prakash Nagar", "Lalacheruvu", "Morampudi", "Dowleswaram"]
  },
  {
    name: "Vijayawada",
    coordinates: [80.6480, 16.5062],
    areas: ["Benz Circle", "Governorpet", "Moghalrajpuram", "Patamata", "Gunadala", "One Town", "Gurunanak Nagar", "Labbipet", "Kanuru"]
  },
  {
    name: "Hyderabad",
    coordinates: [78.4867, 17.3850],
    areas: ["Hitech City", "Gachibowli", "Madhapur", "Jubilee Hills", "Banjara Hills", "Kondapur", "Kukatpally", "Begumpet", "Secunderabad"]
  }
];

// Restaurant Name Seeds
const VEG_NAMES = [
  "Sree Panchami Pure Veg",
  "Udupi Sri Krishna Vilas",
  "Dwaraka Veg Court",
  "Santosh Dhaba Exclusive",
  "Minerva Coffee Shop",
  "Subayya Gari Hotel (Veg)",
  "Gokul Veg Restaurant",
  "Sai Ram Tiffin Center",
  "Chutneys Restaurant",
  "Taj Mahal Hotel (Veg)",
  "Tatva Gourmet Veg",
  "Sri Saravana Bhavan",
  "A2B Veg Restaurant",
  "Kamats Veg",
  "Swagath Pure Veg",
  "Sagar Ratna",
  "NVR Pure Veg",
  "Vasudev Adiga's"
];

const NON_VEG_NAMES = [
  "Kritunga Restaurant",
  "Paradise Biryani",
  "Mehfil Multicuisine",
  "Grand Bahar Restaurant",
  "Rayalaseema Ruchulu",
  "Spicy Venue",
  "Lucky Restaurant",
  "Capital Kitchen",
  "Bawarchi Restaurant",
  "Pista House",
  "Srikanya Comfort",
  "Shah Ghouse Hotel",
  "Pista House Biryani",
  "Hotel Shadab",
  "Alpha Hotel",
  "Deccan Spice",
  "Imperial Restaurant",
  "Jewel of Nizams"
];

// Menu Items Seeds
const VEG_MENU = [
  { name: "Special Ghee Karam Dosa", category: "Breakfast", price: 90, description: "Crispy rice crepe with clarified butter and spicy red chili powder.", image: MENU_IMAGES.dosa, isVeg: true },
  { name: "Steamed Button Idli (4 pcs)", category: "Breakfast", price: 60, description: "Soft, fluffy steamed rice cakes served with sambar and fresh coconut chutney.", image: MENU_IMAGES.idli, isVeg: true },
  { name: "Garry Sambar Vada (2 pcs)", category: "Breakfast", price: 70, description: "Deep-fried savory lentil donuts soaked in hot aromatic sambar.", image: MENU_IMAGES.vada, isVeg: true },
  { name: "Andhra Special Veg Thali", category: "Meals", price: 180, description: "Authentic Andhra meals containing rice, pappu, charu, kootu, fry, curd, and avakaya pickle.", image: MENU_IMAGES.meals, isVeg: true },
  { name: "Gongura Veg Biryani", category: "Biryani", price: 230, description: "Fragrant basmati rice cooked with mixed vegetables and tangy sorrel leaves (gongura).", image: MENU_IMAGES.vegBiryani, isVeg: true },
  { name: "Paneer Butter Masala", category: "Main Course", price: 260, description: "Cottage cheese cubes simmered in a rich, creamy, and mildly sweet onion-tomato gravy.", image: MENU_IMAGES.paneer, isVeg: true }
];

const NON_VEG_MENU = [
  { name: "Hyderabadi Chicken Dum Biryani", category: "Biryani", price: 290, description: "Aromatic basmati rice layered with marinated chicken, saffron, and traditional spices, slow-cooked in dum style.", image: MENU_IMAGES.chickenBiryani, isVeg: false },
  { name: "Special Mutton Juicy Kheema Biryani", category: "Biryani", price: 380, description: "Fragrant basmati rice served with minced mutton meat cooked in spicy gravy.", image: MENU_IMAGES.muttonBiryani, isVeg: false },
  { name: "Andhra Spicy Chicken 65", category: "Starters", price: 240, description: "Deep-fried marinated chicken chunks tossed with curry leaves, yogurt, and green chilies.", image: MENU_IMAGES.chicken65, isVeg: false },
  { name: "Nellore Chepala Pulusu (Fish Curry)", category: "Main Course", price: 320, description: "Traditional tangy fish curry made with raw mango and tamarind pulp.", image: MENU_IMAGES.fishCurry, isVeg: false },
  { name: "Butter Chicken Masala", category: "Main Course", price: 280, description: "Tandoori chicken pieces cooked in a rich, velvety tomato butter gravy.", image: MENU_IMAGES.butterChicken, isVeg: false },
  { name: "Steamed Rice with Pappu (Lentils)", category: "Meals", price: 120, description: "Comforting plain rice served with traditional yellow lentils and ghee.", image: MENU_IMAGES.meals, isVeg: true }
];

async function seedRestaurants() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully to MongoDB Database:", mongoose.connection.name);

    const cityNames = CITIES.map(c => c.name);
    cityNames.push("Vishakhapatnam"); // Clean up old spelling too
    console.log(`Finding existing vendors in: ${cityNames.join(", ")}`);
    
    // Find existing vendors in these cities to clean up
    const existingVendors = await Vendor.find({
      "detailedAddress.city": { $in: cityNames }
    });
    
    const vendorIds = existingVendors.map(v => v._id);
    
    if (vendorIds.length > 0) {
      console.log(`Deleting ${vendorIds.length} existing vendors in target cities...`);
      await Vendor.deleteMany({ _id: { $in: vendorIds } });
      
      console.log("Deleting associated food menu items...");
      const deletedFoodItems = await FoodItem.deleteMany({ vendorId: { $in: vendorIds } });
      console.log(`Deleted ${deletedFoodItems.deletedCount} food items.`);
    }

    let vendorCounter = 0;
    let foodItemCounter = 0;

    for (let cityIndex = 0; cityIndex < CITIES.length; cityIndex++) {
      const cityConfig = CITIES[cityIndex];
      console.log(`\n--- Seeding City: ${cityConfig.name} ---`);
      
      // We will seed 24 restaurants in each city (12 Veg and 12 Non-Veg)
      for (let i = 0; i < 24; i++) {
        const isVeg = i < 12; // First 12 are Veg, next 12 are Non-Veg
        
        // Randomly pick unique names and configurations
        const nameList = isVeg ? VEG_NAMES : NON_VEG_NAMES;
        const nameBase = nameList[i % nameList.length];
        const area = cityConfig.areas[i % cityConfig.areas.length];
        const restaurantName = `${nameBase} - ${area}`;
        
        const phone = `98765${cityIndex}${isVeg ? "0" : "1"}${i.toString().padStart(2, "0")}`;
        const email = `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`;
        
        // Vary coordinates slightly from city center (add offset)
        // Offset: ~0.005 to 0.015 degrees (approx 500m to 1.5km)
        const latOffset = (Math.random() - 0.5) * 0.03;
        const lngOffset = (Math.random() - 0.5) * 0.03;
        const coordinates = [
          parseFloat((cityConfig.coordinates[0] + lngOffset).toFixed(6)),
          parseFloat((cityConfig.coordinates[1] + latOffset).toFixed(6))
        ];

        const address = `${i + 10} / A, ${area}, near Main Center, ${cityConfig.name}, Andhra Pradesh`;
        const image = isVeg 
          ? VEG_REST_IMAGES[i % VEG_REST_IMAGES.length]
          : NON_VEG_REST_IMAGES[i % NON_VEG_REST_IMAGES.length];
          
        const categories = isVeg 
          ? ["South Indian", "North Indian", "Tiffins", "Chinese Veg"]
          : ["Biryani", "Andhra Special", "Tandoori", "North Indian"];

        const rating = parseFloat((4.0 + Math.random() * 0.9).toFixed(1));
        const reviewsNum = Math.floor(50 + Math.random() * 950);
        const reviews = reviewsNum > 500 ? `${(reviewsNum/100).toFixed(1)}K+` : `${reviewsNum}`;

        // Create Vendor
        const vendor = new Vendor({
          name: restaurantName,
          phone,
          email,
          password: "password123", // Default placeholder password for portal login
          location: {
            type: "Point",
            coordinates: coordinates
          },
          address,
          detailedAddress: {
            shopNo: `${i + 10} / A`,
            floor: "Ground Floor",
            area,
            city: cityConfig.name,
            landmark: "Main Center Road",
            formattedAddress: address
          },
          image,
          rating,
          reviews,
          categories,
          isPureVeg: isVeg,
          isOpen: true,
          deliveryFee: isVeg ? 25 : 35,
          minOrderValue: isVeg ? 150 : 200,
          partnerType: "food"
        });

        await vendor.save();
        vendorCounter++;
        console.log(`Seeded Restaurant: "${restaurantName}" (${isVeg ? "Veg" : "Non-Veg"}) in ${cityConfig.name}`);

        // Seed FoodItems (Menu items) for this Restaurant
        const menuToSeed = isVeg ? VEG_MENU : NON_VEG_MENU;
        for (const item of menuToSeed) {
          const foodItem = new FoodItem({
            vendorId: vendor._id,
            name: item.name,
            description: item.description,
            price: item.price,
            images: [item.image],
            category: item.category,
            isAvailable: true,
            isVeg: item.isVeg
          });
          
          await foodItem.save();
          foodItemCounter++;
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`SEEDING SUMMARY:`);
    console.log(`Total Restaurants (Vendors) Created: ${vendorCounter}`);
    console.log(`Total Food Items (Menu) Created: ${foodItemCounter}`);
    console.log(`==================================================`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding restaurants and menu items:", error);
    process.exit(1);
  }
}

seedRestaurants();
