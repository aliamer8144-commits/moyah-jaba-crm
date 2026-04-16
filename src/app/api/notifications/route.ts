import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";

// GET /api/notifications?userId=xxx
// GET /api/notifications?adminId=xxx&all=true (admin view: all users' notifications)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const adminId = searchParams.get("adminId");
    const all = searchParams.get("all") === "true";

    if (adminId && all) {
      // Admin view: fetch all notifications with user info
      const notifications = await db.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      });
      return NextResponse.json(notifications);
    }

    if (!userId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark single notification as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: "معرف الإشعار مطلوب" }, { status: 400 });
    }

    await withRetry(() => db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PUT /api/notifications - Mark all as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");
    const all = searchParams.get("all") === "true";

    if (adminId && all) {
      // Admin: mark ALL notifications as read
      await withRetry(() => db.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      }));
      return NextResponse.json({ success: true });
    }

    if (!userId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    await withRetry(() => db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/notifications?notificationId=xxx - Delete single notification
// DELETE /api/notifications?userId=xxx - Delete all notifications for user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("notificationId");
    const userId = searchParams.get("userId");

    if (notificationId) {
      await withRetry(() => db.notification.delete({ where: { id: notificationId } }));
      return NextResponse.json({ success: true });
    }

    if (userId) {
      await withRetry(() => db.notification.deleteMany({ where: { userId } }));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "معرف مطلوب" }, { status: 400 });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
