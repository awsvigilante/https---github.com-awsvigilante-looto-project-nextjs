import "reflect-metadata";
import { AppDataSource } from "./lib/data-source.js";
import { User } from "./lib/entities/User.js";

async function test() {
  try {
    await AppDataSource.initialize();
    
    console.log("--- RAW SQL (users) ---");
    const rawUsers1 = await AppDataSource.query("SELECT * FROM users;");
    console.log(rawUsers1);
    
    console.log("--- RAW SQL (user) ---");
    try {
      const rawUsers2 = await AppDataSource.query("SELECT * FROM \"user\";");
      console.log(rawUsers2);
    } catch(e) { console.log("No table 'user'"); }
    
    console.log("--- TYPEORM REPO ---");
    const repoUsers = await AppDataSource.getRepository(User).find();
    console.log(repoUsers);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
test();
