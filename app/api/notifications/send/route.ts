import { NextResponse } from "next/server";
import { Resend } from "resend";
import jwt from "jsonwebtoken";
import { getDataSource } from "@/lib/data-source";
import { LotoTask } from "@/lib/entities/LotoTask";
import { User } from "@/lib/entities/User";
import { Notification } from "@/lib/entities/Notification";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || "http://localhost:3001";
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

function getUserFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET) as any;
  } catch { return null; }
}

/**
 * Generates a magic link JWT for a specific user.
 * The `magic: true` flag distinguishes it from regular session tokens.
 */
function generateMagicToken(userId: string, taskId: string, expiresInHours = 48): string {
  return jwt.sign(
    { userId, taskId, magic: true },
    JWT_SECRET,
    { expiresIn: `${expiresInHours}h` }
  );
}

/** Builds a personalised magic URL for a recipient, deep-linking to the appropriate page */
function magicUrl(userId: string, taskId: string, redirectPath?: string): string {
  const token = generateMagicToken(userId, taskId);
  const path = redirectPath ? encodeURIComponent(redirectPath) : '';
  return `${APP_URL}/auth/magic?token=${encodeURIComponent(token)}${path ? `&redirect=${path}` : ''}`;
}

const emailWrapper = (
  recipientName: string,
  headline: string,
  body: string,
  ctaUrl: string,
  ctaLabel: string,
  taskSummaryHtml: string
) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fe;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af 0%,#4f46e5 100%);padding:36px 32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🔒</div>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Smart LOTO System</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;font-weight:500;">Lockout-Tagout Accountability Platform</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;">
      <p style="color:#64748b;font-size:14px;margin:0 0 4px;font-weight:500;">Hello <strong style="color:#1e293b;">${recipientName}</strong>,</p>
      <h2 style="color:#1e293b;font-size:22px;font-weight:800;margin:8px 0 16px;line-height:1.3;">${headline}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">${body}</p>

      ${taskSummaryHtml}

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0 24px;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:800;font-size:15px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(29,78,216,0.35);">
          ${ctaLabel} →
        </a>
      </div>

      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
        <p style="color:#92400e;font-size:12px;font-weight:700;margin:0;">
          🔐 This link is unique to your account and expires in 48 hours. Do not share it with anyone.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;font-weight:500;">
        Smart LOTO Accountability System · ${new Date().getFullYear()} · This is an automated message.
      </p>
    </div>
  </div>
</body>
</html>`;

function buildTaskSummary(task: LotoTask): string {
  return `
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:13px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;color:#64748b;width:40%;border-bottom:1px solid #e2e8f0;">LOTO ID</td>
        <td style="padding:10px 14px;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${task.lotoId}</td></tr>
    <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Equipment</td>
        <td style="padding:10px 14px;color:#334155;border-bottom:1px solid #e2e8f0;">${task.equipmentName}</td></tr>
    <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Facility</td>
        <td style="padding:10px 14px;color:#334155;border-bottom:1px solid #e2e8f0;">${task.facility}</td></tr>
    <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;color:#64748b;">Status</td>
        <td style="padding:10px 14px;color:#334155;">${task.status}</td></tr>
  </table>`;
}

/**
 * POST /api/notifications/send
 * Body: { taskId, type }
 *
 * Supported types:
 *  - "task_submitted"       → notify shift engineers to approve
 *  - "task_approved"        → notify operator (magic link) + supervisor
 *  - "isolation_complete"   → notify supervisor to verify
 *  - "isolation_verified"   → notify operator + creator that work can begin
 */
export async function POST(request: Request) {
  const sender = getUserFromRequest(request);
  if (!sender) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { taskId, type } = await request.json();
    if (!taskId || !type) {
      return NextResponse.json({ error: "taskId and type are required" }, { status: 400 });
    }

    const ds = await getDataSource();
    const task = await ds.getRepository(LotoTask).findOne({ where: { id: taskId } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const userRepo = ds.getRepository(User);

    const [creator, supervisor, operator, approver] = await Promise.all([
      task.creatorId ? userRepo.findOne({ where: { id: task.creatorId } }) : null,
      task.supervisorId ? userRepo.findOne({ where: { id: task.supervisorId } }) : null,
      task.primaryOperatorId ? userRepo.findOne({ where: { id: task.primaryOperatorId } }) : null,
      task.approvedById ? userRepo.findOne({ where: { id: task.approvedById } }) : null,
    ]);

    const results: { to: string; type: string; status: string; error?: string }[] = [];

    const notifRepo = ds.getRepository(Notification);

    const sendEmail = async (
      to: string | undefined,
      userId: string,
      subject: string,
      html: string,
      label: string,
      toastMessage: string
    ) => {
      if (!to) {
        results.push({ to: "unknown", type: label, status: "skipped – no email" });
        return;
      }

      // Always save an in-app notification for the dashboard toast polling
      try {
        const notif = notifRepo.create({
          userId,
          taskId,
          type: label.split(' →')[0],
          message: toastMessage,
          isRead: false
        });
        await notifRepo.save(notif);
      } catch (e) {
        console.error("Failed to save in-app notification:", e);
      }

      try {
        await resend.emails.send({
          from: "Smart LOTO <onboarding@resend.dev>",
          to,
          subject,
          html,
        });
        results.push({ to, type: label, status: "sent" });
      } catch (err: any) {
        console.error(`[EMAIL FAIL] ${label} → ${to}:`, err.message);
        results.push({ to, type: label, status: "failed", error: err.message });
      }
    };

    const summary = buildTaskSummary(task);

    switch (type) {
      case "task_submitted": {
        // Notify all shift engineers that a task needs approval
        const engineers = await userRepo.find({ where: { role: "shift_engineer", type: "company" } });
        for (const eng of engineers) {
          await sendEmail(
            eng.email, eng.id,
            `[Action Required] LOTO Task Needs Your Approval – ${task.lotoId}`,
            emailWrapper(
              eng.name,
              "A LOTO Task Awaits Your Approval",
              `${creator?.name || "An operator"} has submitted a new LOTO isolation task for review. Please check the isolation points and approve or reject the task.`,
              magicUrl(eng.id, taskId),
              "Review & Approve Task",
              summary
            ),
            "task_submitted → shift_engineer",
            `New LOTO ${task.lotoId} needs your approval.`
          );
        }
        break;
      }

      case "task_approved": {
        // 1. Send magic link to the PRIMARY OPERATOR so they can begin isolation
        const isolationOperator = operator || creator; // fallback to creator if no operator assigned yet
        if (isolationOperator?.email) {
          const url = magicUrl(isolationOperator.id, taskId);
          await sendEmail(
            isolationOperator.email, isolationOperator.id,
            `✅ Your LOTO Task Has Been Approved – ${task.lotoId}`,
            emailWrapper(
              isolationOperator.name,
              "Your LOTO Task is Approved – Begin Isolation",
              `Your LOTO isolation task has been reviewed and <strong>approved</strong> by ${approver?.name || "the Shift Engineer"}. 
              Click the button below — it will log you in automatically and take you directly to the task so you can fill in your isolation details and lock numbers.`,
              url,
              "Open Task & Begin Isolation",
              summary
            ),
            "task_approved → operator (magic link)",
            `LOTO ${task.lotoId} is approved. You can begin isolation.`
          );
        }

        // 2. Notify the supervisor they are assigned to verify after isolation
        if (supervisor?.email) {
          const url = magicUrl(supervisor.id, taskId);
          await sendEmail(
            supervisor.email, supervisor.id,
            `[Heads Up] You Are Assigned as Supervisor – ${task.lotoId}`,
            emailWrapper(
              supervisor.name,
              "You Are Assigned to Verify This Isolation",
              `A LOTO task has been approved and you are the assigned supervisor. Once ${isolationOperator?.name || "the operator"} completes physical isolation, you will receive another notification to verify and sign off.`,
              url,
              "View Task Details",
              summary
            ),
            "task_approved → supervisor",
            `LOTO ${task.lotoId} is approved. You are assigned to verify.`
          );
        }
        break;
      }

      case "isolation_complete": {
        // Notify supervisor to physically verify and sign Lock on Initial #2
        // Magic link goes directly to the verification page
        if (supervisor?.email) {
          const verifyPath = `/loto/${taskId}/verify`;
          const url = magicUrl(supervisor.id, taskId, verifyPath);
          await sendEmail(
            supervisor.email, supervisor.id,
            `[Action Required] Isolation Complete – Verify Now – ${task.lotoId}`,
            emailWrapper(
              supervisor.name,
              "Isolation Complete — Your Verification is Required 🔍",
              `${operator?.name || "The operator"} has completed physical isolation and signed all Lock on Initial #1 fields for this task.<br><br>Please open the verification link below, physically inspect each isolation point, click <strong>Done</strong> on each row to sign Lock on Initial #2, then click <strong>Sign &amp; Supervise</strong> to formally confirm isolation is safe.`,
              url,
              "Open Verification Page →",
              summary
            ),
            "isolation_complete → supervisor",
            `Isolation on ${task.lotoId} complete. Please verify.`
          );
        }
        break;
      }

      case "isolation_verified": {
        // Notify operator + creator that the area is now safe to work
        const toNotify = [operator, creator].filter(
          (u, i, arr) => u && arr.findIndex(x => x?.id === u.id) === i
        ) as User[];

        for (const u of toNotify) {
          if (!u.email) continue;
          const url = magicUrl(u.id, taskId);
          await sendEmail(
            u.email, u.id,
            `✅ Isolation Verified – Safe to Work – ${task.lotoId}`,
            emailWrapper(
              u.name,
              "Equipment is Now Safely Isolated",
              `${supervisor?.name || "The supervisor"} has verified and signed off on the isolation. The equipment is now safely locked out. Contractors may begin work safely.`,
              url,
              "View Active LOTO",
              summary
            ),
            `isolation_verified → ${u.role}`
          );
        }
        break;
      }

      case "new_comment": {
        // Find everyone attached to this task (except the sender)
        const toNotify = [creator, supervisor, operator, approver].filter(
          (u, i, arr) => u && u.id !== sender.userId && arr.findIndex(x => x?.id === u.id) === i
        ) as User[];

        for (const u of toNotify) {
          if (!u.email) continue;
          const url = magicUrl(u.id, taskId);
          await sendEmail(
            u.email, u.id,
            `💬 New Comment on LOTO ${task.lotoId}`,
            emailWrapper(
              u.name,
              "New Discussion on Your Task",
              `<strong>${sender.userName || sender.email}</strong> just commented on the LOTO isolation plan for <strong>${task.equipmentName}</strong>.<br><br>Please click the link below to view the latest updates.`,
              url,
              "View Comments & Task",
              summary
            ),
            `new_comment → ${u.role}`
          );
        }
        break;
      }

      case "return_to_service": {
        // Notify operator to begin de-LOTO (remove locks, restore equipment)
        const rtsOperator = operator || creator;
        if (rtsOperator?.email) {
          const url = magicUrl(rtsOperator.id, taskId);
          await sendEmail(
            rtsOperator.email, rtsOperator.id,
            `[Action Required] Return to Service – Remove Locks – ${task.lotoId}`,
            emailWrapper(
              rtsOperator.name,
              "Work Complete — Begin De-LOTO 🔓",
              `The maintenance work on <strong>${task.equipmentName}</strong> is complete.<br><br>Please open the task, physically remove all locks and tags from each isolation point, then sign the final Return to Service form to close this LOTO.`,
              url,
              "Open Task & Remove Locks",
              summary
            ),
            "return_to_service → operator",
            `Return to service for ${task.lotoId} initiated. Please remove locks.`
          );
        }
        // Also notify supervisor for awareness
        if (supervisor?.email && supervisor.id !== rtsOperator?.id) {
          const url = magicUrl(supervisor.id, taskId);
          await sendEmail(
            supervisor.email, supervisor.id,
            `[Info] Return to Service Initiated – ${task.lotoId}`,
            emailWrapper(
              supervisor.name,
              "Return to Service Has Been Initiated",
              `The LOTO task for <strong>${task.equipmentName}</strong> has been cleared for return to service. The operator has been notified to remove all locks and close the task.`,
              url,
              "View Task",
              summary
            ),
            "return_to_service → supervisor",
            `Return to service for ${task.lotoId} initiated.`
          );
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}
