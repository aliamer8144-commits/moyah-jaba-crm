import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/stats?adminId=xxx&period=7d|30d|90d|all
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");
    const period = searchParams.get("period") || "30d";

    if (!adminId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date(0);
    if (period !== "all") {
      const days = parseInt(period) || 30;
      startDate = new Date(now.getTime() - days * 86400000);
      startDate.setHours(0, 0, 0, 0);
    }

    // Daily revenue data for chart (PostgreSQL syntax)
    const dailyInvoicesRaw = await db.$queryRaw<Array<{ date: string; total: unknown; count: unknown }>>(
      Prisma.sql`
        SELECT DATE("createdAt") as date, SUM("finalTotal") as total, COUNT(*) as count
        FROM "Invoice"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `
    );
    const dailyInvoices = dailyInvoicesRaw.map((d) => ({ date: d.date, total: Number(d.total), count: Number(d.count) }));

    // Monthly revenue (PostgreSQL: TO_CHAR instead of strftime)
    const monthlyRevenueRaw = await db.$queryRaw<Array<{ month: string; total: unknown }>>(
      Prisma.sql`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, SUM("finalTotal") as total
        FROM "Invoice"
        WHERE "createdAt" >= ${new Date(now.getTime() - 365 * 86400000)}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `
    );
    const monthlyRevenue = monthlyRevenueRaw.map((d) => ({ month: d.month, total: Number(d.total) }));

    // Top clients by revenue (PostgreSQL: quoted table/column names, proper GROUP BY)
    const topClientsRaw = await db.$queryRaw<Array<{ clientId: string; clientName: string; total: unknown; invoiceCount: unknown }>>(
      Prisma.sql`
        SELECT c.id as "clientId", c.name as "clientName", SUM(i."finalTotal") as total, COUNT(*) as "invoiceCount"
        FROM "Invoice" i
        JOIN "Client" c ON i."clientId" = c.id
        WHERE i."createdAt" >= ${startDate}
        GROUP BY c.id, c.name
        ORDER BY total DESC
        LIMIT 5
      `
    );
    const topClients = topClientsRaw.map((c) => ({ clientId: c.clientId, clientName: c.clientName, total: Number(c.total), invoiceCount: Number(c.invoiceCount) }));

    // Rep performance
    const repPerformance = await db.user.findMany({
      where: { role: "REP" },
      select: {
        id: true,
        name: true,
        isActive: true,
        _count: { select: { invoices: true, clients: true } },
        invoices: {
          where: { createdAt: { gte: startDate } },
          select: { finalTotal: true, paidAmount: true, debtAmount: true },
        },
      },
    });

    const repStats = repPerformance.map((r) => {
      const totalRevenue = r.invoices.reduce((s, i) => s + i.finalTotal, 0);
      const totalPaid = r.invoices.reduce((s, i) => s + i.paidAmount, 0);
      const totalDebt = r.invoices.reduce((s, i) => s + i.debtAmount, 0);
      return {
        id: r.id,
        name: r.name,
        isActive: r.isActive,
        clientCount: r._count.clients,
        invoiceCount: r.invoices.length,
        totalRevenue,
        totalPaid,
        totalDebt,
      };
    });

    // Payment method distribution (PostgreSQL: quoted table/column names)
    const paymentMethodsRaw = await db.$queryRaw<Array<{ method: string; count: unknown; total: unknown }>>(
      Prisma.sql`
        SELECT method, COUNT(*) as count, SUM(amount) as total
        FROM "Receipt"
        WHERE "createdAt" >= ${startDate}
        GROUP BY method
      `
    );
    const paymentMethods = paymentMethodsRaw.map((p) => ({ method: p.method, count: Number(p.count), total: Number(p.total) }));

    // Inventory status per rep
    const inventoryStatus = await db.user.findMany({
      where: { role: "REP", isActive: true },
      select: { id: true, name: true, allocatedInventory: true },
      orderBy: { allocatedInventory: "asc" },
    });

    // BigInt-safe serialization
    const data = JSON.parse(JSON.stringify({
      dailyInvoices,
      monthlyRevenue,
      topClients,
      repStats,
      paymentMethods,
      inventoryStatus,
    }, (_, value) => (typeof value === 'bigint' ? Number(value) : value)));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
