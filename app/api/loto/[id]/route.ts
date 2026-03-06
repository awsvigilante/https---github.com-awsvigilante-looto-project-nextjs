import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { LotoTask } from "@/lib/entities/LotoTask";
import { IsolationPoint } from "@/lib/entities/IsolationPoint";
import { User } from "@/lib/entities/User";
import { ContractorLock } from "@/lib/entities/ContractorLock";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

function getUserFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  try {
    const token = auth.replace("Bearer ", "");
    return jwt.verify(token, process.env.JWT_SECRET || "default_secret") as any;
  } catch {
    return null;
  }
}

/** Fire-and-forget notification trigger — does not block the response */
function triggerNotification(taskId: string, type: string, senderToken: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${senderToken}` },
    body: JSON.stringify({ taskId, type }),
  }).catch(err => console.warn("Notification trigger failed:", err));
}

// GET /api/loto/[id] — get task + isolation points
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ds = await getDataSource();
    const taskRepo = ds.getRepository(LotoTask);
    // Support lookup by UUID or the human-readable lotoId string
    let task = await taskRepo.findOne({
      where: { id: id },
      relations: ["creator", "supervisor", "primaryOperator", "approver", "contractorLocks", "contractorLocks.contractor"]
    });

    if (!task) {
      task = await taskRepo.findOne({
        where: { lotoId: id },
        relations: ["creator", "supervisor", "primaryOperator", "approver", "contractorLocks", "contractorLocks.contractor"]
      });
    }

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const points = await ds.getRepository(IsolationPoint).find({
      where: { taskId: id },
      order: { tagNo: "ASC" },
    });

    return NextResponse.json({ task, isolationPoints: points });
  } catch (error) {
    console.error("GET /api/loto/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/loto/[id] — update task status, fill rows, approve, sign
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawToken = request.headers.get("Authorization")?.replace("Bearer ", "") || "";

  try {
    const ds = await getDataSource();
    const taskRepo = ds.getRepository(LotoTask);
    const pointRepo = ds.getRepository(IsolationPoint);

    const task = await taskRepo.findOne({ 
      where: { id: id },
      relations: ["creator", "supervisor", "primaryOperator", "approver", "contractorLocks", "contractorLocks.contractor"]
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await request.json();
    const { action } = body;

    // --- Creator edits the task before approval ---
    if (action === "edit") {
      const {
        facility,
        lockBoxNumber,
        reasonForIsolation,
        equipmentName,
        expectedDuration,
        isolationPoints,
      } = body;

      if (task.status !== "Draft" && task.status !== "Pending Approval") {
        return NextResponse.json({ error: "Task cannot be edited in current status" }, { status: 400 });
      }

      if (facility) task.facility = facility;
      if (lockBoxNumber) task.lockBoxNumber = lockBoxNumber;
      if (reasonForIsolation) task.reasonForIsolation = reasonForIsolation;
      if (equipmentName) task.equipmentName = equipmentName;
      if (expectedDuration) task.expectedDuration = expectedDuration;

      await taskRepo.save(task);

      if (isolationPoints && Array.isArray(isolationPoints)) {
        for (const pt of isolationPoints) {
          if (!pt.id) continue;
          try {
            await pointRepo.update(pt.id, {
              isolationDescription: pt.isolationDescription,
              normalPosition: pt.normalPosition,
              requiredPosition: pt.requiredPosition,
            });
          } catch (e) {
            console.error(`Failed to update point ${pt.id}:`, e);
          }
        }
      }
      return NextResponse.json({ task });
    }

    // --- Creator submits for approval ---
    if (action === "submit") {
      const { isolationPoints } = body;
      for (const pt of isolationPoints) {
        if (!pt.normalPosition) {
          return NextResponse.json(
            { error: `Missing Normal Position on Tag ${pt.tagNo}` },
            { status: 400 }
          );
        }
        if (!pt.requiredPosition) {
          return NextResponse.json(
             { error: `Missing Required Position on Tag ${pt.tagNo}`},
             { status: 400 }
          );
        }
        await pointRepo.update(pt.id, {
          isolationDescription: pt.isolationDescription,
          normalPosition: pt.normalPosition,
          requiredPosition: pt.requiredPosition,
        });
      }
      task.status = "Pending Approval";
      await taskRepo.save(task);
      triggerNotification(id, "task_submitted", rawToken);
      return NextResponse.json({ task });
    }

    // --- Shift Engineer approves ---
    if (action === "approve") {
      if (user.role !== "shift_engineer") {
        return NextResponse.json({ error: "Only a Shift Engineer can approve tasks" }, { status: 403 });
      }
      // If an approver was specifically assigned, only they can approve (optional strictness, but let's stick to the assigned one for clarity)
      if (task.approverId && task.approverId !== user.userId) {
         return NextResponse.json({ error: "Only the assigned Shift Engineer can approve this task" }, { status: 403 });
      }
      task.status = "Approved";
      task.approvedById = user.userId;
      task.approverNote = body.note || "";
      await taskRepo.save(task);
      triggerNotification(id, "task_approved", rawToken);
      return NextResponse.json({ task });
    }

    // --- Add a comment ---
    if (action === "add_comment") {
      const { text } = body;
      if (!text) return NextResponse.json({ error: "Comment text is required" }, { status: 400 });

      const newComment = {
        text,
        author: user.userName || user.email || "Unknown",
        authorRole: user.role,
        timestamp: new Date().toISOString(),
      };

      task.comments = [...(task.comments || []), newComment];
      await taskRepo.save(task);

      // Trigger email and dashboard notification for the new comment
      triggerNotification(id, "new_comment", rawToken);

      return NextResponse.json({ task });
    }

    // --- Operator fills isolation rows ---
    if (action === "fill_rows") {
      // Only the assigned primary operator can fill rows
      if (task.primaryOperatorId && task.primaryOperatorId !== user.userId) {
        return NextResponse.json(
          { error: "Only the assigned operator can perform isolation" },
          { status: 403 }
        );
      }
      for (const pt of body.isolationPoints || []) {
        if (!pt.lockNumber || !pt.isolationPosition) {
          return NextResponse.json(
            { error: `Row ${pt.tagNo} is missing lock details` },
            { status: 400 }
          );
        }
        if (!pt.lockOnInitial1) {
          return NextResponse.json(
            { error: `Row ${pt.tagNo} must be signed (Lock on Initial #1) before submitting` },
            { status: 400 }
          );
        }
        await pointRepo.update(pt.id, {
          lockNumber: pt.lockNumber,
          isolationPosition: pt.isolationPosition,
          lockOnInitial1: pt.lockOnInitial1,
          lockOnInitial2: pt.lockOnInitial2,
          returnedToServiceInitial: pt.returnedToServiceInitial
        });
      }
      task.status = "Verification In Progress";
      // Ensure primary operator is stamped on task if not already set
      if (!task.primaryOperatorId) {
        task.primaryOperatorId = user.userId;
      }
      await taskRepo.save(task);
      // Notify supervisor that operator has signed and isolation is complete
      triggerNotification(id, "isolation_complete", rawToken);
      return NextResponse.json({ task });
    }

    // --- Single row edit: update lockOnInitial1 (operator) or lockOnInitial2 (supervisor) ---
    if (action === "update_point") {
      const { pointId, field, value } = body;
      if (!pointId || !field) {
        return NextResponse.json({ error: "pointId and field are required" }, { status: 400 });
      }

      const allowedFields = ["lockOnInitial1", "lockOnInitial2", "lockNumber", "isolationPosition"];
      if (!allowedFields.includes(field)) {
        return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
      }

      // lockOnInitial2: only supervisor can set/clear; backend stamps real name from JWT
      if (field === "lockOnInitial2") {
        const isSupervisor =
          !task.supervisorId ||
          task.supervisorId === user.userId ||
          ["supervisor", "shift_engineer"].includes(user.role || "");
        if (!isSupervisor) {
          return NextResponse.json({ error: "Only the assigned supervisor can sign Lock on Initial #2" }, { status: 403 });
        }
        if (value) {
          // Stamp the real name from DB (trust JWT userId, not client-sent name)
          const userRepo = ds.getRepository(User);
          const dbUser = await userRepo.findOne({ where: { id: user.userId } });
          const displayName = dbUser?.name || user.name || "Supervisor";
          const now = new Date().toLocaleString("en-CA", { hour12: false }).replace(",", "");
          await pointRepo.update(pointId, { lockOnInitial2: `${displayName} – ${now}` });
        } else {
          // Clearing (Edit button)
          await pointRepo.update(pointId, { lockOnInitial2: null as any });
        }
      } else {
        // Operator fields: lockOnInitial1, lockNumber, isolationPosition
        if (task.primaryOperatorId && task.primaryOperatorId !== user.userId) {
          return NextResponse.json({ error: "Only the assigned operator can edit isolation rows" }, { status: 403 });
        }
        await pointRepo.update(pointId, { [field]: value || null });
        // If clearing lockOnInitial1, revert task status to Approved
        if (field === "lockOnInitial1" && !value && task.status === "Isolation In Progress") {
          task.status = "Approved";
          await taskRepo.save(task);
        }
      }

      // Refresh task to return latest status
      const updatedTask = await taskRepo.findOne({
        where: { id },
        relations: ["creator", "supervisor", "primaryOperator", "approver", "contractorLocks", "contractorLocks.contractor"],
      });
      return NextResponse.json({ task: updatedTask });
    }

    // --- Supervisor signs all Lock on Initial #2 and completes verification ---
    if (action === "supervisor_complete") {
      if (task.supervisorId && task.supervisorId !== user.userId) {
        return NextResponse.json(
          { error: "Only the assigned supervisor can verify isolation" },
          { status: 403 }
        );
      }
      if (task.status !== "Isolation In Progress") {
        return NextResponse.json(
          { error: "Task must be in Isolation In Progress state for supervisor verification" },
          { status: 400 }
        );
      }
      const pts = body.isolationPoints || [];
      for (const pt of pts) {
        if (!pt.lockOnInitial2) {
          return NextResponse.json(
            { error: `All rows must be signed by supervisor (Lock on Initial #2) before completing` },
            { status: 400 }
          );
        }
        await pointRepo.update(pt.id, { lockOnInitial2: pt.lockOnInitial2 });
      }
      task.status = "Isolation Verified / Active";
      task.supervisorSignedAt = new Date().toISOString();
      await taskRepo.save(task);
      // Notify operator + creator that isolation is verified and work can begin
      triggerNotification(id, "isolation_verified", rawToken);
      return NextResponse.json({ task });
    }

    // --- Operator marks tags attached ---
    if (action === "tags_attached") {
      if (task.primaryOperatorId && task.primaryOperatorId !== user.userId) {
        return NextResponse.json(
          { error: "Only the de-energizing operator can mark tags as attached" },
          { status: 403 }
        );
      }
      task.tagsAttachedAt = new Date().toISOString();
      await taskRepo.save(task);
      return NextResponse.json({ task });
    }

    // --- Operator signs ---
    if (action === "operator_sign") {
      if (task.primaryOperatorId && task.primaryOperatorId !== user.userId) {
        return NextResponse.json(
          { error: "Only the de-energizing operator can sign this block" },
          { status: 403 }
        );
      }
      task.operatorSignature = body.signature;
      task.operatorSignedAt = new Date().toISOString();
      task.status = "Isolation Complete";
      await taskRepo.save(task);
      triggerNotification(id, "isolation_complete", rawToken);
      return NextResponse.json({ task });
    }

    // --- Supervisor verifies and signs ---
    if (action === "supervisor_sign") {
      if (task.supervisorId && task.supervisorId !== user.userId) {
        return NextResponse.json(
          { error: "Only the assigned supervisor can verify this isolation" },
          { status: 403 }
        );
      }
      const now = new Date().toLocaleString("en-CA", { hour12: false });
      const points = await pointRepo.find({ where: { taskId: id } });
      for (const pt of points) {
        await pointRepo.update(pt.id, {
          lockOnInitial2: `${user.userName || user.email} – ${now}`,
        });
      }
      task.supervisorSignature = body.signature;
      task.supervisorSignedAt = new Date().toISOString();
      task.status = "Isolation Verified / Active";
      await taskRepo.save(task);
      triggerNotification(id, "isolation_verified", rawToken);
      return NextResponse.json({ task });
    }

    // --- Contractor Lock On (Sign in with photo) ---
    if (action === "contractor_lock_on") {
       const contractorLockRepo = ds.getRepository(ContractorLock);
       const { trade, description, lockOnSignature, lockOnPhoto, contractorName, contractorPhone } = body;
       
       const newLock = contractorLockRepo.create({
         taskId: id,
         contractorId: user.userId,
         contractorName,
         contractorPhone,
         trade,
         description,
         lockOnSignature,
         lockOnPhoto,
         lockedOnAt: new Date()
       });
       await contractorLockRepo.save(newLock);
       
       triggerNotification(id, "contractor_lock_on", rawToken);
       
       const updatedTask = await taskRepo.findOne({
         where: { id },
         relations: ["creator", "supervisor", "primaryOperator", "approver", "contractorLocks", "contractorLocks.contractor"],
       });
       return NextResponse.json({ task: updatedTask });
    }

    // --- Contractor Lock Off (Sign out) ---
    if (action === "contractor_lock_off") {
       const contractorLockRepo = ds.getRepository(ContractorLock);
       const { lockId, lockOffType, lockOffNote } = body;
       
       const existingLock = await contractorLockRepo.findOne({ where: { id: lockId, taskId: id } });
       if (!existingLock) return NextResponse.json({ error: "Lock record not found" }, { status: 404 });
       
       // Only the original contractor or an admin/supervisor/engineer can sign off
       if (existingLock.contractorId !== user.userId && !['supervisor', 'shift_engineer'].includes(user.role)) {
          return NextResponse.json({ error: "Unauthorized to remove another contractor's lock" }, { status: 403 });
       }
       
       existingLock.lockOffType = lockOffType;
       existingLock.lockOffNote = lockOffNote;
       existingLock.lockedOffAt = new Date();
       await contractorLockRepo.save(existingLock);
       
       triggerNotification(id, "contractor_lock_off", rawToken);

       // Check if ALL locks are now off. If so, transition task to READY_FOR_DELOT automatically
       const allLocks = await contractorLockRepo.find({ where: { taskId: id } });
       const allOff = allLocks.length > 0 && allLocks.every(l => l.lockedOffAt !== null);
       
       if (allOff && task.status === "Isolation Verified / Active") {
         task.status = "READY_FOR_DELOT";
         await taskRepo.save(task);
       }
       
       const updatedTask = await taskRepo.findOne({
         where: { id },
         relations: ["creator", "supervisor", "primaryOperator", "approver", "contractorLocks", "contractorLocks.contractor"],
       });
       return NextResponse.json({ task: updatedTask });
    }

    // --- Return to service ---
    if (action === "return_to_service") {
       if (task.primaryOperatorId !== user.userId && task.supervisorId !== user.userId && user.role !== 'shift_engineer') {
         return NextResponse.json({ error: "Unauthorized for return to service" }, { status: 403 });
       }
       task.status = "Return to Service";
       await taskRepo.save(task);
       return NextResponse.json({ task });
    }

    // --- Maintenance (Contractor) sign-off ---
    if (action === "maintenance_sign") {
       task.maintenanceSignature = body.signature;
       task.maintenanceSignedAt = new Date().toISOString();
       await taskRepo.save(task);
       return NextResponse.json({ task });
    }

    // --- Final Operator sign-off ---
    if (action === "final_operator_sign") {
       if (task.primaryOperatorId !== user.userId && user.role !== 'shift_engineer') {
         return NextResponse.json({ error: "Only the assigned operator can sign final delot" }, { status: 403 });
       }
       task.finalOperatorSignature = body.signature;
       task.finalOperatorSignedAt = new Date().toISOString();
       task.status = "Closed";
       await taskRepo.save(task);
       return NextResponse.json({ task });
    }

    // --- Close LOTO ---
    if (action === "close") {
       task.status = "Closed";
       await taskRepo.save(task);
       return NextResponse.json({ task });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/loto/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
