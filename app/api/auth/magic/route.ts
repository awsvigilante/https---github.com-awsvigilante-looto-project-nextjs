import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/magic?token=<magic_token>
 *
 * Validates a one-time magic link token issued at approval time.
 * If valid, returns a full session JWT + user object so the frontend
 * can store them in localStorage and redirect to the task.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const magicToken = searchParams.get("token");

  if (!magicToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = jwt.verify(
      magicToken,
      process.env.JWT_SECRET || "default_secret"
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired magic link. Please contact your manager." },
      { status: 401 }
    );
  }

  // Token must carry a magic flag to distinguish from regular session tokens
  if (!payload.magic || !payload.userId) {
    return NextResponse.json({ error: "Invalid token type" }, { status: 401 });
  }

  try {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const user = await userRepo.findOne({ where: { id: payload.userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Issue a regular 1-day session token
    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: user.type },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    return NextResponse.json({
      token: sessionToken,
      taskId: payload.taskId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        type: user.type,
      },
    });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
