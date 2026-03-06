import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { ContractorLock } from "@/lib/entities/ContractorLock";
import { LotoTask } from "@/lib/entities/LotoTask";
import { Notification } from "@/lib/entities/Notification";

// GET all locks for a task
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dataSource = await getDataSource();
    const lockRepo = dataSource.getRepository(ContractorLock);

    const locks = await lockRepo.find({
      where: { taskId: params.id },
      order: { createdAt: "ASC" },
    });

    return NextResponse.json(locks);
  } catch (error) {
    console.error("Fetch contractor locks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST new "LOCK ON"
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dataSource = await getDataSource();
    const body = await request.json();
    const { 
      trade, 
      description, 
      contractorName, 
      contractorPhone, 
      lockOnSignature, 
      lockOnPhoto,
      contractorId,
      companyName
    } = body;

    const lockRepo = dataSource.getRepository(ContractorLock);
    const taskRepo = dataSource.getRepository(LotoTask);
    const notifRepo = dataSource.getRepository(Notification);

    const task = await taskRepo.findOne({
      where: { id: params.id },
      relations: ["primaryOperator", "supervisor"]
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const newLock = lockRepo.create({
      taskId: params.id,
      contractorId: contractorId,
      companyName,
      trade,
      description,
      contractorName,
      contractorPhone,
      lockOnSignature,
      lockOnPhoto,
      lockedOnAt: new Date(),
    });

    await lockRepo.save(newLock);

    // Notifications
    const notificationMessage = `Contractor ${contractorName} (${trade}) signed LOCK ON for ${task.lotoId}.`;
    
    const notifications = [];
    if (task.primaryOperatorId) {
      notifications.push(notifRepo.create({
        userId: task.primaryOperatorId,
        message: notificationMessage,
        type: "info",
        taskId: task.id
      }));
    }
    if (task.supervisorId) {
      notifications.push(notifRepo.create({
        userId: task.supervisorId,
        message: notificationMessage,
        type: "info",
        taskId: task.id
      }));
    }

    await notifRepo.save(notifications);

    return NextResponse.json(newLock);
  } catch (error) {
    console.error("Create contractor lock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH for "LOCK OFF"
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dataSource = await getDataSource();
    const body = await request.json();
    const { lockId, lockOffType, lockOffNote } = body;

    const lockRepo = dataSource.getRepository(ContractorLock);
    const taskRepo = dataSource.getRepository(LotoTask);
    const notifRepo = dataSource.getRepository(Notification);

    const lock = await lockRepo.findOne({ where: { id: lockId } });
    if (!lock) return NextResponse.json({ error: "Lock not found" }, { status: 404 });

    const task = await taskRepo.findOne({ where: { id: params.id } });

    lock.lockOffType = lockOffType;
    lock.lockOffNote = lockOffNote;
    lock.lockedOffAt = new Date();

    await lockRepo.save(lock);

    // Notifications
    const notificationMessage = `Contractor ${lock.contractorName} signed LOCK OFF for ${task?.lotoId || params.id}.`;
    
    if (task) {
        const notifications = [];
        if (task.primaryOperatorId) {
          notifications.push(notifRepo.create({
            userId: task.primaryOperatorId,
            message: notificationMessage,
            type: "info",
            taskId: task.id
          }));
        }
        if (task.supervisorId) {
          notifications.push(notifRepo.create({
            userId: task.supervisorId,
            message: notificationMessage,
            type: "info",
            taskId: task.id
          }));
        }
        await notifRepo.save(notifications);
    }

    return NextResponse.json(lock);
  } catch (error) {
    console.error("Update contractor lock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
