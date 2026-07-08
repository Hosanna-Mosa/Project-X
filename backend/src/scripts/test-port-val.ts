import * as dotenv from "dotenv";
dotenv.config();

console.log("process.env.PORT raw value:", JSON.stringify(process.env.PORT));
console.log("Parsed port value:", parseInt(process.env.PORT || "5000", 10));
