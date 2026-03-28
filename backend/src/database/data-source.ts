import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "./entities/User";
import { Driver } from "./entities/Driver";
import { Order } from "./entities/Order";
import { Stop } from "./entities/Stop";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === "development", // Set to false in production
  logging: false,
  entities: [User, Driver, Order, Stop],
  migrations: ["src/database/migrations/*.ts"],
  ssl: isProd || !!process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  extra: {
    // Support for geography types requires PostGIS extension
  },
});
