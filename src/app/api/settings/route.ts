import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/settings
export async function GET() {
  try {
    const settings = await db.appSettings.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PUT /api/settings - Upsert settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, settings } = body;

    if (!adminId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.appSettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
