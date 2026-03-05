import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { LotoTask } from "./entities/LotoTask";
import { IsolationPoint } from "./entities/IsolationPoint";
import { Notification } from "./entities/Notification";
import { ContractorLock } from "./entities/ContractorLock";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import * as neonPg from "@neondatabase/serverless";

// Route all pg connections through WebSockets (port 443) so Neon works
// even when ISP/firewall blocks port 5432
neonConfig.webSocketConstructor = ws;

// Monkey-patch: make TypeORM's internal require("pg") return the Neon serverless driver
// This allows TypeORM to use WebSocket connections instead of TCP
if (process.env.DATABASE_URL?.includes("neon.tech")) {
  try {
    const pgPath = require.resolve("pg");
    require.cache[pgPath] = {
      ...require.cache[pgPath]!,
      exports: neonPg,
    } as NodeModule;
  } catch (_) { /* pg not cached yet — will be patched on first load */ }
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: false,
  entities: [User, LotoTask, IsolationPoint, Notification, ContractorLock],
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
