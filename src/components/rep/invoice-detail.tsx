'use client';

import { useState, useRef, useCallback } from 'react';
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
  Droplets,
  Calendar,
  Hash,
  Receipt,
  Gift,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Pencil,
  Trash2,
  Printer,
  Banknote,
  RefreshCw,
  Tag,
  User,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

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

export function InvoiceDetail({
  invoice,
  onBack,
  onRefresh,
}: {
  invoice: Invoice;
  onBack: () => void;
  onRefresh?: () => void;
}) {
  // Pull to refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartY = useRef(0);
  const pullContainerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 70;
  const {
    user,
    setRequestDialogOpen,
    setRequestEntityType,
    setRequestActionType,
    setRequestEntityId,
    setInvoices,
  } = useAppStore();

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const hasDiscount = invoice.discountType !== 'none' && invoice.discountValue > 0;
  const hasPromotion = invoice.promotionQty > 0;

  // Calculate discount percentage for display (discountValue is the actual amount, not the raw percentage)
  const discountPercent = invoice.total > 0
    ? Math.round((invoice.discountValue / invoice.total) * 100)
    : 0;

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

  const handlePrint = () => {
    window.print();
  };

  const handlePullRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
    }, 800);
  }, [onRefresh]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollTop = pullContainerRef.current?.scrollTop || 0;
    if (scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const diff = Math.max(0, e.touches[0].clientY - pullStartY.current);
    setPullDistance(Math.min(diff * 0.4, 100));
    e.stopPropagation();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      handlePullRefresh();
    } else {
      setPullDistance(0);
    }
    e.stopPropagation();
  };

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

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
        const invRes = await fetch(`/api/invoices?invoiceId=${invoice.id}`);
        if (invRes.ok) {
          const updatedInv = await invRes.json();
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
    <div
      ref={pullContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Pull indicator */}
      <div className="overflow-hidden">
        <motion.div
          className="flex justify-center items-center"
          style={{ height: pullDistance }}
        >
          {isRefreshing ? (
            <div className="w-7 h-7 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-[#007AFF] animate-spin" />
            </div>
          ) : (
            <div
              className="w-7 h-7 rounded-full bg-[#007AFF]/10 flex items-center justify-center"
              style={{ opacity: pullProgress, transform: `scale(${0.5 + pullProgress * 0.5})` }}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#007AFF]" style={{ transform: `rotate(${180 * pullProgress}deg)` }} />
            </div>
          )}
        </motion.div>
      </div>

    <motion.div
      animate={{ y: isRefreshing ? PULL_THRESHOLD : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.div initial="initial" animate="animate" variants={fadeUp} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowRight className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">تفاصيل الفاتورة</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handlePrint} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Printer className="w-4.5 h-4.5 text-gray-600 dark:text-gray-300" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuItem onClick={handleEditRequest} className="gap-2.5 py-2.5 cursor-pointer rounded-lg">
                <Pencil className="w-4 h-4 text-[#007AFF]" />
                <span className="text-sm">طلب تعديل</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteRequest} className="gap-2.5 py-2.5 cursor-pointer rounded-lg text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/10">
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">طلب حذف</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Record Payment Button - Small, before invoice */}
      <AnimatePresence>
        {invoice.debtAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.3 }}
            className="mx-4"
          >
            <Button
              onClick={handleOpenPaymentDialog}
              size="sm"
              className="w-full h-9 rounded-xl font-semibold text-xs bg-gradient-to-l from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              <CreditCard className="w-3.5 h-3.5 ml-1.5" />
              تسجيل دفعة ({formatCurrency(invoice.debtAmount)} ر.س)
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Document */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="screen-invoice mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        {/* Invoice Header - Brand */}
        <div className="bg-gradient-to-l from-[#007AFF] to-[#0055D4] px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-wide">مياه جبأ</h3>
                <p className="text-[11px] text-white/70 mt-0.5">فاتورة بيع</p>
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs">
                <Hash className="w-3.5 h-3.5" />
                <span className="font-mono font-bold">{invoice.id.slice(-6).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client & Date Info */}
        <div className="px-5 pt-4 pb-3 space-y-3">
          {/* Date Row */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(invoice.createdAt)}</span>
          </div>

          {/* Client Name */}
          <div>
            <p className="text-[10px] text-gray-400 font-medium mb-0.5">العميل</p>
            <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              {invoice.client?.name || 'عميل'}
            </p>
            {invoice.client?.businessName && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {invoice.client.businessName}
              </p>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="mx-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Items Table */}
        <div className="mx-5 my-3">
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_auto_auto] bg-gray-50 dark:bg-gray-800/80 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              <div className="px-3 py-2.5 text-center">المنتج</div>
              <div className="px-4 py-2.5 text-center border-r border-gray-200 dark:border-gray-700">الكمية</div>
              <div className="px-4 py-2.5 text-center border-r border-gray-200 dark:border-gray-700">السعر</div>
            </div>
            {/* Data Row */}
            <div className="grid grid-cols-[1fr_auto_auto]">
              <div className="px-3 py-3 flex items-center justify-center gap-2 border-b border-gray-50 dark:border-gray-800">
                <Droplets className="w-4 h-4 text-[#007AFF] shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-white">مياه جبأ</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-center text-sm font-semibold text-gray-800 dark:text-white border-b border-gray-50 dark:border-gray-800 border-r border-gray-100 dark:border-gray-800">
                {invoice.quantity}
              </div>
              <div className="px-4 py-3 flex items-center justify-center text-sm text-gray-800 dark:text-white border-b border-gray-50 dark:border-gray-800 border-r border-gray-100 dark:border-gray-800">
                {formatCurrency(invoice.price)} <span className="text-[10px] text-gray-400 mr-0.5">ر.س</span>
              </div>
            </div>
            {/* Promotion Row */}
            {hasPromotion && (
              <div className="grid grid-cols-[1fr_auto] bg-amber-50/50 dark:bg-amber-900/10">
                <div className="px-3 py-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 border-r border-gray-100 dark:border-gray-800">
                  <Gift className="w-3.5 h-3.5" />
                  <span>دعاية ({invoice.promotionQty} كرتون مجاني)</span>
                </div>
                <div className="px-4 py-2 flex items-center justify-center text-xs text-amber-600 dark:text-amber-400 font-bold">
                  مجاني
                </div>
              </div>
            )}
            {/* Total Row */}
            <div className="grid grid-cols-[1fr_auto] bg-gray-50/80 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-3 flex items-center justify-end text-sm font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-100 dark:border-gray-800">
                المجموع
              </div>
              <div className="px-4 py-3 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white">
                {formatCurrency(invoice.total)} <span className="text-[10px] font-normal text-gray-400 mr-0.5">ر.س</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="mx-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Discount & Final Total */}
        <div className="mx-5 my-3 space-y-2">
          {hasDiscount && (
            <>
              {/* Discount Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <Tag className="w-3 h-3 text-red-500" />
                  </div>
                  <span className="text-sm text-red-500 font-medium">
                    الخصم
                    {invoice.discountType === 'percentage' && (
                      <span className="text-xs mr-1">({discountPercent}%)</span>
                    )}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-500">
                  -{formatCurrency(invoice.discountValue)} ر.س
                </span>
              </div>
              {/* Final Total - same size as discount, no separators */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">الإجمالي النهائي</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(invoice.finalTotal)} ر.س
                </span>
              </div>
            </>
          )}

          {!hasDiscount && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">الإجمالي النهائي</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {formatCurrency(invoice.finalTotal)} ر.س
              </span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="mx-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Paid Amount - Prominent */}
        <div className="mx-5 my-3">
          <div className="bg-gradient-to-l from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/15 dark:to-emerald-600/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">المدفوع</span>
              </div>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(invoice.paidAmount)} <span className="text-xs font-normal text-gray-400">ر.س</span>
              </span>
            </div>
          </div>
        </div>

        {/* Debt / Credit */}
        {(invoice.debtAmount > 0 || invoice.creditAmount > 0) && (
          <div className="mx-5 space-y-2">
            {invoice.debtAmount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs text-gray-400">المبلغ المدين</span>
                </div>
                <span className="text-sm font-bold text-red-500">
                  {formatCurrency(invoice.debtAmount)} ر.س
                </span>
              </div>
            )}

            {invoice.creditAmount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-gray-400">رصيد إضافي</span>
                </div>
                <span className="text-sm font-bold text-blue-500">
                  +{formatCurrency(invoice.creditAmount)} ر.س
                </span>
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="mx-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Footer: Rep Name */}
        <div className="mx-5 py-3">
          {user && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">المندوب:</span>
              <span>{user.name}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Print Invoice (hidden, shown in print) */}
      <PrintInvoice invoice={invoice} repName={user?.name} />

      {/* Invoice Notes */}
      <InvoiceNotes invoiceId={invoice.id} clientName={invoice.client?.name || 'عميل'} />

      {/* Bottom spacer */}
      <div className="pb-4" />
      </motion.div>
      </motion.div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 overflow-hidden">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <Label className="text-xs text-gray-400 mb-1 block">العميل</Label>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{invoice.client?.name || 'غير معروف'}</p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 border border-red-100 dark:border-red-900/30">
              <Label className="text-xs text-red-500 mb-1 block flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                المبلغ المدين المستحق
              </Label>
              <p className="text-lg font-bold text-red-500">{formatCurrency(invoice.debtAmount)} ر.س</p>
            </div>

            <div>
              <Label htmlFor="payment-amount" className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
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
                  className="h-12 rounded-xl text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pl-16"
                  dir="ltr"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">ر.س</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">طريقة الدفع</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'نقدي', label: 'نقدي', icon: <Banknote className="w-4 h-4" /> },
                  { value: 'تحويل', label: 'تحويل', icon: <RefreshCw className="w-4 h-4" /> },
                  { value: 'شيك', label: 'شيك', icon: <Receipt className="w-4 h-4" /> },
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      paymentMethod === method.value
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {method.icon}
                    <span className="text-xs font-semibold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="payment-notes" className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
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
              className="flex-1 h-11 rounded-xl font-bold text-sm bg-gradient-to-l from-[#34C759] to-[#30D158] text-white shadow-lg shadow-[#34C759]/25"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
