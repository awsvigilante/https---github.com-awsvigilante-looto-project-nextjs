import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./lib/data-source.js";
import { LotoTask } from "./lib/entities/LotoTask.js";
import { IsolationPoint } from "./lib/entities/IsolationPoint.js";
import { User } from "./lib/entities/User.js";

async function seedTask() {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    
    const userRepo = AppDataSource.getRepository(User);
    const taskRepo = AppDataSource.getRepository(LotoTask);
    const pointRepo = AppDataSource.getRepository(IsolationPoint);

    // Get the users
    const operator = await userRepo.findOne({ where: { email: "operator@looto.com" } });
    const engineer = await userRepo.findOne({ where: { email: "engineer@looto.com" } });
    const supervisor = await userRepo.findOne({ where: { email: "supervisor@looto.com" } });
    
    if (!operator || !engineer || !supervisor) {
      console.error("Seed users not found! Run npm run db:seed first.");
      process.exit(1);
    }

    // Delete existing task if present to avoid conflicts
    const existing = await taskRepo.findOne({ where: { lotoId: "LOTO-2026-000789" } });
    if (existing) {
       await pointRepo.delete({ taskId: existing.id });
       // We'll let cascading handle it, or we delete points manually first as done above
       await taskRepo.delete({ id: existing.id });
       console.log("Deleted old LOTO-2026-000789 task to recreate.");
    }

    console.log("Creating verified LOTO task...");
    
    // Create the task in Isolation Verified / Active status
    const task = taskRepo.create({
      lotoId: "LOTO-2026-000789",
      facility: "Power Lab",
      equipmentName: "Water Softener A",
      reasonForIsolation: "Annual maintenance and contractor inspection.",
      lockBoxNumber: "LB-404",
      redTagMasterNo: "RTM-001",
      expectedDuration: "2 Days",
      numIsolationPoints: 2,
      status: "Isolation Verified / Active",
      creatorId: operator.id,
      primaryOperatorId: operator.id,
      approverId: engineer.id,
      approvedById: engineer.id,
      supervisorId: supervisor.id,
      operatorSignature: "Mike Johnson",
      operatorSignedAt: new Date().toISOString(),
      supervisorSignature: "Lisa Chen",
      supervisorSignedAt: new Date().toISOString(),
      tagsAttachedAt: new Date().toISOString(),
      // Adding comments just to have some data
      comments: [
         {
           text: "Approved for isolation. Contractors are scheduled for tomorrow.",
           author: "David Okonkwo (shift_engineer)",
           timestamp: new Date(Date.now() - 86400000).toISOString()
         }
      ]
    });

    const savedTask = await taskRepo.save(task);

    // Create the Isolation Points
    const pt1 = pointRepo.create({
      taskId: savedTask.id,
      tagNo: 1,
      isolationDescription: "Main Disconnect Switch",
      normalPosition: "CLOSED",
      requiredPosition: "OPEN",
      lockNumber: "042",
      isolationPosition: "OPEN",
      lockOnInitial1: "Mike Johnson - " + new Date().toLocaleString("en-CA", { hour12: false }),
      lockOnInitial2: "Lisa Chen - " + new Date().toLocaleString("en-CA", { hour12: false }),
    });

    const pt2 = pointRepo.create({
      taskId: savedTask.id,
      tagNo: 2,
      isolationDescription: "Inlet Water Valve",
      normalPosition: "OPEN",
      requiredPosition: "CLOSED",
      lockNumber: "043",
      isolationPosition: "CLOSED",
      lockOnInitial1: "Mike Johnson - " + new Date().toLocaleString("en-CA", { hour12: false }),
      lockOnInitial2: "Lisa Chen - " + new Date().toLocaleString("en-CA", { hour12: false }),
    });

    await pointRepo.save([pt1, pt2]);

    console.log("Successfully created active LOTO-2026-000789 task!");
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error("Error seeding active task:", error);
    process.exit(1);
  }
}

seedTask();
