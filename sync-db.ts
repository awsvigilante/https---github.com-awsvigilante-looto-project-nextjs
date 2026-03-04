import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./lib/entities/User";
import { LotoTask } from "./lib/entities/LotoTask";
import { IsolationPoint } from "./lib/entities/IsolationPoint";
import * as dotenv from "dotenv";

dotenv.config();

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Force sync
  logging: true,
  entities: [User, LotoTask, IsolationPoint],
});

async function sync() {
  try {
    console.log("Initializing database connection for sync...");
    await AppDataSource.initialize();
    console.log("Database schema synced successfully.");
    await AppDataSource.destroy();
  } catch (error) {
    console.error("Error syncing database:", error);
    process.exit(1);
  }
}

sync();
