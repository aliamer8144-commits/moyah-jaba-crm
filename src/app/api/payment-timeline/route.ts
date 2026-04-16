import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffWeek < 4) return `منذ ${diffWeek} أسبوع`;
  if (diffMonth < 12) return `منذ ${diffMonth} شهر`;
  return `منذ ${Math.floor(diffDay / 365)} سنة`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'معرف العميل مطلوب' }, { status: 400 });
    }

    // Fetch all receipts for the client
    const receipts = await db.receipt.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all invoices for the client
    const invoices = await db.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    // Build timeline items
    interface TimelineItem {
      type: 'payment' | 'invoice';
      id: string;
      amount: number;
      date: string;
      relativeTime: string;
      method?: string;
      invoiceDetails?: {
        id: string;
        quantity: number;
        productSize: string;
        total: number;
        paidAmount: number;
        debtAmount: number;
      };
      status: string;
    }

    const items: TimelineItem[] = [];

    for (const receipt of receipts) {
      items.push({
        type: 'payment',
        id: receipt.id,
        amount: receipt.amount,
        date: receipt.createdAt.toISOString(),
        relativeTime: getRelativeTime(receipt.createdAt),
        method: receipt.method,
        status: 'completed',
      });
    }

    for (const invoice of invoices) {
      const isOverdue = invoice.debtAmount > 0;
      const createdAt = invoice.createdAt;
      const daysSinceCreation = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      items.push({
        type: 'invoice',
        id: invoice.id,
        amount: invoice.finalTotal,
        date: invoice.createdAt.toISOString(),
        relativeTime: getRelativeTime(invoice.createdAt),
        invoiceDetails: {
          id: invoice.id,
          quantity: invoice.quantity,
          productSize: invoice.productSize,
          total: invoice.total,
          paidAmount: invoice.paidAmount,
          debtAmount: invoice.debtAmount,
        },
        status: isOverdue
          ? daysSinceCreation > 30
            ? 'overdue'
            : 'pending'
          : 'paid',
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate running balance (going from oldest to newest)
    // First sort ascending to calculate running balance
    const sortedAsc = [...items].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    const balanceMap = new Map<string, number>();

    for (const item of sortedAsc) {
      if (item.type === 'invoice') {
        runningBalance += item.amount;
        if (item.invoiceDetails) {
          runningBalance -= item.invoiceDetails.paidAmount;
        }
      } else if (item.type === 'payment') {
        runningBalance -= item.amount;
      }
      balanceMap.set(item.id, runningBalance);
    }

    // Return items sorted descending with running balance
    const result = items.map((item) => ({
      ...item,
      runningBalance: balanceMap.get(item.id) || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment timeline error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب البيانات' },
      { status: 500 }
    );
  }
}
