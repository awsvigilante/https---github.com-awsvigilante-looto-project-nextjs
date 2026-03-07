import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";
import { MoreThan } from "typeorm";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);

    // Find user with matching token that hasn't expired
    const user = await userRepository.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: MoreThan(new Date()),
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired setup token." },
        { status: 400 }
      );
    }

    // Hash new password and clear tokens
    const hashedPassword = await bcrypt.hash(password, 10);
    
    user.password = hashedPassword;
    user.resetToken = null; // @ts-ignore
    user.resetTokenExpiry = null; // @ts-ignore

    await userRepository.save(user);

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Setup password error:", error);
    return NextResponse.json({ error: "Failed to set password." }, { status: 500 });
  }
}
