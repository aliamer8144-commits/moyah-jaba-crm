import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/invoice-aging?adminId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json({ error: "معرف المدير مطلوب" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // Fetch all invoices with debtAmount > 0
    const debtInvoices = await db.invoice.findMany({
      where: { debtAmount: { gt: 0 } },
      include: {
        client: { select: { id: true, name: true } },
        rep: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    // Define aging buckets
    type Bucket = {
      range: string;
      rangeAr: string;
      count: number;
      totalDebt: number;
      percentage: number;
      color: string;
    };

    const buckets: Bucket[] = [
      { range: "0-30", rangeAr: "حالي (0-30 يوم)", count: 0, totalDebt: 0, percentage: 0, color: "#007AFF" },
      { range: "31-60", rangeAr: "31-60 يوم", count: 0, totalDebt: 0, percentage: 0, color: "#FF9500" },
      { range: "61-90", rangeAr: "61-90 يوم", count: 0, totalDebt: 0, percentage: 0, color: "#FF3B30" },
      { range: "90+", rangeAr: "أكثر من 90 يوم", count: 0, totalDebt: 0, percentage: 0, color: "#8B0000" },
    ];

    for (const inv of debtInvoices) {
      const createdDate = new Date(inv.createdAt);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const debt = Number(inv.debtAmount) || 0;

      if (diffDays <= 30) {
        buckets[0].count += 1;
        buckets[0].totalDebt += debt;
      } else if (diffDays <= 60) {
        buckets[1].count += 1;
        buckets[1].totalDebt += debt;
      } else if (diffDays <= 90) {
        buckets[2].count += 1;
        buckets[2].totalDebt += debt;
      } else {
        buckets[3].count += 1;
        buckets[3].totalDebt += debt;
      }
    }

    const totalAgingDebt = buckets.reduce((s, b) => s + b.totalDebt, 0);
    const totalAgingCount = buckets.reduce((s, b) => s + b.count, 0);

    // Calculate percentage
    for (const bucket of buckets) {
      bucket.percentage = totalAgingDebt > 0 ? Math.round((bucket.totalDebt / totalAgingDebt) * 100) : 0;
    }

    return NextResponse.json({
      buckets,
      totalAgingDebt,
      totalAgingCount,
    });
  } catch (error) {
    console.error("Invoice aging error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
