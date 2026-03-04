import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";

function getUserFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace("Bearer ", ""), process.env.JWT_SECRET || "default_secret") as any;
  } catch { return null; }
}

export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);
    
    const users = await userRepository.find({
      order: { createdAt: "DESC" }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, password, type, role, lotoId, contractorNumber } = await request.json();

    if (!name || !type || !role) {
      return NextResponse.json(
        { error: "Name, type, and role are required" },
        { status: 400 }
      );
    }

    if (type === "company" && (!email || !password)) {
      return NextResponse.json(
        { error: "Email and password are required for company users" },
        { status: 400 }
      );
    }

    if (type === "contractor" && (!lotoId || !contractorNumber)) {
      return NextResponse.json(
        { error: "LOTO ID and Contractor Number are required for contractors" },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);

    // Check if user already exists (by email for company, or lotoId/number for contractor)
    const existingUser = type === "company" 
      ? await userRepository.findOneBy({ email })
      : await userRepository.findOneBy({ lotoId, contractorNumber });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password for company users
    let hashedPassword = "";
    if (type === "company" && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newUser = userRepository.create({
      name,
      email: email || `${lotoId}@contractor.temp`, // Fallback for TypeORM non-null constraints if any
      password: hashedPassword,
      type,
      role,
      lotoId,
      contractorNumber
    });

    await userRepository.save(newUser);

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        type: newUser.type,
        role: newUser.role,
        lotoId: newUser.lotoId,
        contractorNumber: newUser.contractorNumber
      }
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
