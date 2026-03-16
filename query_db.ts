import { AppDataSource } from "./lib/data-source";
import { User } from "./lib/entities/User";

async function run() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  const contractors = await repo.find({ where: { type: "contractor" } });
  console.log("Contractors found:", contractors.length);
  if (contractors.length > 0) {
    console.log(contractors.map(c => ({ id: c.id, name: c.name, type: c.type, company: (c as any).companyName })));
  }
  process.exit(0);
}
run().catch(console.error);
