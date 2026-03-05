import "reflect-metadata";
import { AppDataSource } from "./lib/data-source.js";
import { LotoTask } from "./lib/entities/LotoTask.js";

async function check() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(LotoTask);
  const tasks = await repo.find();
  for (const t of tasks) {
    console.log(`ID: ${t.lotoId} | Status: ${t.status}`);
  }
  await AppDataSource.destroy();
}
check();
