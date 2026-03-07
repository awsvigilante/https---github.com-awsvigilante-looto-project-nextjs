import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./lib/entities/User.js";
import { LotoTask } from "./lib/entities/LotoTask.js";
import { IsolationPoint } from "./lib/entities/IsolationPoint.js";
import { ContractorLock } from "./lib/entities/ContractorLock.js";

const SyncDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: true,
  entities: [User, LotoTask, IsolationPoint, ContractorLock],
});

async function sync() {
  try {
    console.log("Initializing database connection & syncing schema...");
    await SyncDataSource.initialize();
    console.log("Database schema updated successfully.");
    await SyncDataSource.destroy();
  } catch (error) {
    console.error("Error syncing database:", error);
    process.exit(1);
  }
}

sync();
