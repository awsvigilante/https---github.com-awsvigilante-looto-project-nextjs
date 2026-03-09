import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);

    const user = await userRepository.findOneBy({ email });

    // We don't want to reveal if a user exists or not for security reasons,
    // so we return a success response even if the user isn't found.
    // ADDITIONALLY: We explicitly block password resets for the 'admin' user.
    if (!user || user.role === "admin") {
      return NextResponse.json({ message: "If an eligible account exists with that email, a reset link has been sent." });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await userRepository.save(user);

    // Send the email
    const resetUrl = `https://www.smartlotto.online/setup-password?token=${resetToken}`;
    
    await resend.emails.send({
      from: "Smart LOTO <notifications@smartlotto.online>",
      to: email,
      subject: "Reset your LOOTO Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
          </div>
          <div style="padding: 32px; background-color: white;">
            <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Hi ${user.name},</p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 32px;">We received a request to reset your password. Click the button below to choose a new secure password. This link will expire in 1 hour.</p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 16px;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
            <p style="font-size: 14px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 14px; color: #64748b; word-break: break-all;">${resetUrl}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ message: "If an account exists with that email, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}
