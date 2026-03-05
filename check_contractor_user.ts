import "reflect-metadata";
import { AppDataSource } from "./lib/data-source.js";
import { User } from "./lib/entities/User.js";

async function check() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  const c = await repo.findOne({ where: { type: "contractor" } });
  console.log("Contractor User:", c);
  await AppDataSource.destroy();
}
check();
