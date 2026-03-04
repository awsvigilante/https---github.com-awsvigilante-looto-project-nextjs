import "reflect-metadata";
import { AppDataSource } from "./lib/data-source.js";

async function run() {
    await AppDataSource.initialize();
    try {
        await AppDataSource.query(`ALTER TABLE isolation_points ADD COLUMN "requiredPosition" varchar`);
        console.log("Column added successfully!");
    } catch (e: any) {
        if (e.message.includes("already exists")) {
            console.log("Column already exists.");
        } else {
            console.error(e);
        }
    }
    await AppDataSource.destroy();
}
run();
