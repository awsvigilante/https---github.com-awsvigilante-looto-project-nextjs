import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getDataSource } from "@/lib/data-source";
import { LotoTask } from "@/lib/entities/LotoTask";
import { IsolationPoint } from "@/lib/entities/IsolationPoint";
import { User } from "@/lib/entities/User";

export const dynamic = "force-dynamic";

function getUserFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  try {
    return jwt.verify(
      auth.replace("Bearer ", ""),
      process.env.JWT_SECRET || "default_secret"
    ) as any;
  } catch {
    return null;
  }
}

function checkbox(label: string, checked: boolean): string {
  return `
    <td style="text-align:center;padding:0 4px;">
      <div style="font-size:9px;font-weight:700;color:#111;text-transform:uppercase;margin-bottom:2px;">${label}</div>
      <div style="width:18px;height:18px;border:2px solid #111;margin:0 auto;background:${checked ? "#111" : "#fff"};display:flex;align-items:center;justify-content:center;">
        ${checked ? '<span style="color:white;font-size:12px;font-weight:900;">&#10003;</span>' : ""}
      </div>
    </td>`;
}

function buildTagHTML(
  point: IsolationPoint,
  tagIndex: number,
  totalTags: number,
  task: LotoTask,
  operatorName: string
): string {
  const pos = (point.isolationPosition || "").toUpperCase();
  const isClose = pos === "CLOSE";
  const isOpen = pos === "OPEN";
  const isInstalled = pos === "INSTALLED";
  const isRemoved = pos === "REMOVED";
  const today = new Date().toLocaleDateString("en-CA");

  return `
    <div class="tag-page">
      <!-- RED DANGER HEADER -->
      <div style="background:#cc0000;padding:10px 6px 8px;text-align:center;border-bottom:3px solid #880000;">
        <div style="color:white;font-size:28px;font-weight:900;letter-spacing:1px;line-height:1;text-shadow:1px 1px 0 rgba(0,0,0,0.3);">DANGER</div>
        <div style="color:white;font-size:11px;font-weight:800;letter-spacing:0.5px;line-height:1.4;margin-top:2px;">DO NOT OPERATE<br>THIS EQUIPMENT</div>
      </div>

      <!-- TAG NUMBER ROW -->
      <div style="background:#fff;border-bottom:2px solid #111;padding:5px 6px;display:flex;align-items:center;">
        <div style="flex:1;border-right:2px solid #111;padding-right:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Tag #</div>
          <div style="font-size:22px;font-weight:900;color:#111;line-height:1;">${tagIndex}</div>
        </div>
        <div style="flex:1;border-right:2px solid #111;padding:0 6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Of</div>
          <div style="font-size:22px;font-weight:900;color:#111;line-height:1;">${totalTags}</div>
        </div>
        <div style="flex:2;padding-left:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">RTM #</div>
          <div style="font-size:11px;font-weight:800;color:#111;line-height:1.2;">${task.redTagMasterNo || "—"}</div>
        </div>
      </div>

      <!-- LOTO ID -->
      <div style="background:#ffecec;border-bottom:2px solid #111;padding:4px 6px;">
        <span style="font-size:8px;font-weight:800;color:#cc0000;text-transform:uppercase;letter-spacing:0.5px;">LOTO ID: </span>
        <span style="font-size:13px;font-weight:900;color:#cc0000;">${task.lotoId}</span>
      </div>

      <!-- JOB DESCRIPTION -->
      <div style="border-bottom:2px solid #111;padding:4px 6px;">
        <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Job Description</div>
        <div style="font-size:10px;font-weight:700;color:#111;line-height:1.3;">${task.reasonForIsolation || "—"}</div>
      </div>

      <!-- TAG LOCATION -->
      <div style="border-bottom:2px solid #111;padding:4px 6px;">
        <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Tag Location</div>
        <div style="font-size:11px;font-weight:800;color:#111;line-height:1.3;">${point.isolationDescription}</div>
      </div>

      <!-- POSITION CHECKBOXES -->
      <div style="border-bottom:2px solid #111;padding:5px 6px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            ${checkbox("CLSD", isClose)}
            ${checkbox("OPEN", isOpen)}
            ${checkbox("INSTALLED", isInstalled)}
            ${checkbox("DISC.", isRemoved)}
          </tr>
        </table>
      </div>

      <!-- LOCK NUMBER -->
      <div style="border-bottom:2px solid #111;padding:4px 6px;display:flex;gap:8px;align-items:center;">
        <div style="flex:1;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Lock #</div>
          <div style="font-size:16px;font-weight:900;color:#111;">${point.lockNumber || "—"}</div>
        </div>
        <div style="flex:2;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Lock Box</div>
          <div style="font-size:11px;font-weight:700;color:#111;">${task.lockBoxNumber || "—"}</div>
        </div>
      </div>

      <!-- TAGGED BY + DATE -->
      <div style="border-bottom:2px solid #111;padding:4px 6px;display:flex;gap:8px;">
        <div style="flex:1;border-right:2px solid #111;padding-right:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Tagged By</div>
          <div style="font-size:11px;font-weight:800;color:#111;line-height:1.3;">${operatorName}</div>
        </div>
        <div style="flex:1;padding-left:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Date</div>
          <div style="font-size:11px;font-weight:800;color:#111;">${today}</div>
        </div>
      </div>

      <!-- DEPT / REMOVAL -->
      <div style="border-bottom:2px solid #111;padding:4px 6px;display:flex;gap:8px;">
        <div style="flex:1;border-right:2px solid #111;padding-right:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Dept.</div>
          <div style="font-size:10px;color:#111;padding-top:8px;border-bottom:1px solid #999;min-height:16px;"></div>
        </div>
        <div style="flex:1;padding-left:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Removal By</div>
          <div style="font-size:10px;color:#111;padding-top:8px;border-bottom:1px solid #999;min-height:16px;"></div>
        </div>
      </div>

      <!-- DETAGGED BY + DATE -->
      <div style="padding:4px 6px;display:flex;gap:8px;">
        <div style="flex:1;border-right:2px solid #111;padding-right:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Detagged By</div>
          <div style="font-size:10px;color:#111;padding-top:8px;border-bottom:1px solid #999;min-height:16px;"></div>
        </div>
        <div style="flex:1;padding-left:6px;">
          <div style="font-size:8px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Date</div>
          <div style="font-size:10px;color:#111;padding-top:8px;border-bottom:1px solid #999;min-height:16px;"></div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="background:#cc0000;padding:4px;text-align:center;margin-top:auto;">
        <div style="color:white;font-size:8px;font-weight:800;letter-spacing:0.5px;">SMART LOTO SYSTEM · DO NOT REMOVE WITHOUT AUTHORIZATION</div>
      </div>
    </div>`;
}

/**
 * GET /api/loto/[id]/tags
 * Returns a full self-contained HTML page with all printable LOTO danger tags
 * for the given task, sourced entirely from the database.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ds = await getDataSource();
    const taskRepo = ds.getRepository(LotoTask);
    const pointRepo = ds.getRepository(IsolationPoint);
    const userRepo = ds.getRepository(User);

    const task = await taskRepo.findOne({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const points = await pointRepo.find({
      where: { taskId: id },
      order: { tagNo: "ASC" },
    });

    if (points.length === 0) {
      return NextResponse.json({ error: "No isolation points found" }, { status: 400 });
    }

    // Get operator name from DB (primary operator, fallback to creator)
    const operatorId = task.primaryOperatorId || task.creatorId;
    const operator = operatorId
      ? await userRepo.findOne({ where: { id: operatorId } })
      : null;
    const operatorName = operator?.name || "Operator";

    const totalTags = points.length;
    const tagHTMLParts = points.map((p, idx) =>
      buildTagHTML(p, idx + 1, totalTags, task, operatorName)
    );

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LOTO Tags – ${task.lotoId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f0f0f0; padding: 20px; }
    .tag-page {
      width: 3.25in;
      min-height: 5.5in;
      border: 3px solid #111;
      margin: 0 auto 40px;
      background: #fff;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }
    .tag-page:last-child { page-break-after: avoid; margin-bottom: 0; }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .tag-page {
        margin: 0 auto;
        page-break-after: always;
        border: 3px solid #111 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
${tagHTMLParts.join("\n")}
<script>
  // Auto-trigger print dialog when the page loads
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 400);
  });
</script>
</body>
</html>`;

    return new Response(fullHTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Tags generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
