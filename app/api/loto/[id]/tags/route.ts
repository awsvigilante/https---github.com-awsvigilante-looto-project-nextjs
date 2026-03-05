import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getDataSource } from "@/lib/data-source";
import { LotoTask } from "@/lib/entities/LotoTask";
import { IsolationPoint } from "@/lib/entities/IsolationPoint";
import { User } from "@/lib/entities/User";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

// ─── Auth ────────────────────────────────────────────────────────────────────
function getUserFromRequest(request: Request) {
  const auth = request.headers.get("Authorization");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const rawToken = auth ? auth.replace("Bearer ", "") : queryToken;
  if (!rawToken) return null;
  try {
    return jwt.verify(rawToken, process.env.JWT_SECRET || "default_secret") as any;
  } catch {
    return null;
  }
}

// ─── PDF Styles ───────────────────────────────────────────────────────────────
// 1pt = 1/72 inch  →  3.25" × 5.5"
const W = 3.25 * 72;   // 234 pt
const H = 5.5  * 72;   // 396 pt

const styles = StyleSheet.create({
  page: {
    width: W,
    height: H,
    flexDirection: "column",
    backgroundColor: "#ffffff",
    border: "2pt solid #111111",
    fontFamily: "Helvetica",
  },

  // ── DANGER header
  dangerBar: {
    backgroundColor: "#cc0000",
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#880000",
  },
  dangerTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },
  dangerSub: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // ── Tag # / Of / RTM row
  topRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    backgroundColor: "#ffffff",
  },
  topCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 2,
    borderRightColor: "#111111",
  },
  topCellLast: {
    flex: 2,
    padding: 5,
  },
  topLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#333333", textTransform: "uppercase", letterSpacing: 0.5 },
  topValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111111", marginTop: 1 },
  topValueSm: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111111", marginTop: 2 },

  // ── LOTO ID band
  lotoIdBar: {
    backgroundColor: "#ffecec",
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lotoIdLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#cc0000", textTransform: "uppercase" },
  lotoIdValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#cc0000" },

  // ── Generic section
  section: {
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    padding: 5,
  },
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#333333", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  sectionValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111111", lineHeight: 1.3 },

  // ── Position checkboxes
  checkRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  checkCell: { alignItems: "center" },
  checkLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#111111", textTransform: "uppercase", marginBottom: 2 },
  checkbox: { width: 16, height: 16, border: "2pt solid #111111", alignItems: "center", justifyContent: "center" },
  checkboxFilled: { width: 16, height: 16, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },
  checkmark: { color: "#ffffff", fontSize: 11, fontFamily: "Helvetica-Bold" },

  // ── Lock # / Lock Box row
  lockRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    padding: 5,
  },
  lockCell: { flex: 1, borderRightWidth: 2, borderRightColor: "#111111", paddingRight: 5 },
  lockCellLast: { flex: 2, paddingLeft: 5 },
  lockNum: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#111111" },

  // ── Two-column rows (Tagged By / Date, Dept / Removal By, Detagged By / Date)
  twoCol: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    padding: 5,
  },
  twoColLeft: { flex: 1, borderRightWidth: 2, borderRightColor: "#111111", paddingRight: 5 },
  twoColRight: { flex: 1, paddingLeft: 5 },
  twoColLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#333333", textTransform: "uppercase", letterSpacing: 0.5 },
  twoColValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111111", marginTop: 2 },
  blankLine: { borderBottomWidth: 1, borderBottomColor: "#999999", marginTop: 10 },

  // ── Footer
  footer: {
    marginTop: "auto",
    backgroundColor: "#cc0000",
    padding: 4,
    alignItems: "center",
  },
  footerText: { color: "#ffffff", fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
});

// ─── Single Tag Component ─────────────────────────────────────────────────────
function LotoTag({
  point,
  tagIndex,
  totalTags,
  task,
  operatorName,
}: {
  point: IsolationPoint;
  tagIndex: number;
  totalTags: number;
  task: LotoTask;
  operatorName: string;
}) {
  const pos = (point.isolationPosition || "").toUpperCase();
  const isClose     = pos === "CLOSE";
  const isOpen      = pos === "OPEN";
  const isInstalled = pos === "INSTALLED";
  const isRemoved   = pos === "REMOVED";
  const today = new Date().toLocaleDateString("en-CA");

  const Checkbox = ({ label, filled }: { label: string; filled: boolean }) => (
    React.createElement(View, { style: styles.checkCell },
      React.createElement(Text, { style: styles.checkLabel }, label),
      React.createElement(View, { style: filled ? styles.checkboxFilled : styles.checkbox },
        filled ? React.createElement(Text, { style: styles.checkmark }, "✓") : null
      )
    )
  );

  return React.createElement(
    Page,
    { size: [W, H], style: styles.page },

    // DANGER header
    React.createElement(View, { style: styles.dangerBar },
      React.createElement(Text, { style: styles.dangerTitle }, "DANGER"),
      React.createElement(Text, { style: styles.dangerSub }, "DO NOT OPERATE\nTHIS EQUIPMENT")
    ),

    // Tag #  /  Of  /  RTM #
    React.createElement(View, { style: styles.topRow },
      React.createElement(View, { style: styles.topCell },
        React.createElement(Text, { style: styles.topLabel }, "Tag #"),
        React.createElement(Text, { style: styles.topValue }, String(tagIndex))
      ),
      React.createElement(View, { style: styles.topCell },
        React.createElement(Text, { style: styles.topLabel }, "Of"),
        React.createElement(Text, { style: styles.topValue }, String(totalTags))
      ),
      React.createElement(View, { style: styles.topCellLast },
        React.createElement(Text, { style: styles.topLabel }, "RTM #"),
        React.createElement(Text, { style: styles.topValueSm }, task.redTagMasterNo || "—")
      )
    ),

    // LOTO ID band
    React.createElement(View, { style: styles.lotoIdBar },
      React.createElement(Text, { style: styles.lotoIdLabel }, "LOTO ID: "),
      React.createElement(Text, { style: styles.lotoIdValue }, task.lotoId)
    ),

    // Job Description
    React.createElement(View, { style: styles.section },
      React.createElement(Text, { style: styles.sectionLabel }, "Job Description"),
      React.createElement(Text, { style: styles.sectionValue }, task.reasonForIsolation || "—")
    ),

    // Tag Location
    React.createElement(View, { style: styles.section },
      React.createElement(Text, { style: styles.sectionLabel }, "Tag Location"),
      React.createElement(Text, { style: styles.sectionValue }, point.isolationDescription || "—")
    ),

    // Position checkboxes
    React.createElement(View, { style: styles.checkRow },
      React.createElement(Checkbox, { label: "CLSD", filled: isClose }),
      React.createElement(Checkbox, { label: "OPEN", filled: isOpen }),
      React.createElement(Checkbox, { label: "INSTALLED", filled: isInstalled }),
      React.createElement(Checkbox, { label: "DISC.", filled: isRemoved })
    ),

    // Lock # / Lock Box
    React.createElement(View, { style: styles.lockRow },
      React.createElement(View, { style: styles.lockCell },
        React.createElement(Text, { style: styles.twoColLabel }, "Lock #"),
        React.createElement(Text, { style: styles.lockNum }, point.lockNumber || "—")
      ),
      React.createElement(View, { style: styles.lockCellLast },
        React.createElement(Text, { style: styles.twoColLabel }, "Lock Box"),
        React.createElement(Text, { style: styles.twoColValue }, (task as any).lockBoxNumber || "—")
      )
    ),

    // Tagged By / Date
    React.createElement(View, { style: styles.twoCol },
      React.createElement(View, { style: styles.twoColLeft },
        React.createElement(Text, { style: styles.twoColLabel }, "Tagged By"),
        React.createElement(Text, { style: styles.twoColValue }, operatorName)
      ),
      React.createElement(View, { style: styles.twoColRight },
        React.createElement(Text, { style: styles.twoColLabel }, "Date"),
        React.createElement(Text, { style: styles.twoColValue }, today)
      )
    ),

    // Dept / Removal By
    React.createElement(View, { style: styles.twoCol },
      React.createElement(View, { style: styles.twoColLeft },
        React.createElement(Text, { style: styles.twoColLabel }, "Dept."),
        React.createElement(View, { style: styles.blankLine })
      ),
      React.createElement(View, { style: styles.twoColRight },
        React.createElement(Text, { style: styles.twoColLabel }, "Removal By"),
        React.createElement(View, { style: styles.blankLine })
      )
    ),

    // Detagged By / Date
    React.createElement(View, { style: { ...styles.twoCol, borderBottomWidth: 0 } },
      React.createElement(View, { style: styles.twoColLeft },
        React.createElement(Text, { style: styles.twoColLabel }, "Detagged By"),
        React.createElement(View, { style: styles.blankLine })
      ),
      React.createElement(View, { style: styles.twoColRight },
        React.createElement(Text, { style: styles.twoColLabel }, "Date"),
        React.createElement(View, { style: styles.blankLine })
      )
    ),

    // Footer
    React.createElement(View, { style: styles.footer },
      React.createElement(Text, { style: styles.footerText }, "SMART LOTO SYSTEM · DO NOT REMOVE WITHOUT AUTHORIZATION")
    )
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────
function TagDocument({
  points,
  task,
  operatorName,
}: {
  points: IsolationPoint[];
  task: LotoTask;
  operatorName: string;
}) {
  return React.createElement(
    Document,
    { title: `LOTO Tags – ${task.lotoId}` },
    ...points.map((p, i) =>
      React.createElement(LotoTag, {
        key: p.id,
        point: p,
        tagIndex: i + 1,
        totalTags: points.length,
        task,
        operatorName,
      })
    )
  );
}

// ─── GET /api/loto/[id]/tags ──────────────────────────────────────────────────
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
    const task = await ds.getRepository(LotoTask).findOne({ where: { id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const points = await ds.getRepository(IsolationPoint).find({
      where: { taskId: id },
      order: { tagNo: "ASC" },
    });
    if (points.length === 0)
      return NextResponse.json({ error: "No isolation points found" }, { status: 400 });

    const operatorId = task.primaryOperatorId || task.creatorId;
    const operator = operatorId
      ? await ds.getRepository(User).findOne({ where: { id: operatorId } })
      : null;
    const operatorName = operator?.name || "Operator";

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(TagDocument, { points, task, operatorName }) as any
    );

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="LOTO-Tags-${task.lotoId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF tags generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
