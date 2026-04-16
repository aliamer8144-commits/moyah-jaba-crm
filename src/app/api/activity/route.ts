import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/activity?adminId=xxx or ?repId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");
    const repId = searchParams.get("repId");
    const filterRepId = searchParams.get("filterRepId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }

      const where: Record<string, unknown> = {};
      if (filterRepId) where.repId = filterRepId;

      const logs = await db.activityLog.findMany({
        where,
        include: { rep: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });

      const total = await db.activityLog.count({ where });

      return NextResponse.json({ logs, total });
    }

    if (repId) {
      const logs = await db.activityLog.findMany({
        where: { repId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });

      return NextResponse.json({ logs });
    }

    return NextResponse.json({ error: "معرف مطلوب" }, { status: 400 });
  } catch (error) {
    console.error("Get activity error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
