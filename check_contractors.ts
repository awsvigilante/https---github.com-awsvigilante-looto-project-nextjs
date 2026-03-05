import "reflect-metadata";
import { AppDataSource } from "./lib/data-source.js";
import { User } from "./lib/entities/User.js";

async function check() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  const users = await repo.find({ where: { type: "contractor" } });
  console.log("All Contractor Users:", users);
  await AppDataSource.destroy();
}
check();
