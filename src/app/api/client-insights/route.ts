import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client-insights?clientId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'معرف العميل مطلوب' }, { status: 400 });
    }

    // Fetch all invoices for this client
    const invoices = await db.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all receipts for this client
    const receipts = await db.receipt.findMany({
      where: { clientId },
    });

    // Fetch client wallet balance
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { walletBalance: true },
    });

    const invoiceCount = invoices.length;
    const receiptCount = receipts.length;

    // Total purchases = sum of all finalTotals
    const totalPurchases = invoices.reduce((sum, inv) => sum + inv.finalTotal, 0);

    // Total paid = sum of all paidAmounts
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    // Outstanding debt (negative walletBalance = owes money)
    const outstandingDebt = client ? -client.walletBalance : 0;

    // Average order value
    const averageOrderValue = invoiceCount > 0 ? totalPurchases / invoiceCount : 0;

    // Last purchase date
    const lastPurchaseDate = invoices.length > 0 ? invoices[0].createdAt.toISOString() : null;

    // Purchase frequency
    let purchaseFrequency = 'غير نشط';
    if (lastPurchaseDate) {
      const lastDate = new Date(lastPurchaseDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
      if (diffDays <= 7) {
        purchaseFrequency = 'نشط';
      } else if (diffDays <= 30) {
        purchaseFrequency = 'منتظم';
      } else {
        purchaseFrequency = 'غير نشط';
      }
    }

    // Payment reliability = % of invoices fully paid (debtAmount === 0)
    const fullyPaidInvoices = invoices.filter(inv => inv.debtAmount === 0).length;
    const paymentReliability = invoiceCount > 0 ? Math.round((fullyPaidInvoices / invoiceCount) * 100) : 100;

    return NextResponse.json({
      totalPurchases,
      totalPaid,
      outstandingDebt,
      averageOrderValue,
      lastPurchaseDate,
      purchaseFrequency,
      paymentReliability,
      invoiceCount,
      receiptCount,
    });
  } catch (error) {
    console.error('Client insights error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات العميل' }, { status: 500 });
  }
}
