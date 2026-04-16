import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/receipts?repId=xxx or ?adminId=xxx or ?clientId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const adminId = searchParams.get("adminId");
    const clientId = searchParams.get("clientId");

    if (clientId) {
      const receipts = await db.receipt.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(receipts);
    }

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      const filterRep = searchParams.get("filterRepId");
      const receipts = await db.receipt.findMany({
        where: filterRep ? { repId: filterRep } : {},
        include: { client: true, rep: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(receipts);
    }

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    const receipts = await db.receipt.findMany({
      where: { repId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Get receipts error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/receipts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repId, clientId, amount, method, notes } = body;

    if (!repId || !clientId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها والمبلغ يجب أن يكون أكبر من صفر" },
        { status: 400 }
      );
    }

    // Validate rep exists
    const rep = await db.user.findUnique({ where: { id: repId } });
    if (!rep) {
      return NextResponse.json({ error: "المندوب غير موجود" }, { status: 404 });
    }

    // Validate client exists
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    // Generate receipt number
    const receiptCount = await db.receipt.count();
    const receiptNo = `REC-${String(receiptCount + 1).padStart(4, "0")}`;

    const parsedAmount = parseFloat(amount);
    const paymentMethod = method || "نقدي";

    // Create receipt and update client wallet in transaction
    const result = await db.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          repId,
          clientId,
          receiptNo,
          amount: parsedAmount,
          method: paymentMethod,
          notes: notes || null,
        },
      });

      // Add amount to client wallet balance (reduces debt or adds credit)
      await tx.client.update({
        where: { id: clientId },
        data: { walletBalance: { increment: parsedAmount } },
      });

      return receipt;
    });

    // Log activity
    await db.activityLog.create({
      data: {
        repId,
        action: "تسجيل سند قبض",
        details: `سند قبض رقم ${receiptNo} - المبلغ: ${parsedAmount.toLocaleString("ar-SA")} ر.س من العميل ${client.name}`,
      },
    });

    // Create notification for admin
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          title: "سند قبض جديد",
          message: `تم تسجيل سند قبض بمبلغ ${parsedAmount.toLocaleString("ar-SA")} ر.س من العميل ${client.name} بواسطة ${rep.name}`,
          type: "success",
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create receipt error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
