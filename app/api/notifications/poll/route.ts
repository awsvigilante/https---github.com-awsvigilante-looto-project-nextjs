import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { Notification } from "@/lib/entities/Notification";
import { In } from "typeorm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

function getUserFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(Notification);

    // Find all unread notifications for this user
    const unread = await repo.find({
      where: { userId: user.userId, isRead: false },
      order: { createdAt: "ASC" }
    });

    if (unread.length > 0) {
      // Mark them as read immediately so they don't pop up again
      await repo.update(
        { id: In(unread.map(u => u.id)) },
        { isRead: true }
      );
    }

    return NextResponse.json({ notifications: unread });
  } catch (error) {
    console.error("Polling error:", error);
    return NextResponse.json({ error: "Failed to poll notifications" }, { status: 500 });
  }
}
