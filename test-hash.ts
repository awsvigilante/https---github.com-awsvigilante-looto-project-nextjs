import { AppDataSource } from "./lib/data-source.js";
import { User } from "./lib/entities/User.js";
import bcrypt from "bcryptjs";

async function check() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { email: "admin@looto.com" } });
  
  if (!user) {
    console.log("no user!");
    process.exit(1);
  }

  console.log("Hash in DB:", user.password);
  const isMatch = await bcrypt.compare("password123", user.password);
  console.log("Matches password123?", isMatch);

  process.exit(0);
}

check().catch(console.error);
