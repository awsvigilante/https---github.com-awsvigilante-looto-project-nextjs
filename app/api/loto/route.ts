import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { LotoTask } from "@/lib/entities/LotoTask";
import { IsolationPoint } from "@/lib/entities/IsolationPoint";
import jwt from "jsonwebtoken";

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

function generateLotoId(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(6, "0");
  return `LOTO-${year}-${seq}`;
}

// GET /api/loto — list tasks filtered by the logged-in user's role
export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(LotoTask);

    let tasks: LotoTask[];

    if (user.role === "shift_engineer") {
      // Shift engineers see all tasks — they need full visibility to approve/review
      tasks = await repo.find({
        order: { createdAt: "DESC" },
        relations: ["creator", "supervisor", "primaryOperator", "approver"],
      });
    } else if (user.role === "supervisor") {
      // Supervisors see tasks where they are assigned as supervisor OR they created
      tasks = await repo.find({ order: { createdAt: "DESC" }, relations: ["creator", "supervisor", "primaryOperator", "approver"] });
      tasks = tasks.filter(t =>
        t.supervisorId === user.userId || t.creatorId === user.userId
      );
    } else {
      // Operators see tasks they created or are assigned to as primary operator
      tasks = await repo.find({ order: { createdAt: "DESC" }, relations: ["creator", "supervisor", "primaryOperator", "approver"] });
      tasks = tasks.filter(t =>
        t.creatorId === user.userId || t.primaryOperatorId === user.userId
      );
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/loto error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/loto — create a new LOTO task + isolation point rows
export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      facility,
      lockBoxNumber,
      reasonForIsolation,
      redTagMasterNo,
      equipmentName,
      expectedDuration,
      numIsolationPoints,
      supervisorId,
      approverId, // NEW: assigned shift engineer for approval
      primaryOperatorId, // NEW: assigned operator for isolation
      status, // NEW: optional initial status
      isolationPoints, // NEW: array of { isolationDescription, normalPosition, requiredPosition }
    } = body;

    if (
      !facility || !lockBoxNumber || !reasonForIsolation ||
      !equipmentName || !expectedDuration || !numIsolationPoints || !supervisorId || !approverId
    ) {
      return NextResponse.json({ error: "All header fields are required including Approver" }, { status: 400 });
    }

    const ds = await getDataSource();
    const taskRepo = ds.getRepository(LotoTask);
    const pointRepo = ds.getRepository(IsolationPoint);

    const count = await taskRepo.count();
    const lotoId = generateLotoId(count);

    const task = taskRepo.create({
      lotoId,
      facility,
      lockBoxNumber,
      reasonForIsolation,
      redTagMasterNo: redTagMasterNo || lotoId.replace("LOTO-", "YR/MO-"),
      equipmentName,
      expectedDuration,
      numIsolationPoints: Number(numIsolationPoints),
      status: status || "Draft",
      creatorId: user.userId,
      supervisorId,
      approverId,
      primaryOperatorId: primaryOperatorId || user.userId,
    });

    const savedTask = await taskRepo.save(task);

    // Create isolation point rows
    const points: IsolationPoint[] = [];
    const pointsCount = Number(numIsolationPoints);
    for (let i = 1; i <= pointsCount; i++) {
      const inputPoint = isolationPoints?.[i - 1];
      const point = pointRepo.create({
        taskId: savedTask.id,
        tagNo: i,
        isolationDescription: inputPoint?.isolationDescription || "",
        normalPosition: inputPoint?.normalPosition || "",
        requiredPosition: inputPoint?.requiredPosition || "",
      });
      points.push(point);
    }
    await pointRepo.save(points);

    return NextResponse.json({ task: savedTask, isolationPoints: points }, { status: 201 });
  } catch (error) {
    console.error("POST /api/loto error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
