import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";

// GET /api/visits?repId=xxx or ?adminId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const adminId = searchParams.get("adminId");

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      const filterRepId = searchParams.get("filterRepId");
      const visits = await db.visitLog.findMany({
        where: filterRepId ? { repId: filterRepId } : {},
        include: {
          rep: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, businessName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(visits);
    }

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    const visits = await db.visitLog.findMany({
      where: { repId },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(visits);
  } catch (error) {
    console.error("Get visits error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/visits
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repId, clientId, clientName, notes, status } = body;

    if (!repId || !clientName) {
      return NextResponse.json(
        { error: "معرف المندوب واسم العميل مطلوبان" },
        { status: 400 }
      );
    }

    // Validate rep exists
    const rep = await db.user.findUnique({ where: { id: repId } });
    if (!rep) {
      return NextResponse.json({ error: "المندوب غير موجود" }, { status: 404 });
    }

    // Validate client if clientId provided
    if (clientId) {
      const client = await db.client.findUnique({ where: { id: clientId } });
      if (!client) {
        return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
      }
    }

    const visit = await withRetry(() => db.visitLog.create({
      data: {
        repId,
        clientId: clientId || null,
        clientName,
        notes: notes || null,
        status: status || "completed",
      },
    }));

    // Log activity
    await withRetry(() => db.activityLog.create({
      data: {
        repId,
        action: "تسجيل زيارة",
        details: `زيارة ${clientName} - الحالة: ${status === "completed" ? "مكتمل" : status === "no_answer" ? "لا يوجد رد" : "مؤجل"}`,
      },
    }));

    return NextResponse.json(visit);
  } catch (error) {
    console.error("Create visit error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/visits?visitId=xxx&repId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visitId");
    const repId = searchParams.get("repId");

    if (!visitId) {
      return NextResponse.json({ error: "معرف الزيارة مطلوب" }, { status: 400 });
    }

    // Find the visit first
    const visit = await db.visitLog.findUnique({ where: { id: visitId } });
    if (!visit) {
      return NextResponse.json({ error: "الزيارة غير موجودة" }, { status: 404 });
    }

    // Ownership check: if repId provided, verify the visit belongs to that rep
    if (repId && visit.repId !== repId) {
      return NextResponse.json({ error: "غير مصرح بحذف هذه الزيارة" }, { status: 403 });
    }

    await withRetry(() => db.visitLog.delete({ where: { id: visitId } }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete visit error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
