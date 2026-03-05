import "reflect-metadata";
import { AppDataSource } from "./lib/data-source.js";
import { LotoTask } from "./lib/entities/LotoTask.js";

async function run() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(LotoTask);
  const tasks = await repo.find({ relations: ['supervisor', 'approver', 'primaryOperator'] });
  console.log(JSON.stringify(tasks.map(t => ({
    id: t.id,
    lotoId: t.lotoId,
    status: t.status,
    supervisorId: t.supervisor?.id,
    supervisorName: t.supervisor?.name,
    approverId: t.approver?.id
  })), null, 2));
  process.exit();
}
run();
