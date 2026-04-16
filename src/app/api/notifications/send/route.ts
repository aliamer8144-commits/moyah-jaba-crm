import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/notifications/send
// Admin sends notification to specific rep or broadcasts to all reps
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetRepId, title, body: message, type, adminId } = body;

    // Validate admin
    if (!adminId) {
      return NextResponse.json({ error: "معرف المدير مطلوب" }, { status: 400 });
    }

    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح بهذا الإجراء" }, { status: 403 });
    }

    // Validate title and body
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "عنوان الإشعار مطلوب" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "محتوى الإشعار مطلوب" }, { status: 400 });
    }

    const notificationType = type || "info";
    const validTypes = ["alert", "info", "achievement", "system", "success", "warning", "error"];
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json({ error: "نوع الإشعار غير صالح" }, { status: 400 });
    }

    if (targetRepId) {
      // Targeted notification to specific rep
      const rep = await db.user.findUnique({
        where: { id: targetRepId },
        select: { id: true, role: true, isActive: true },
      });

      if (!rep) {
        return NextResponse.json({ error: "المندوب غير موجود" }, { status: 404 });
      }

      if (rep.role !== "REP") {
        return NextResponse.json({ error: "المستخدم المحدد ليس مندوباً" }, { status: 400 });
      }

      const notification = await db.notification.create({
        data: {
          userId: rep.id,
          title: title.trim(),
          message: message.trim(),
          type: notificationType,
        },
      });

      return NextResponse.json({
        success: true,
        message: "تم إرسال الإشعار بنجاح",
        notificationId: notification.id,
        targetCount: 1,
      });
    } else {
      // Broadcast to all active reps
      const reps = await db.user.findMany({
        where: { role: "REP", isActive: true },
        select: { id: true },
      });

      if (reps.length === 0) {
        return NextResponse.json({ error: "لا يوجد مناديب نشطين" }, { status: 404 });
      }

      const notifications = await db.notification.createMany({
        data: reps.map((rep) => ({
          userId: rep.id,
          title: title.trim(),
          message: message.trim(),
          type: notificationType,
        })),
      });

      return NextResponse.json({
        success: true,
        message: "تم بث الإشعار لجميع المناديب",
        targetCount: notifications.count,
      });
    }
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
