import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/reps/stats?adminId=xxx
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

    const totalReps = await db.user.count({ where: { role: "REP" } });
    const activeReps = await db.user.count({ where: { role: "REP", isActive: true } });
    const totalClients = await db.client.count();
    const totalInvoices = await db.invoice.count();
    const pendingRequests = await db.request.count({ where: { status: "pending" } });

    // Revenue calculation
    const revenueResult = await db.invoice.aggregate({
      _sum: { finalTotal: true, paidAmount: true, debtAmount: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayInvoices = await db.invoice.count({
      where: { createdAt: { gte: today } },
    });

    const todayRevenue = await db.invoice.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { finalTotal: true },
    });

    return NextResponse.json({
      totalReps,
      activeReps,
      totalClients,
      totalInvoices,
      pendingRequests,
      totalRevenue: revenueResult._sum.finalTotal || 0,
      totalPaid: revenueResult._sum.paidAmount || 0,
      totalDebt: revenueResult._sum.debtAmount || 0,
      todayInvoices,
      todayRevenue: todayRevenue._sum.finalTotal || 0,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
