import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/requests?repId=xxx or ?adminId=xxx
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
      const requests = await db.request.findMany({
        include: { rep: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(requests);
    }

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    const requests = await db.request.findMany({
      where: { repId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Get requests error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/requests - Create request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repId, type, entityType, entityId, reason } = body;

    if (!repId || !type || !entityType || !entityId || !reason) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const req = await db.request.create({
      data: { repId, type, entityType, entityId, reason, status: "pending" },
    });

    // Notify admins
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          title: `طلب ${type === "edit" ? "تعديل" : "حذف"}`,
          message: `طلب ${type === "edit" ? "تعديل" : "حذف"} ${entityType === "client" ? "عميل" : "فاتورة"} - السبب: ${reason}`,
          type: "warning",
          relatedId: req.id,
        },
      });
    }

    // Log activity
    await db.activityLog.create({
      data: {
        repId,
        action: `طلب ${type === "edit" ? "تعديل" : "حذف"}`,
        details: `تم إرسال طلب ${type === "edit" ? "تعديل" : "حذف"} ${entityType === "client" ? "عميل" : "فاتورة"}`,
      },
    });

    return NextResponse.json(req);
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PATCH /api/requests - Approve or reject request
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, requestId, status, adminNote } = body;

    if (!adminId || !requestId || !status) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    if (status === "rejected" && !adminNote) {
      return NextResponse.json(
        { error: "يجب إدخال سبب الرفض" },
        { status: 400 }
      );
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const req = await db.request.findUnique({ where: { id: requestId } });
    if (!req) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    // If approved and type is delete, execute the deletion
    if (status === "approved" && req.type === "delete") {
      if (req.entityType === "client") {
        await db.client.delete({ where: { id: req.entityId } });
      } else if (req.entityType === "invoice") {
        const invoice = await db.invoice.findUnique({
          where: { id: req.entityId },
        });
        if (invoice) {
          await db.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: invoice.repId },
              data: {
                allocatedInventory: {
                  increment: invoice.quantity + invoice.promotionQty,
                },
              },
            });
            await tx.invoice.delete({ where: { id: req.entityId } });
          });
        }
      }
    }

    const updatedReq = await db.request.update({
      where: { id: requestId },
      data: {
        status,
        adminNote: adminNote || null,
      },
    });

    // Notify rep
    const statusText = status === "approved" ? "تمت الموافقة" : "تم الرفض";
    await db.notification.create({
      data: {
        userId: req.repId,
        title: statusText,
        message: `طلب ${req.type === "edit" ? "التعديل" : "الحذف"} ${status === "approved" ? "تمت الموافقة عليه" : "تم رفضه"}${adminNote ? ` - السبب: ${adminNote}` : ""}`,
        type: status === "approved" ? "success" : "error",
        relatedId: req.id,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        repId: adminId,
        action: `${status === "approved" ? "موافقة" : "رفض"} طلب`,
        details: `تم ${status === "approved" ? "الموافقة" : "الرفض"} على طلب ${req.type === "edit" ? "تعديل" : "حذف"} ${req.entityType === "client" ? "عميل" : "فاتورة"} - ${adminNote || ""}`,
      },
    });

    return NextResponse.json(updatedReq);
  } catch (error) {
    console.error("Update request error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
