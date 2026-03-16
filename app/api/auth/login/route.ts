import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";
import { LotoTask } from "@/lib/entities/LotoTask";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, type, lotoId, contractorNumber, companyName } = body;

    let dataSource = await getDataSource();
    if (!dataSource.isInitialized) {
        console.log("[LOGIN FLOW] DataSource was not initialized. Forcing initialization...");
        await dataSource.initialize();
    }
    const userRepository = dataSource.getRepository(User);

    let user;

    if (type === "contractor") {
      if (!lotoId || !contractorNumber) {
        return NextResponse.json(
          { error: "LOTO ID and Contractor Number are required" },
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

      user = await userRepository.findOne({
        where: { contractorNumber: contractorNumber, lotoId: lotoIdTrimmed, type: "contractor" }
      });

      if (!user) {
        return NextResponse.json(
          { error: "Contractor not recognized for this LOTO." },
          { status: 401 }
        );
      }

      // Pass the task UUID back for redirection
      (user as any).taskId = task.id;
    } else {
      // Company login
      user = await userRepository
        .createQueryBuilder("user")
        .where("user.email = :email", { email })
        .getOne();
        
      console.log(`[LOGIN FLOW] DB found company user? ${!!user}, ID: ${user?.id}, email: ${user?.email}`);
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
      console.log(`[LOGIN FLOW] Received password length: ${password?.length}, stored hash length: ${user.password?.length}`);
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
      { userId: user.id, email: user.email, role: user.role, type: user.type, companyName: (user as any).companyName || null },
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
        companyName: (user as any).companyName || null,
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
