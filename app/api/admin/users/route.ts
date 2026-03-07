import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { name, email, type, role, lotoId, contractorNumber } = await request.json();

    if (!name || !type || !role) {
      return NextResponse.json(
        { error: "Name, type, and role are required" },
        { status: 400 }
      );
    }

    if (type === "company" && !email) {
      return NextResponse.json(
        { error: "Email is required for company users" },
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
    let resetToken = undefined;
    let resetTokenExpiry = undefined;

    if (type === "company") {
      // Generate a highly secure random placeholder password
      const temporaryPassword = crypto.randomBytes(32).toString("hex");
      hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      
      // Generate the password setup token
      resetToken = crypto.randomBytes(32).toString("hex");
      resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24); // Token valid for 24h
    }

    const newUser = userRepository.create({
      name,
      email: email || `${lotoId}@contractor.temp`, // Fallback for TypeORM non-null constraints if any
      password: hashedPassword,
      type,
      role,
      lotoId,
      contractorNumber,
      resetToken,
      resetTokenExpiry
    });

    await userRepository.save(newUser);

    // If company user, send setup email
    if (type === "company" && email && resetToken) {
      const setupUrl = `${process.env.APP_URL}/setup-password?token=${resetToken}`;
      
      await resend.emails.send({
        from: "LOOTO <onboarding@resend.dev>",
        to: email,
        subject: "Set up your LOOTO Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to LOOTO!</h1>
            </div>
            <div style="padding: 32px; background-color: white;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Hi ${name},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 32px;">An administrator has created a new account for you. Please click the button below to set up your password securely and access your dashboard. This link will expire in 24 hours.</p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${setupUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Set Up Password</a>
              </div>
              <p style="font-size: 14px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 14px; color: #64748b; word-break: break-all;">${setupUrl}</p>
            </div>
          </div>
        `,
      });
    }

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
