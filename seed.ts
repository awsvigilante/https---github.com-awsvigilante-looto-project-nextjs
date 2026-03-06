import "dotenv/config";
import "reflect-metadata";
import bcrypt from "bcryptjs";
import { AppDataSource } from "./lib/data-source.js";
import { User } from "./lib/entities/User.js";

async function seed() {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    console.log("Connection established.");

    const userRepo = AppDataSource.getRepository(User);

    const seedUsers = [
      { email: "admin@looto.com",        password: "password123", name: "Admin User",       type: "company", role: "admin" },
      { email: "operator@looto.com",     password: "password123", name: "Mike Johnson",     type: "company", role: "operator" },
      { email: "engineer@looto.com",     password: "password123", name: "David Okonkwo",    type: "company", role: "shift_engineer" },
      { email: "supervisor@looto.com",   password: "password123", name: "Lisa Chen",        type: "company", role: "supervisor" },
      { email: "apex@contractor.com",    password: "password123", name: "Apex Industrial",  type: "contractor", role: "contractor", lotoId: "LOTO-2026-000789", contractorNumber: "C-9999" },
    ];

    for (const u of seedUsers) {
      const existing = await userRepo.findOne({ where: { email: u.email } });
      const hashed = await bcrypt.hash(u.password, 10);
      
      if (existing) {
        console.log(`Updating existing: ${u.email}`);
        userRepo.merge(existing, { ...u, password: hashed });
        await userRepo.save(existing);
      } else {
        console.log(`Creating new: ${u.email}`);
        const user = userRepo.create({ ...u, password: hashed });
        await userRepo.save(user);
      }
      console.log(`Synced: ${u.name} (${u.role})`);
    }

    console.log("\nAll users re-seeded successfully.");
    await AppDataSource.destroy();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
