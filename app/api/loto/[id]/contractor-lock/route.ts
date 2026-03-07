import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { ContractorLock } from "@/lib/entities/ContractorLock";
import { LotoTask } from "@/lib/entities/LotoTask";
import { Notification } from "@/lib/entities/Notification";
import { uploadToCloudinary } from "@/lib/cloudinary";

// GET all locks for a task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataSource = await getDataSource();
    const lockRepo = dataSource.getRepository(ContractorLock);

    const locks = await lockRepo.find({
      where: { taskId: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataSource = await getDataSource();
    const body = await request.json();
    const { 
      trade, 
      description, 
      contractorName, 
      contractorPhone, 
      contractorEmail,
      lockOnSignature: signatureBase64, 
      lockOnPhoto: photoBase64,
      contractorId,
      companyName,
      verificationPassword
    } = body;

    const lockRepo = dataSource.getRepository(ContractorLock);
    const taskRepo = dataSource.getRepository(LotoTask);
    const notifRepo = dataSource.getRepository(Notification);

    const task = await taskRepo.findOne({
      where: { id: id },
      relations: ["primaryOperator", "supervisor"]
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Upload to Cloudinary
    const [photoUrl, signatureUrl] = await Promise.all([
      uploadToCloudinary(photoBase64, `looto/${id}/photos`),
      uploadToCloudinary(signatureBase64, `looto/${id}/signatures`)
    ]);

    const newLock = lockRepo.create({
      taskId: id,
      contractorId: contractorId,
      companyName,
      trade,
      description,
      contractorName,
      contractorPhone,
      contractorEmail,
      verificationPassword,
      lockOnSignature: signatureUrl || signatureBase64, // Fallback if upload fails
      lockOnPhoto: photoUrl || photoBase64,           // Fallback if upload fails
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

// PATCH for "LOCK OFF" and "VERIFY"
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataSource = await getDataSource();
    const body = await request.json();
    const { lockId, lockOffType, lockOffNote, action, verificationValue } = body;

    const lockRepo = dataSource.getRepository(ContractorLock);
    const taskRepo = dataSource.getRepository(LotoTask);
    const notifRepo = dataSource.getRepository(Notification);

    const lock = await lockRepo.findOne({ where: { id: lockId, taskId: id } });
    if (!lock) return NextResponse.json({ error: "Lock not found" }, { status: 404 });

    // Handle verification
    if (action === "verify_lock_off") {
      if (lock.verificationPassword && lock.verificationPassword !== verificationValue) {
        return NextResponse.json({ error: "Invalid verification credentials" }, { status: 401 });
      }
      return NextResponse.json({ success: true });
    }

    // Handle lock off
    if (action === "contractor_lock_off") {
      // Secondary check
      if (lock.verificationPassword && lock.verificationPassword !== verificationValue) {
         return NextResponse.json({ error: "Invalid verification credentials" }, { status: 401 });
      }

      lock.lockOffType = lockOffType;
      lock.lockOffNote = lockOffNote;
      lock.lockedOffAt = new Date();
      
      // REPLICATE picture and signature from Lock On
      lock.lockOffPhoto = lock.lockOnPhoto;
      lock.lockOffSignature = lock.lockOnSignature;

      await lockRepo.save(lock);

      const task = await taskRepo.findOne({ where: { id: id } });

      // Notifications
      const notificationMessage = `Contractor ${lock.contractorName} signed LOCK OFF for ${task?.lotoId || id}.`;
      
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
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update contractor lock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
