import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const bigIntReplacer = (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value;

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 86400000);
    case '30d': return new Date(now.getTime() - 30 * 86400000);
    case '90d': return new Date(now.getTime() - 90 * 86400000);
    case 'all': default: return new Date(0);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const startDate = getStartDate(period);

    // Revenue summary
    const invoices = await db.invoice.findMany({
      where: { createdAt: { gte: startDate } },
      include: { rep: true, client: true },
    });

    const totalRevenue = invoices.reduce((s, i) => s + i.finalTotal, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalDebt = invoices.reduce((s, i) => s + i.debtAmount, 0);
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;
    const avgInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;
    const paidCount = invoices.filter(i => i.debtAmount <= 0).length;
    const debtCount = invoices.filter(i => i.debtAmount > 0).length;

    // Revenue by payment method (paid vs debt)
    const revenueByPayment = {
      paid: totalPaid,
      debt: totalDebt,
    };

    // Revenue by product size
    const sizeMap = new Map<string, number>();
    for (const inv of invoices) {
      sizeMap.set(inv.productSize, (sizeMap.get(inv.productSize) || 0) + inv.finalTotal);
    }
    const revenueByProductSize = Array.from(sizeMap.entries()).map(([size, revenue]) => ({
      size,
      revenue,
      count: invoices.filter(i => i.productSize === size).length,
    }));

    // Top performing reps
    const repMap = new Map<string, { name: string; revenue: number; count: number; debt: number }>();
    for (const inv of invoices) {
      const existing = repMap.get(inv.repId) || { name: inv.rep.name, revenue: 0, count: 0, debt: 0 };
      existing.revenue += inv.finalTotal;
      existing.count += 1;
      existing.debt += inv.debtAmount;
      repMap.set(inv.repId, existing);
    }
    const topReps = Array.from(repMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((r, i) => ({ rank: i + 1, ...r }));

    // Client growth - new clients per week
    const allClients = await db.client.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });
    const weekMap = new Map<string, number>();
    for (const c of allClients) {
      const weekStart = new Date(c.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weekMap.set(key, (weekMap.get(key) || 0) + 1);
    }
    const clientGrowth = Array.from(weekMap.entries()).map(([week, count]) => ({
      week,
      count,
    })).sort((a, b) => a.week.localeCompare(b.week));

    const newClientCount = allClients.length;

    // Most active clients
    const clientMap = new Map<string, { name: string; invoiceCount: number; totalRevenue: number }>();
    for (const inv of invoices) {
      const existing = clientMap.get(inv.clientId) || { name: inv.client.name, invoiceCount: 0, totalRevenue: 0 };
      existing.invoiceCount += 1;
      existing.totalRevenue += inv.finalTotal;
      clientMap.set(inv.clientId, existing);
    }
    const mostActiveClients = Array.from(clientMap.values())
      .sort((a, b) => b.invoiceCount - a.invoiceCount)
      .slice(0, 10);

    const report = {
      period,
      generatedAt: new Date().toISOString(),
      revenue: {
        total: totalRevenue,
        paid: totalPaid,
        debt: totalDebt,
        avgInvoiceValue,
        totalCount: invoices.length,
        paidCount,
        debtCount,
        collectionRate,
        byPayment: revenueByPayment,
        byProductSize: revenueByProductSize,
      },
      topReps,
      clientGrowth,
      newClientCount,
      mostActiveClients,
    };

    return NextResponse.json(report, {
      headers: { 'Content-Type': 'application/json' },
      // @ts-expect-error BigInt serialization handled manually
      __body: JSON.stringify(report, bigIntReplacer),
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب التقارير' },
      { status: 500 }
    );
  }
}
