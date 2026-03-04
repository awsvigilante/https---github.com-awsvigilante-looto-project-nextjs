import "reflect-metadata";
import { DataSource } from "typeorm";
import { LotoTask } from "./lib/entities/LotoTask";
import { User } from "./lib/entities/User";
import { IsolationPoint } from "./lib/entities/IsolationPoint";
import * as dotenv from "dotenv";

dotenv.config();

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [User, LotoTask, IsolationPoint],
});

async function check() {
  try {
    await AppDataSource.initialize();
    const tasks = await AppDataSource.getRepository(LotoTask).find({
      select: ["id", "lotoId", "status", "creatorId"],
      relations: ["creator"]
    });
    console.log(JSON.stringify(tasks, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
