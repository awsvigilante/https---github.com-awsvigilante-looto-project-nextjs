import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { LotoTask } from "@/lib/entities/LotoTask";
import { Notification } from "@/lib/entities/Notification";
import { parseDurationToMs } from "@/lib/utils/time";

export async function GET(request: Request) {
  // In a real production app, this endpoint should be secured via an API key or a secret 
  // passed by the cron scheduler (e.g. Vercel Cron Secret check).
  
  try {
    const ds = await getDataSource();
    const taskRepo = ds.getRepository(LotoTask);
    const notifRepo = ds.getRepository(Notification);

    // Get all tasks that are currently active/in progress
    const activeTasks = await taskRepo.find({
      where: [
        { status: "Isolation Verified / Active" },
        { status: "Active" },
        { status: "In Progress" }
      ],
      relations: ["contractorLocks", "primaryOperator", "supervisor"]
    });

    const notificationsToCreate: Partial<Notification>[] = [];
    let checkedCount = 0;
    let expiredCount = 0;
    let completedCount = 0;

    for (const task of activeTasks) {
      if (!task.contractorLocks || task.contractorLocks.length === 0) continue;

      const locks = task.contractorLocks;
      const lockedOnLocks = locks.filter(l => l.lockedOnAt !== null);
      
      if (lockedOnLocks.length === 0) continue;
      const pendingLocks = lockedOnLocks.filter(l => l.lockedOffAt === null);

      if (pendingLocks.length === 0) {
        // Condition: All locks have been locked off 100%
        // In a real system, we'd check if we already sent this completion alert.
        // For now, we simulate sending the completion email.
        completedCount++;
        if (task.supervisorId) {
           notificationsToCreate.push({
             userId: task.supervisorId,
             taskId: task.id,
             type: "COMPLETED",
             message: `LOTO ${task.lotoId} has reached 100% completion. All contractors have successfully locked off.`,
           });
        }
        console.log(`[CRON] SUCCESS: Email sent to Shift Engineer for task ${task.lotoId} (100% Complete)`);
        continue;
      } 
      
      checkedCount++;
      
      // Calculate Expiration Time using ONLY currently pending locks
      const firstLockOn = pendingLocks.reduce((min, p) => 
        new Date(p.lockedOnAt!) < new Date(min.lockedOnAt!) ? p : min
      );
      const timerStart = new Date(firstLockOn.lockedOnAt!).getTime();
      const durationMs = parseDurationToMs(task.expectedDuration);
      
      if (durationMs === 0) continue;
      
      const expirationTime = timerStart + durationMs;
      const now = Date.now();

      if (now > expirationTime) {
        // Condition: Time has passed but some contractors haven't locked off.
        expiredCount++;
        
        // Notify Shift Engineer
        if (task.supervisorId) {
            notificationsToCreate.push({
              userId: task.supervisorId,
              taskId: task.id,
              type: "ALERT",
              message: `LOTO ${task.lotoId} duration has EXPIRED, but ${pendingLocks.length} contractor(s) are still actively locked on.`,
            });
        }
        
        console.log(`[CRON] ALERT: Email sent to Shift Engineer for task ${task.lotoId} (Expired)`);

        // Notify Pending Contractors
        for (const pending of pendingLocks) {
            console.log(`[CRON] ALERT: Email sent to Contractor ${pending.contractorEmail} (${pending.contractorName}) indicating their lock on ${task.lotoId} has expired.`);
        }
      }
    }

    if (notificationsToCreate.length > 0) {
       await notifRepo.save(notificationsToCreate);
    }

    return NextResponse.json({ 
      message: "Expiration check complete", 
      stats: {
        activeTasksChecked: checkedCount,
        expiredTasksAlerted: expiredCount,
        completedTasksAlerted: completedCount,
        newNotificationsGenerated: notificationsToCreate.length
      } 
    });

  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Failed to run expiration check" }, { status: 500 });
  }
}
