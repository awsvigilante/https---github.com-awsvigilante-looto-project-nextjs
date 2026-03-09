// check-status.ts
import * as dotenv from "dotenv";
dotenv.config();

import { getDataSource } from "./lib/data-source";
import { LotoTask } from "./lib/entities/LotoTask";

async function checkStatus() {
  try {
    const dataSource = await getDataSource();
    const lotoTaskRepository = dataSource.getRepository(LotoTask);
    
    // Look for all tasks assigned to Mike Johnson (id: 7575b871-8203-4934-a2fa-e8375a53c760)
    const tasks = await lotoTaskRepository.find({
      where: { primaryOperatorId: "7575b871-8203-4934-a2fa-e8375a53c760" },
      select: ["id", "lotoId", "equipmentName", "status"]
    });

    console.log(`Found ${tasks.length} tasks for Mike Johnson:`);
    tasks.forEach(t => {
      console.log(`- ID: ${t.id} | LOTO ID: ${t.lotoId} | Equipment: ${t.equipmentName} | Status: ${t.status}`);
    });

    // explicitly check the specific bde3f023... ID just in case
    const specificTask = await lotoTaskRepository.findOne({
      where: { id: "bde3f023-337c-4380-b249-959a25f9e0f3" }
    });

    console.log("\nSpecific Task Details (bde3f023...):");
    console.log(`Status: ${specificTask?.status || 'Not Found'}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkStatus();
