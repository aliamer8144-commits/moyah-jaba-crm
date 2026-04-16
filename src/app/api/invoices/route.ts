import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";

// GET /api/invoices?repId=xxx or ?adminId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const adminId = searchParams.get("adminId");
    const clientId = searchParams.get("clientId");
    const invoiceId = searchParams.get("invoiceId");

    if (invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true, rep: { select: { id: true, name: true } } },
      });
      return NextResponse.json(invoice);
    }

    if (clientId) {
      const invoices = await db.invoice.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(invoices);
    }

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      const filterRep = searchParams.get("filterRepId");
      const invoices = await db.invoice.findMany({
        where: filterRep ? { repId: filterRep } : {},
        include: { client: true, rep: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(invoices);
    }

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    const invoices = await db.invoice.findMany({
      where: { repId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/invoices
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      repId,
      clientId,
      productSize,
      quantity,
      price,
      total,
      discountType,
      discountValue,
      finalTotal,
      promotionQty,
      paidAmount,
      debtAmount,
      creditAmount,
    } = body;

    if (!repId || !clientId || !quantity || !price) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    // Check rep inventory
    const rep = await db.user.findUnique({ where: { id: repId } });
    if (!rep) {
      return NextResponse.json({ error: "المندوب غير موجود" }, { status: 404 });
    }

    const totalQuantity = quantity + (promotionQty || 0);
    if (rep.allocatedInventory < totalQuantity) {
      return NextResponse.json(
        { error: "الكمية المطلوبة تتجاوز المخزون المتاح" },
        { status: 400 }
      );
    }

    // Create invoice and update inventory in transaction
    const result = await withRetry(() => db.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          repId,
          clientId,
          productSize: productSize || "عادي",
          quantity,
          price: parseFloat(price),
          total: parseFloat(total),
          discountType: discountType || "none",
          discountValue: parseFloat(discountValue) || 0,
          finalTotal: parseFloat(finalTotal),
          promotionQty: promotionQty || 0,
          paidAmount: parseFloat(paidAmount),
          debtAmount: parseFloat(debtAmount) || 0,
          creditAmount: parseFloat(creditAmount) || 0,
        },
      });

      // Update rep inventory
      await tx.user.update({
        where: { id: repId },
        data: { allocatedInventory: { decrement: totalQuantity } },
      });

      // Update client wallet balance
      if (debtAmount > 0) {
        await tx.client.update({
          where: { id: clientId },
          data: { walletBalance: { decrement: debtAmount } },
        });
      }
      if (creditAmount > 0) {
        await tx.client.update({
          where: { id: clientId },
          data: { walletBalance: { increment: creditAmount } },
        });
      }

      return invoice;
    }));

    // Get client name for logging
    const client = await db.client.findUnique({ where: { id: clientId } });

    // Log activity
    await withRetry(() => db.activityLog.create({
      data: {
        repId,
        action: "إنشاء فاتورة",
        details: `فاتورة جديدة للعميل ${client?.name || "غير معروف"} - المبلغ: ${finalTotal} ر.س`,
      },
    }));

    // Create notification for admin
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await withRetry(() => db.notification.create({
        data: {
          userId: admin.id,
          title: "فاتورة جديدة",
          message: `تم إنشاء فاتورة بمبلغ ${finalTotal} ر.س للعميل ${client?.name || "غير معروف"}`,
          type: "success",
        },
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/invoices?invoiceId=xxx&adminId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const adminId = searchParams.get("adminId");

    if (!adminId || !invoiceId) {
      return NextResponse.json({ error: "معرفات مطلوبة" }, { status: 400 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    }

    // Restore inventory
    await withRetry(() => db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: invoice.repId },
        data: { allocatedInventory: { increment: invoice.quantity + invoice.promotionQty } },
      });

      // Restore client wallet
      if (invoice.debtAmount > 0) {
        await tx.client.update({
          where: { id: invoice.clientId },
          data: { walletBalance: { increment: invoice.debtAmount } },
        });
      }
      if (invoice.creditAmount > 0) {
        await tx.client.update({
          where: { id: invoice.clientId },
          data: { walletBalance: { decrement: invoice.creditAmount } },
        });
      }

      await tx.invoice.delete({ where: { id: invoiceId } });
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
