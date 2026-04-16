import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";
import { comparePassword, hashPassword } from "@/lib/auth";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, action } = body;

    if (action === "login") {
      if (!username || !password) {
        return NextResponse.json(
          { error: "اسم المستخدم وكلمة المرور مطلوبان" },
          { status: 400 }
        );
      }

      const user = await db.user.findUnique({ where: { username } });

      if (!user) {
        return NextResponse.json(
          { error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
          { status: 401 }
        );
      }

      const isValid = await comparePassword(password, user.password);

      if (!isValid) {
        return NextResponse.json(
          { error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
          { status: 401 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: "تم تعطيل هذا الحساب" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        phone: user.phone,
        allocatedInventory: user.allocatedInventory,
        isActive: user.isActive,
      });
    }

    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// PUT /api/auth - Create new user (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, name, username, password, phone, role } = body;

    if (!adminId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "الاسم واسم المستخدم وكلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "اسم المستخدم مستخدم بالفعل" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await withRetry(() => db.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        phone: phone || null,
        role: role || "REP",
        allocatedInventory: role === "ADMIN" ? 0 : 0,
      },
    }));

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone,
      allocatedInventory: user.allocatedInventory,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// PATCH /api/auth - Update user
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, userId, name, phone, password, allocatedInventory, isActive } = body;

    if (!adminId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (allocatedInventory !== undefined) updateData.allocatedInventory = allocatedInventory;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await hashPassword(password);

    const user = await withRetry(() => db.user.update({
      where: { id: userId },
      data: updateData,
    }));

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone,
      allocatedInventory: user.allocatedInventory,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// GET /api/auth - Get all reps (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const reps = await db.user.findMany({
      where: { role: "REP" },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        allocatedInventory: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            clients: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reps);
  } catch (error) {
    console.error("Get reps error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");
    const userId = searchParams.get("userId");

    if (!adminId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (userId === adminId) {
      return NextResponse.json(
        { error: "لا يمكنك حذف حسابك" },
        { status: 400 }
      );
    }

    await withRetry(() => db.user.delete({ where: { id: userId! } }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
