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
  synchronize: false,
  logging: true,
  entities: [User, LotoTask, IsolationPoint],
});

async function clearLotos() {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    
    const pointRepo = AppDataSource.getRepository(IsolationPoint);
    const taskRepo = AppDataSource.getRepository(LotoTask);

    console.log("Deleting all isolation points...");
    // Using clear() to remove all rows
    await pointRepo.query('DELETE FROM isolation_points');
    
    console.log("Deleting all LOTO tasks...");
    await taskRepo.query('DELETE FROM loto_tasks');

    console.log("Database cleared successfully.");
    await AppDataSource.destroy();
  } catch (error) {
    console.error("Error clearing LOTO tasks:", error);
    process.exit(1);
  }
}

clearLotos();
