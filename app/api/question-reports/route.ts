import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  classMembers,
  classes,
  questionReports,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const validLevels = ["beginner", "intermediate", "advanced"];

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });

  const db = getDb();
  const ownedClasses = await db
    .select({ code: classes.code })
    .from(classes)
    .where(eq(classes.ownerEmail, user.email));
  const codes = ownedClasses.map((course) => course.code);
  if (!codes.length) return Response.json({ reports: [] });

  const reports = await db
    .select()
    .from(questionReports)
    .where(inArray(questionReports.classCode, codes))
    .orderBy(questionReports.updatedAt);
  return Response.json({ reports: reports.reverse().slice(0, 100) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "登入並加入班級後，才能把題目送給老師。" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    classCode?: string;
    level?: string;
    day?: number;
    exerciseId?: string;
    kicker?: string;
    question?: string;
    submittedAnswer?: string;
    expectedAnswer?: string;
  };
  const classCode = body.classCode?.trim().toUpperCase().slice(0, 12) ?? "";
  const level = validLevels.includes(body.level ?? "") ? body.level! : "";
  const day = Number(body.day);
  if (
    !classCode ||
    !level ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > (level === "beginner" ? 20 : 15)
  ) {
    return Response.json({ error: "題目回報資料不完整。" }, { status: 400 });
  }

  const db = getDb();
  const [membership] = await db
    .select()
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classCode, classCode),
        eq(classMembers.email, user.email),
      ),
    )
    .limit(1);
  if (!membership) {
    return Response.json(
      { error: "只有班級成員可以送出題目回報。" },
      { status: 403 },
    );
  }

  const now = new Date();
  const [created] = await db
    .insert(questionReports)
    .values({
      classCode,
      reporterEmail: user.email,
      reporterName: user.displayName.slice(0, 80),
      level,
      day,
      exerciseId: (body.exerciseId ?? "unknown").slice(0, 100),
      kicker: (body.kicker ?? "互動練習").slice(0, 80),
      question: (body.question ?? "").trim().slice(0, 600),
      submittedAnswer: (body.submittedAnswer ?? "尚未作答").slice(0, 300),
      expectedAnswer: (body.expectedAnswer ?? "").slice(0, 300),
      status: "open",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: questionReports.id });
  return Response.json({ ok: true, id: created.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });
  const body = (await request.json()) as {
    id?: number;
    status?: "open" | "reviewing" | "resolved";
    resolutionNote?: string;
  };
  const id = Number(body.id);
  const status = ["open", "reviewing", "resolved"].includes(body.status ?? "")
    ? body.status!
    : "";
  if (!Number.isInteger(id) || !status) {
    return Response.json({ error: "回報狀態不正確。" }, { status: 400 });
  }

  const db = getDb();
  const [report] = await db
    .select()
    .from(questionReports)
    .where(eq(questionReports.id, id))
    .limit(1);
  if (!report?.classCode) {
    return Response.json({ error: "找不到題目回報。" }, { status: 404 });
  }
  const [ownedClass] = await db
    .select()
    .from(classes)
    .where(
      and(
        eq(classes.code, report.classCode),
        eq(classes.ownerEmail, user.email),
      ),
    )
    .limit(1);
  if (!ownedClass) {
    return Response.json({ error: "只有班級教師可以更新回報。" }, { status: 403 });
  }

  await db
    .update(questionReports)
    .set({
      status,
      resolutionNote: body.resolutionNote?.trim().slice(0, 500) || null,
      updatedAt: new Date(),
    })
    .where(eq(questionReports.id, id));
  return Response.json({ ok: true });
}
