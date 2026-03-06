import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";
import { LotoTask } from "@/lib/entities/LotoTask";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, type, lotoId, contractorNumber } = body;

    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);

    let user;

    if (type === "contractor") {
      if (!lotoId) {
        return NextResponse.json(
          { error: "LOTO ID is required" },
          { status: 400 }
        );
      }

      const lotoIdTrimmed = lotoId.trim();

      // Find the task first to ensure it exists and is active
      const taskRepo = dataSource.getRepository(LotoTask);
      const task = await taskRepo.findOne({ where: { lotoId: lotoIdTrimmed } });
      
      if (!task || (task.status !== 'Isolation Verified / Active' && task.status !== 'READY_FOR_DELOT')) {
        return NextResponse.json(
          { error: "Access Denied: This LOTO task is not currently active or verified for contractor entry." },
          { status: 403 }
        );
      }

      // Find ANY contractor user associated with this LOTO, or return a task-specific session
      user = await userRepository.findOne({
        where: { lotoId: lotoIdTrimmed, type: "contractor" }
      });

      // Pass the task UUID back for redirection
      (user as any).taskId = task.id;
    } else {
      user = await userRepository
        .createQueryBuilder("user")
        .where("user.email = :email", { email })
        .getOne();
    }

    if (!user) {
      console.log(`[LOGIN FLOW] Rejecting: User not found in DB`);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.type !== type) {
       console.log(`[LOGIN FLOW] Rejecting: Wrong account type (found ${user.type}, expected ${type})`);
       return NextResponse.json(
        { error: "Invalid user type for this account" },
        { status: 401 }
      );
    }

    if (type !== "contractor") {
      console.log(`[LOGIN FLOW] Running bcrypt on provided password against DB hash...`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(`[LOGIN FLOW] Bcrypt valid? ${isPasswordValid}`);

      if (!isPasswordValid) {

        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: user.type },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    // In a real app, you might set a cookie here. 
    // For now, we'll return the token and user info.
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        type: user.type,
        lotoId: user.lotoId,
        taskId: (user as any).taskId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
