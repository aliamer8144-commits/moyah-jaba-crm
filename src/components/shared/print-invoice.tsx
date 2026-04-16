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

function getPaymentStatus(invoice: Invoice): { label: string; color: string } {
  if (invoice.debtAmount > 0) return { label: 'عليها دين', color: '#FF3B30' };
  if (invoice.creditAmount > 0) return { label: 'رصيد إضافي', color: '#007AFF' };
  return { label: 'مدفوعة بالكامل', color: '#34C759' };
}

export function PrintInvoice({ invoice, repName }: PrintInvoiceProps) {
  const paymentStatus = getPaymentStatus(invoice);
  const hasDiscount = invoice.discountType !== 'none' && invoice.discountValue > 0;
  const hasPromotion = invoice.promotionQty > 0;

  return (
    <div className="print-invoice hidden" dir="rtl">
      {/* Header */}
      <div className="print-invoice-header">
        <h1>مياه جبأ</h1>
        <p style={{ fontSize: '0.875rem', margin: '0.25rem 0' }}>
          شركة مياه جبأ للمياه المعبأة
        </p>
        <p style={{ fontSize: '0.75rem', margin: 0, color: '#666' }}>
          هاتف: 05XXXXXXXX | جبأ، فلسطين
        </p>
      </div>

      {/* Invoice Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.875rem' }}>
        <div>
          <strong>رقم الفاتورة:</strong>{' '}
          <span dir="ltr">{invoice.id.slice(-6).toUpperCase()}</span>
        </div>
        <div>
          <strong>التاريخ:</strong> {formatDate(invoice.createdAt)}
        </div>
      </div>

      {repName && (
        <div style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
          <strong>المندوب:</strong> {repName}
        </div>
      )}

      {/* Client Info */}
      <div style={{ 
        padding: '0.75rem', 
        marginBottom: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '0.875rem',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>بيانات العميل</div>
        <div>{invoice.client?.name || 'عميل'}</div>
        {invoice.client?.phone && (
          <div dir="ltr" style={{ textAlign: 'left' }}>هاتف: {invoice.client.phone}</div>
        )}
        {invoice.client?.address && <div>العنوان: {invoice.client.address}</div>}
      </div>

      {/* Items Table */}
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الحجم</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>مياه جبأ</td>
            <td>{invoice.productSize}</td>
            <td>{invoice.quantity} كرتون</td>
            <td>{formatCurrency(invoice.price)} ر.س</td>
            <td>{formatCurrency(invoice.total)} ر.س</td>
          </tr>
          {hasPromotion && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'left' }}>دعاية ({invoice.promotionQty} كرتون مجاني)</td>
              <td style={{ color: '#FF9500' }}>مجاني</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem', 
        alignItems: 'flex-end',
        marginTop: '1rem',
        fontSize: '0.875rem',
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>الإجمالي:</span>
          <span>{formatCurrency(invoice.total)} ر.س</span>
        </div>

        {hasDiscount && (
          <div style={{ display: 'flex', gap: '1rem', color: '#FF3B30' }}>
            <span>
              الخصم {invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}:
            </span>
            <span>-{formatCurrency(invoice.discountValue)} ر.س</span>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          fontWeight: 'bold', 
          fontSize: '1.125rem',
          borderTop: '2px solid #000',
          paddingTop: '0.5rem',
          marginTop: '0.25rem',
        }}>
          <span>الإجمالي النهائي:</span>
          <span>{formatCurrency(invoice.finalTotal)} ر.س</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>المدفوع:</span>
          <span style={{ color: '#34C759' }}>{formatCurrency(invoice.paidAmount)} ر.س</span>
        </div>

        {invoice.debtAmount > 0 && (
          <div style={{ display: 'flex', gap: '1rem', color: '#FF3B30' }}>
            <span>المبلغ المدين:</span>
            <span>{formatCurrency(invoice.debtAmount)} ر.س</span>
          </div>
        )}

        {invoice.creditAmount > 0 && (
          <div style={{ display: 'flex', gap: '1rem', color: '#007AFF' }}>
            <span>المضاف للرصيد:</span>
            <span>+{formatCurrency(invoice.creditAmount)} ر.س</span>
          </div>
        )}
      </div>

      {/* Payment Status */}
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '0.5rem 0.75rem',
        border: `2px solid ${paymentStatus.color}`,
        borderRadius: '8px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '0.875rem',
        color: paymentStatus.color,
      }}>
        {paymentStatus.label}
      </div>

      {/* Footer */}
      <div className="print-invoice-footer">
        <div>توقيع العميل: _______________</div>
        <div>توقيت المندوب: _______________</div>
      </div>
    </div>
  );
}
