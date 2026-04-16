'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, Invoice } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PrintInvoice } from '@/components/shared/print-invoice';
import { InvoiceNotes } from '@/components/rep/invoice-notes';
import {
  ArrowRight,
  Package,
  User,
  Calendar,
  Hash,
  Receipt,
  Percent,
  Gift,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Pencil,
  Trash2,
  Share2,
  Printer,
  Banknote,
  RefreshCw,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    const startVal = prevValue.current;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.round(startVal + (value - startVal) * eased);
      setDisplayValue(currentVal);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    prevValue.current = value;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{displayValue.toLocaleString('ar-SA')}</>;
}

export function InvoiceDetail({
  invoice,
  onBack,
}: {
  invoice: Invoice;
  onBack: () => void;
}) {
  const {
    user,
    setRequestDialogOpen,
    setRequestEntityType,
    setRequestActionType,
    setRequestEntityId,
    setRepTab,
    setSelectedClientId,
    setInvoices,
  } = useAppStore();

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const handleEditRequest = () => {
    setRequestEntityType('invoice');
    setRequestActionType('edit');
    setRequestEntityId(invoice.id);
    setRequestDialogOpen(true);
  };

  const handleDeleteRequest = () => {
    setRequestEntityType('invoice');
    setRequestActionType('delete');
    setRequestEntityId(invoice.id);
    setRequestDialogOpen(true);
  };

  const handleShare = async () => {
    const text = `فاتورة مياه جبأ\nالعميل: ${invoice.client?.name || 'عميل'}\nالمبلغ: ${invoice.finalTotal.toLocaleString('ar-SA')} ر.س\nالتاريخ: ${formatDate(invoice.createdAt)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'فاتورة مياه جبأ', text });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('تم نسخ تفاصيل الفاتورة');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.info('جارٍ تحضير الفاتورة للطباعة');
  };

  const handleShare = async () => {
    const text = `فاتورة مياه جبأ\nالعميل: ${invoice.client?.name || 'عميل'}\nالمبلغ: ${invoice.finalTotal.toLocaleString('ar-SA')} ر.س\nالتاريخ: ${formatDate(invoice.createdAt)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'فاتورة مياه جبأ', text });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('تم نسخ تفاصيل الفاتورة');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.info('جارٍ تحضير الفاتورة للطباعة');
  };

  const handleOpenPaymentDialog = () => {
    setPaymentAmount(String(invoice.debtAmount));
    setPaymentMethod('نقدي');
    setPaymentNotes('');
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!user) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    if (amount > invoice.debtAmount) {
      toast.error('المبلغ لا يمكن أن يتجاوز المبلغ المدين');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          clientId: invoice.clientId,
          amount,
          method: paymentMethod,
          notes: paymentNotes || null,
        }),
      });
      if (res.ok) {
        toast.success('تم تسجيل الدفعة بنجاح');
        setPaymentDialogOpen(false);
        // Refresh invoice data
        const invRes = await fetch(`/api/invoices?invoiceId=${invoice.id}`);
        if (invRes.ok) {
          const updatedInv = await invRes.json();
          // Update invoices in store
          const { invoices: storeInvoices } = useAppStore.getState();
          setInvoices(storeInvoices.map((inv: Invoice) => (inv.id === invoice.id ? { ...inv, ...updatedInv } : inv)));
        }
        onBack();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'حدث خطأ أثناء تسجيل الدفعة');
      }
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <motion.div initial="initial" animate="animate" variants={fadeUp} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-2">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowRight className="w-5 h-5 text-[#1c1c1e]" />
        </button>
        <h2 className="text-lg font-bold">تفاصيل الفاتورة</h2>
      </div>

      {/* Invoice Card with Gradient Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Gradient Header with Prominent Amount */}
        <div className="bg-gradient-to-bl from-[#34C759] via-[#2DA44E] to-[#28A745] p-6 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-4 right-4 w-16 h-16 bg-white/5 rounded-full" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="font-bold text-base">فاتورة</span>
            </div>
            <div className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-sm">
              <Hash className="w-3 h-3" />
              {invoice.id.slice(-6).toUpperCase()}
            </div>
          </div>

          {/* Prominent amount */}
          <div className="relative z-10">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl font-extrabold tracking-tight"
            >
              <AnimatedCounter value={invoice.finalTotal} />{' '}
              <span className="text-xl font-normal opacity-80">ر.س</span>
            </motion.p>
          </div>

          <div className="flex items-center gap-1 mt-3 text-sm opacity-80 relative z-10">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(invoice.createdAt)}
          </div>

          {/* Status badge */}
          <div className="mt-3 relative z-10">
            {invoice.debtAmount > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                <AlertCircle className="w-3 h-3" />
                عليها دين: {invoice.debtAmount.toLocaleString('ar-SA')} ر.س
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                <CreditCard className="w-3 h-3" />
                مدفوعة بالكامل
              </span>
            )}
          </div>
        </div>

        {/* Printed Receipt-Style Breakdown */}
        <div className="p-5">
          {/* Dashed separator - receipt style */}
          <div className="relative mb-5">
            <div className="border-t-2 border-dashed border-gray-200" />
            <div className="absolute -top-2.5 right-1/2 translate-x-1/2">
              <div className="w-5 h-5 bg-white rounded-full border-2 border-dashed border-gray-200" />
            </div>
          </div>

          {/* Client Info */}
          <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl mb-5">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{invoice.client?.name || 'عميل'}</p>
              <p className="text-xs text-gray-500">العميل</p>
            </div>
            <div className="w-2 h-8 bg-gradient-to-b from-[#007AFF] to-[#0055D4] rounded-full opacity-30" />
          </div>

          {/* Breakdown Table - Receipt Style */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">تفاصيل الفاتورة</h4>

            <div className="space-y-2.5">
              <Row label="المنتج" value="مياه جبأ" icon={<Package className="w-4 h-4 text-gray-400" />} />
              <Row label="الكمية" value={`${invoice.quantity}`} />
              <Row label="سعر الوحدة" value={`${invoice.price.toLocaleString('ar-SA')} ر.س`} />
              <Row label="الإجمالي" value={`${invoice.total.toLocaleString('ar-SA')} ر.س`} bold />

              {invoice.discountType !== 'none' && invoice.discountValue > 0 && (
                <Row
                  label={`الخصم ${invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}`}
                  value={`-${invoice.discountValue.toLocaleString('ar-SA')} ر.س`}
                  className="text-[#FF3B30]"
                  icon={<Percent className="w-4 h-4 text-[#FF3B30]" />}
                />
              )}

              {invoice.promotionQty > 0 && (
                <div className="flex items-center gap-2 text-xs text-[#FF9500] bg-[#FF9500]/5 px-3 py-2 rounded-lg">
                  <Gift className="w-3.5 h-3.5" />
                  <span>دعاية: {invoice.promotionQty} مجانية</span>
                </div>
              )}
            </div>

            {/* Dashed separator */}
            <div className="border-t-2 border-dashed border-gray-200 my-1" />

            {/* Final Total - Highlighted */}
            <div className="bg-[#34C759]/5 rounded-xl p-3.5">
              <Row
                label="الإجمالي النهائي"
                value={`${invoice.finalTotal.toLocaleString('ar-SA')} ر.س`}
                bold
                highlight
                icon={<Receipt className="w-4 h-4 text-[#34C759]" />}
              />
            </div>

            {/* Dashed separator */}
            <div className="border-t-2 border-dashed border-gray-200 my-1" />

            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3">الدفع</h4>

            <div className="space-y-2.5">
              <Row
                label="المبلغ المدفوع"
                value={`${invoice.paidAmount.toLocaleString('ar-SA')} ر.س`}
                icon={<CreditCard className="w-4 h-4 text-[#34C759]" />}
              />
              {invoice.debtAmount > 0 && (
                <Row
                  label="المبلغ المدين"
                  value={`${invoice.debtAmount.toLocaleString('ar-SA')} ر.س`}
                  className="text-[#FF3B30]"
                  icon={<AlertCircle className="w-4 h-4 text-[#FF3B30]" />}
                />
              )}
              {invoice.creditAmount > 0 && (
                <Row
                  label="المبلغ المضاف للرصيد"
                  value={`${invoice.creditAmount.toLocaleString('ar-SA')} ر.س`}
                  className="text-[#34C759]"
                  icon={<TrendingUp className="w-4 h-4 text-[#34C759]" />}
                />
              )}
            </div>
          </div>

          {/* Receipt bottom notches */}
          <div className="relative mt-5">
            <div className="border-t-2 border-dashed border-gray-200" />
            <div className="absolute -bottom-2.5 right-1/2 translate-x-1/2">
              <div className="w-5 h-5 bg-white rounded-full border-2 border-dashed border-gray-200" />
            </div>
          </div>
          <div className="h-2.5" />
        </div>
      </motion.div>

      {/* Print Invoice (hidden, shown in print) */}
      <PrintInvoice invoice={invoice} repName={user?.name} />

      {/* Invoice Notes */}
      <InvoiceNotes invoiceId={invoice.id} clientName={invoice.client?.name || 'عميل'} />

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mx-4 flex gap-3 pb-3"
      >
        <Button
          variant="outline"
          onClick={handleShare}
          className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5 ripple-container"
        >
          <Share2 className="w-4 h-4 ml-1.5" />
          مشاركة
        </Button>
        <Button
          variant="outline"
          onClick={handlePrint}
          className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#FF9500] text-[#FF9500] hover:bg-[#FF9500]/5 ripple-container"
        >
          <Printer className="w-4 h-4 ml-1.5" />
          طباعة
        </Button>

      </motion.div>

      {/* Record Payment Button - only if debtAmount > 0 */}
      <AnimatePresence>
        {invoice.debtAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="mx-4 pb-3"
          >
            <Button
              onClick={handleOpenPaymentDialog}
              className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-l from-[#34C759] to-[#30D158] text-white shadow-lg shadow-[#34C759]/25 hover:shadow-xl hover:shadow-[#34C759]/30 transition-all duration-300 ripple-container"
            >
              <CreditCard className="w-5 h-5 ml-2" />
              تسجيل دفعة
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit/Delete Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mx-4 flex gap-3 pb-6"
      >
        <Button
          variant="outline"
          onClick={handleEditRequest}
          className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5 ripple-container"
        >
          <Pencil className="w-4 h-4 ml-1.5" />
          طلب تعديل
        </Button>
        <Button
          variant="outline"
          onClick={handleDeleteRequest}
          className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5 ripple-container"
        >
          <Trash2 className="w-4 h-4 ml-1.5" />
          طلب حذف
        </Button>
      </motion.div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-[#1c1c1e] border-gray-200 dark:border-gray-800 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader className="text-right">
              <DialogTitle className="text-lg font-bold text-[#1c1c1e] dark:text-white flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34C759] to-[#30D158] flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                تسجيل دفعة
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-sm">
                تسجيل دفعة على الفاتورة لعميل {invoice.client?.name || 'غير معروف'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-5">
              {/* Client Name */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                <Label className="text-xs text-gray-400 mb-1 block">العميل</Label>
                <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">{invoice.client?.name || 'غير معروف'}</p>
              </div>

              {/* Outstanding Debt */}
              <div className="bg-[#FF3B30]/5 dark:bg-[#FF3B30]/10 rounded-xl p-3 border border-[#FF3B30]/10">
                <Label className="text-xs text-[#FF3B30] mb-1 block flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  المبلغ المدين المستحق
                </Label>
                <p className="text-lg font-bold text-[#FF3B30] number-mono">{invoice.debtAmount.toLocaleString('ar-SA')} ر.س</p>
              </div>

              {/* Amount Input */}
              <div>
                <Label htmlFor="payment-amount" className="text-sm font-medium text-[#1c1c1e] dark:text-white mb-1.5 block">
                  مبلغ الدفعة
                </Label>
                <div className="relative">
                  <Input
                    id="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min={1}
                    max={invoice.debtAmount}
                    className="h-12 rounded-xl text-lg font-bold text-[#1c1c1e] dark:text-white bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 number-mono pl-16"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">ر.س</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-sm font-medium text-[#1c1c1e] dark:text-white mb-2 block">
                  طريقة الدفع
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'نقدي', label: 'نقدي', icon: <Banknote className="w-4 h-4" /> },
                    { value: 'تحويل', label: 'تحويل', icon: <RefreshCw className="w-4 h-4" /> },
                    { value: 'شيك', label: 'شيك', icon: <Receipt className="w-4 h-4" /> },
                  ].map((method) => (
                    <motion.button
                      key={method.value}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                        paymentMethod === method.value
                          ? 'border-[#34C759] bg-[#34C759]/5 text-[#34C759]'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {method.icon}
                      <span className="text-xs font-semibold">{method.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="payment-notes" className="text-sm font-medium text-[#1c1c1e] dark:text-white mb-1.5 block">
                  ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
                </Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="أضف ملاحظات عن الدفعة..."
                  className="rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 min-h-[70px] resize-none text-sm"
                />
              </div>
            </div>

            <DialogFooter className="mt-5 gap-2">
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                className="flex-1 h-11 rounded-xl font-semibold text-sm border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitPayment}
                disabled={submittingPayment}
                className="flex-1 h-11 rounded-xl font-bold text-sm bg-gradient-to-l from-[#34C759] to-[#30D158] text-white shadow-lg shadow-[#34C759]/25 hover:shadow-xl transition-all"
              >
                {submittingPayment ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 ml-1.5" />
                    تأكيد الدفعة
                  </>
                )}
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
  className,
  icon,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm ${bold ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
          {label}
        </span>
      </div>
      <span
        className={`text-sm ${
          highlight
            ? 'font-bold text-[#34C759] text-base'
            : bold
            ? 'font-bold text-gray-900'
            : className || 'text-gray-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
