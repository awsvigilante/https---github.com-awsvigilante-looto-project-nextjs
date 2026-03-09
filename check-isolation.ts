// check-isolation.ts
import * as dotenv from "dotenv";
dotenv.config();

import { getDataSource } from "./lib/data-source";
import { LotoTask } from "./lib/entities/LotoTask";

async function checkIsolation() {
  try {
    const dataSource = await getDataSource();
    const lotoTaskRepository = dataSource.getRepository(LotoTask);
    
    const loto = await lotoTaskRepository.findOne({
      where: { id: "bde3f023-337c-4380-b249-959a25f9e0f3" },
      relations: ["primaryOperator"]
    });

    if (loto) {
      console.log("=========================================");
      console.log(`LOTO ID: ${loto.id}`);
      console.log(`Stage: ${loto.status}`);
      console.log(`Primary Operator ID: ${loto.primaryOperator?.id || 'null'}`);
      console.log(`Primary Operator Name: ${loto.primaryOperator?.name || 'null'}`);
      console.log("=========================================");
    } else {
      console.log("Task not found.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkIsolation();
