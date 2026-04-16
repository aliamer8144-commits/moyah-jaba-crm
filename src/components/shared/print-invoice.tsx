'use client';

import { Invoice } from '@/lib/store';

interface PrintInvoiceProps {
  invoice: Invoice;
  repName?: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(n: number) {
  return n.toLocaleString('ar-SA');
}

export function PrintInvoice({ invoice, repName }: PrintInvoiceProps) {
  const hasDiscount = invoice.discountType !== 'none' && invoice.discountValue > 0;
  const hasPromotion = invoice.promotionQty > 0;

  return (
    <div className="print-invoice" dir="rtl">
      {/* Header */}
      <div className="print-inv-header">
        <div className="print-inv-brand">مياه جبأ</div>
        <div className="print-inv-subtitle">فاتورة بيع</div>
      </div>

      {/* Dashed line */}
      <div className="print-inv-divider" />

      {/* Invoice Meta */}
      <div className="print-inv-meta">
        <div className="print-inv-meta-row">
          <span className="print-inv-meta-label">رقم الفاتورة</span>
          <span className="print-inv-meta-value" dir="ltr">{invoice.id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="print-inv-meta-row">
          <span className="print-inv-meta-label">التاريخ</span>
          <span className="print-inv-meta-value">{formatDate(invoice.createdAt)}</span>
        </div>
        <div className="print-inv-meta-row">
          <span className="print-inv-meta-label">العميل</span>
          <span className="print-inv-meta-value">{invoice.client?.name || 'عميل'}</span>
        </div>
        {invoice.client?.businessName && (
          <div className="print-inv-meta-row">
            <span className="print-inv-meta-label">النشاط</span>
            <span className="print-inv-meta-value">{invoice.client.businessName}</span>
          </div>
        )}
      </div>

      {/* Dashed line */}
      <div className="print-inv-divider" />

      {/* Items */}
      <table className="print-inv-table">
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>مياه جبأ</td>
            <td>{invoice.quantity} كرتون</td>
            <td>{formatCurrency(invoice.price)} ر.س</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="print-inv-total-label">المجموع</td>
            <td className="print-inv-total-value">{formatCurrency(invoice.total)} ر.س</td>
          </tr>
        </tfoot>
      </table>

      {hasPromotion && (
        <div className="print-inv-promo">
          دعاية: {invoice.promotionQty} كرتون مجاني
        </div>
      )}

      {/* Dashed line */}
      <div className="print-inv-divider" />

      {/* Totals */}
      <div className="print-inv-totals">
        {hasDiscount && (
          <div className="print-inv-totals-row print-inv-discount">
            <span>الخصم {invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}</span>
            <span>-{formatCurrency(invoice.discountValue)} ر.س</span>
          </div>
        )}

        <div className="print-inv-totals-row print-inv-final">
          <span>الإجمالي النهائي</span>
          <span>{formatCurrency(invoice.finalTotal)} ر.س</span>
        </div>

        <div className="print-inv-totals-row">
          <span>المدفوع</span>
          <span>{formatCurrency(invoice.paidAmount)} ر.س</span>
        </div>

        {invoice.debtAmount > 0 && (
          <div className="print-inv-totals-row print-inv-debt">
            <span>المبلغ المدين</span>
            <span>{formatCurrency(invoice.debtAmount)} ر.س</span>
          </div>
        )}

        {invoice.creditAmount > 0 && (
          <div className="print-inv-totals-row print-inv-credit">
            <span>رصيد إضافي</span>
            <span>+{formatCurrency(invoice.creditAmount)} ر.س</span>
          </div>
        )}
      </div>

      {/* Dashed line */}
      <div className="print-inv-divider" />

      {/* Footer */}
      <div className="print-inv-footer">
        {repName && <div>المندوب: {repName}</div>}
        <div className="print-inv-thanks">شكراً لتعاملكم معنا</div>
      </div>
    </div>
  );
}
