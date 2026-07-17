import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { learningProfiles } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "請先登入後再同步。" }, { status: 401 });
  }

  const db = getDb();
  const [profile] = await db
    .select()
    .from(learningProfiles)
    .where(eq(learningProfiles.email, user.email))
    .limit(1);

  return Response.json({
    user,
    profile: profile
      ? {
          role: profile.role,
          classCode: profile.classCode,
          data: JSON.parse(profile.payload),
          updatedAt: profile.updatedAt,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "請先登入後再同步。" }, { status: 401 });
  }

  const body = (await request.json()) as {
    data?: unknown;
    role?: string;
    classCode?: string | null;
  };
  const payload = JSON.stringify(body.data ?? {});
  if (payload.length > 250_000) {
    return Response.json({ error: "同步資料超過大小限制。" }, { status: 413 });
  }

  const role = ["student", "teacher", "parent"].includes(body.role ?? "")
    ? body.role!
    : "student";
  const classCode = body.classCode?.trim().toUpperCase().slice(0, 12) || null;
  const now = new Date();
  const db = getDb();
  await db
    .insert(learningProfiles)
    .values({
      email: user.email,
      displayName: user.displayName,
      role,
      classCode,
      payload,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: learningProfiles.email,
      set: {
        displayName: user.displayName,
        role,
        classCode,
        payload,
        updatedAt: now,
      },
    });

  return Response.json({ ok: true, updatedAt: now.toISOString() });
}
