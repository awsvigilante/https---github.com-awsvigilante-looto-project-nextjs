import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { LotoTask } from "./entities/LotoTask";
import { IsolationPoint } from "./entities/IsolationPoint";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false, // Prevents Next.js HMR from wiping the DB
  logging: false,
  entities: [User, LotoTask, IsolationPoint],
  migrations: [],
  subscribers: [],
});

// Added to force Next.js HMR to reload this module and clear the TypeORM cache
console.log("[db] Initializing new TypeORM DataSource instance...");

let initializedDataSource: DataSource | null = null;

export const getDataSource = async () => {
  if (initializedDataSource) {
    return initializedDataSource;
  }
  
  if (AppDataSource.isInitialized) {
    initializedDataSource = AppDataSource;
    return initializedDataSource;
  }

  console.log("[db] Awaiting AppDataSource.initialize()");
  await AppDataSource.initialize();
  initializedDataSource = AppDataSource;
  return initializedDataSource;
};
