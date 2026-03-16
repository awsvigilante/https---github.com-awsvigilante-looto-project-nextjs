import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";
import jwt from "jsonwebtoken";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = getUserFromRequest(request);

  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, type, role, address, phone } = await request.json();

    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);

    const userToUpdate = await userRepository.findOneBy({ id });

    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Optionally prevent changing extreme admin info depending on business logic
    // but for now, we just update all provided valid fields.
    if (name) userToUpdate.name = name;
    if (email && userToUpdate.type === "company") {
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
      userToUpdate.email = email;
    }
    if (role && userToUpdate.type === "company") userToUpdate.role = role;
    
    // Changing types might be dangerous, but if requested:
    if (type) userToUpdate.type = type;

    if (userToUpdate.type === "contractor") {
      if (address) userToUpdate.address = address;
      if (phone) {
        if (!PHONE_REGEX.test(phone)) {
          return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
        }
        userToUpdate.phone = phone;
      }
    }

    await userRepository.save(userToUpdate);

    return NextResponse.json({ message: "User updated successfully", user: userToUpdate });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
