import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";

// GET /api/expenses?repId=xxx or ?adminId=xxx or ?repId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const adminId = searchParams.get("adminId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      const filterRep = searchParams.get("filterRepId");
      const expenses = await db.expense.findMany({
        where: {
          ...(filterRep ? { repId: filterRep } : {}),
          ...(from && to ? { date: { gte: new Date(from), lte: new Date(to + "T23:59:59") } } : {}),
        },
        include: { rep: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
      });
      return NextResponse.json(expenses);
    }

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    const whereClause: Record<string, unknown> = { repId };
    if (from && to) {
      whereClause.date = { gte: new Date(from), lte: new Date(to + "T23:59:59") };
    }

    const expenses = await db.expense.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/expenses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repId, category, amount, description, date } = body;

    if (!repId || !category || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها والمبلغ يجب أن يكون أكبر من صفر" },
        { status: 400 }
      );
    }

    const validCategories = ["fuel", "food", "maintenance", "phone", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "فئة المصروف غير صالحة" }, { status: 400 });
    }

    // Validate rep exists
    const rep = await db.user.findUnique({ where: { id: repId } });
    if (!rep) {
      return NextResponse.json({ error: "المندوب غير موجود" }, { status: 404 });
    }

    const categoryLabels: Record<string, string> = {
      fuel: "وقود",
      food: "طعام",
      maintenance: "صيانة",
      phone: "هاتف",
      other: "أخرى",
    };

    const parsedAmount = parseFloat(amount);
    const expenseDate = date ? new Date(date) : new Date();

    // Create expense
    const expense = await withRetry(() => db.expense.create({
      data: {
        repId,
        category,
        amount: parsedAmount,
        description: description || null,
        date: expenseDate,
      },
    }));

    // Log activity
    await withRetry(() => db.activityLog.create({
      data: {
        repId,
        action: "تسجيل مصروف",
        details: `مصروف ${categoryLabels[category]} - المبلغ: ${parsedAmount.toLocaleString("ar-SA")} ر.س${description ? ` - ${description}` : ""}`,
      },
    }));

    // Create notification for admin
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await withRetry(() => db.notification.create({
        data: {
          userId: admin.id,
          title: "مصروف جديد",
          message: `تم تسجيل مصروف ${categoryLabels[category]} بمبلغ ${parsedAmount.toLocaleString("ar-SA")} ر.س بواسطة ${rep.name}${description ? ` - ${description}` : ""}`,
          type: "info",
        },
      }));
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/expenses?expenseId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get("expenseId");
    const repId = searchParams.get("repId");

    if (!expenseId) {
      return NextResponse.json({ error: "معرف المصروف مطلوب" }, { status: 400 });
    }

    // Verify ownership
    const expense = await db.expense.findUnique({ where: { id: expenseId } });
    if (!expense) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    if (repId && expense.repId !== repId) {
      return NextResponse.json({ error: "غير مصرح بحذف هذا المصروف" }, { status: 403 });
    }

    await withRetry(() => db.expense.delete({ where: { id: expenseId } }));

    // Log activity
    await withRetry(() => db.activityLog.create({
      data: {
        repId: expense.repId,
        action: "حذف مصروف",
        details: `تم حذف مصروف بمبلغ ${expense.amount.toLocaleString("ar-SA")} ر.س`,
      },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
