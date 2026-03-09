import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";
import jwt from "jsonwebtoken";

function getUserFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace("Bearer ", ""), process.env.JWT_SECRET || "default_secret") as any;
  } catch {
    return null;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = getUserFromRequest(request);

  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);

    const userToDelete = await userRepository.findOneBy({ id });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (userToDelete.id === currentUser.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own admin account" },
        { status: 400 }
      );
    }

    await userRepository.remove(userToDelete);

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
