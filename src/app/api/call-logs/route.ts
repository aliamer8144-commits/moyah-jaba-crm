import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";

// GET /api/call-logs?repId=xxx&clientId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const clientId = searchParams.get("clientId");

    if (!repId) {
      return NextResponse.json(
        { error: "معرف المندوب مطلوب" },
        { status: 400 }
      );
    }

    const callLogs = await db.callLog.findMany({
      where: {
        repId,
        ...(clientId ? { clientId } : {}),
      },
      include: {
        rep: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(callLogs);
  } catch (error) {
    console.error("Get call logs error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// POST /api/call-logs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repId, clientId, type, duration, notes } = body;

    if (!repId || !clientId || !type) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );

    }

    const validTypes = ["call", "whatsapp", "visit", "note"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "نوع التواصل غير صالح" },
        { status: 400 }
      );
    }

    // Get client name for logging
    const client = await db.client.findUnique({ where: { id: clientId } });

    const callLog = await withRetry(() => db.callLog.create({
      data: {
        repId,
        clientId,
        type,
        duration: duration ? parseInt(duration) : null,
        notes: notes || null,
      },
    }));

    // Log activity
    const typeLabels: Record<string, string> = {
      call: "اتصال هاتفي",
      whatsapp: "رسالة واتساب",
      visit: "زيارة",
      note: "ملاحظة",
    };

    await withRetry(() => db.activityLog.create({
      data: {
        repId,
        action: `تسجيل ${typeLabels[type]}`,
        details: `تم تسجيل ${typeLabels[type]} مع العميل ${client?.name || "غير معروف"}${notes ? ` - ${notes}` : ""}`,
      },
    }));

    return NextResponse.json(callLog);
  } catch (error) {
    console.error("Create call log error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
