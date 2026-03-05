import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
dotenv.config();

const ds = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clear() {
  await ds.initialize();
  await ds.query("DELETE FROM isolation_points CASCADE");
  await ds.query("DELETE FROM loto_tasks CASCADE");
  console.log("Deleted from remote Neon Postgres DB.");
  process.exit(0);
}
clear().catch(console.error);
