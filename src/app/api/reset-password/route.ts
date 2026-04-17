import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * POST /api/reset-password
 * Allows any user to reset their own password by username.
 * Resets password to "reset123" for simplicity.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: "اسم المستخدم مطلوب" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { username: username.trim() } });

    if (!user) {
      return NextResponse.json(
        { error: "اسم المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const newPassword = "reset123";
    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "تم إعادة تعيين كلمة المرور بنجاح",
      username: user.username,
      newPassword,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
