import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/rep-stats?repId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      clientCount,
      invoiceCount,
      revenueResult,
      debtResult,
      todayInvoiceCount,
      todayRevenueResult,
      totalDebtCollected,
    ] = await Promise.all([
      // Total clients
      db.client.count({ where: { repId } }),

      // Total invoices
      db.invoice.count({ where: { repId } }),

      // Total revenue (sum of finalTotal)
      db.invoice.aggregate({
        where: { repId },
        _sum: { finalTotal: true },
      }),

      // Total debt
      db.invoice.aggregate({
        where: { repId },
        _sum: { debtAmount: true },
      }),

      // Today's invoice count
      db.invoice.count({
        where: {
          repId,
          createdAt: { gte: startOfToday },
        },
      }),

      // Today's revenue
      db.invoice.aggregate({
        where: {
          repId,
          createdAt: { gte: startOfToday },
        },
        _sum: { finalTotal: true },
      }),

      // Total debt collected (sum of receipt amounts)
      db.receipt.aggregate({
        where: { repId },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      clientCount,
      invoiceCount,
      totalRevenue: revenueResult._sum.finalTotal || 0,
      totalDebt: debtResult._sum.debtAmount || 0,
      todayInvoices: todayInvoiceCount,
      todayRevenue: todayRevenueResult._sum.finalTotal || 0,
      totalDebtCollected: totalDebtCollected._sum.amount || 0,
    });
  } catch (error) {
    console.error("Get rep stats error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
