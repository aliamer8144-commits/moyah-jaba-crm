'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wallet, Banknote, ArrowLeftRight, FileCheck, Loader2, Printer } from 'lucide-react';

interface ReceiptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const paymentMethods = [
  { value: 'نقدي', label: 'نقدي', icon: Banknote },
  { value: 'تحويل', label: 'تحويل', icon: ArrowLeftRight },
  { value: 'شيك', label: 'شيك', icon: FileCheck },
];

interface LastReceipt {
  receiptNo: string;
  amount: number;
  method: string;
  notes: string | undefined;
  clientName: string;
  repName: string;
  createdAt: string;
}

export function ReceiptForm({ open, onOpenChange, onSuccess }: ReceiptFormProps) {
  const { user, selectedClientId, clients, setClients } = useAppStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('نقدي');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<LastReceipt | null>(null);

  const client = clients.find((c) => c.id === selectedClientId);

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('نقدي');
      setNotes('');
      setSubmitting(false);
      setLastReceipt(null);
    }
  }, [open]);

  const parsedAmount = parseFloat(amount) || 0;
  const currentBalance = client?.walletBalance ?? 0;
  const newBalance = currentBalance + parsedAmount;

  const handleSubmit = async () => {
    if (!user || !selectedClientId || parsedAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          clientId: selectedClientId,
          amount: parsedAmount,
          method,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'حدث خطأ');
      }

      const receipt = await res.json();

      toast.success(`تم تسجيل الدفعة بنجاح - ${receipt.receiptNo}`, {
        description: `المبلغ: ${parsedAmount.toLocaleString('ar-SA')} ر.س`,
      });

      setLastReceipt({
        receiptNo: receipt.receiptNo,
        amount: parsedAmount,
        method,
        notes: notes.trim() || undefined,
        clientName: client?.name || 'عميل',
        repName: user.name,
        createdAt: new Date().toISOString(),
      });

      // Refresh client data in store
      const updatedClients = clients.map((c) =>
        c.id === selectedClientId
          ? { ...c, walletBalance: newBalance }
          : c
      );
      setClients(updatedClients);

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'حدث خطأ في تسجيل الدفعة';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!lastReceipt) return;
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) return;
    const notesRow = lastReceipt.notes
      ? `<tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">ملاحظات</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">${lastReceipt.notes}</td></tr>`
      : '';
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سند قبض - ${lastReceipt.receiptNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; padding: 20px; color: #1a1a1a; background: #fff; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding: 24px 0 16px; border-bottom: 3px solid #34C759; margin-bottom: 24px; }
    .header h1 { font-size: 26px; color: #34C759; font-weight: 700; margin-bottom: 4px; }
    .header p { color: #666; font-size: 14px; }
    .receipt-info { display: flex; justify-content: space-between; margin-bottom: 24px; padding: 12px 16px; background: #f9fafb; border-radius: 12px; }
    .receipt-info div { font-size: 13px; color: #666; }
    .receipt-info strong { color: #333; }
    .amount-section { text-align: center; margin: 32px 0; padding: 24px; background: #f0fdf4; border-radius: 16px; border: 2px solid #34C759; }
    .amount-label { font-size: 16px; color: #666; margin-bottom: 8px; }
    .amount-value { font-size: 42px; font-weight: 700; color: #34C759; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; }
    td { padding: 10px 12px; border:1px solid #e5e7eb; }
    td:first-child { font-weight: 600; background: #f9fafb; width: 40%; }
    .signatures { display: flex; justify-content: space-between; margin-top: 48px; padding: 0 20px; }
    .sig-line { text-align: center; }
    .sig-line .line { width: 150px; border-bottom: 2px solid #333; margin-bottom: 8px; }
    .sig-line .label { font-size: 13px; color: #666; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 2px solid #e5e7eb; color: #888; font-size: 13px; }
    @media print { body { padding: 10px; } .no-print { display: none; } }
    .print-btn { text-align: center; margin-bottom: 16px; }
    .print-btn button { background: #34C759; color: white; border: none; padding: 10px 32px; border-radius: 12px; font-family: 'Cairo', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; }
    .print-btn button:hover { background: #2DA44E; }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-btn no-print">
      <button onclick="window.print()">طباعة السند</button>
    </div>
    <div class="header">
      <h1>مياه جبأ</h1>
      <p>سند قبض</p>
    </div>
    <div class="receipt-info">
      <div><strong>رقم السند:</strong> ${lastReceipt.receiptNo}</div>
      <div><strong>التاريخ:</strong> ${new Date(lastReceipt.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
    <div class="amount-section">
      <p class="amount-label">المبلغ المقبوض</p>
      <p class="amount-value">${lastReceipt.amount.toLocaleString('ar-SA')} <span style="font-size:20px;">ر.س</span></p>
    </div>
    <table>
      <tr><td>اسم المندوب</td><td>${lastReceipt.repName}</td></tr>
      <tr><td>اسم العميل</td><td>${lastReceipt.clientName}</td></tr>
      <tr><td>طريقة الدفع</td><td>${lastReceipt.method}</td></tr>
      ${notesRow}
    </table>
    <div class="signatures">
      <div class="sig-line"><div class="line"></div><div class="label">المندوب</div></div>
      <div class="sig-line"><div class="line"></div><div class="label">العميل</div></div>
    </div>
    <div class="footer">
      <p>شكراً لتعاملكم معنا - مياه جبأ</p>
    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <>
    {lastReceipt && !open && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="pointer-events-auto bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3 max-w-md mx-auto"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm">تم إنشاء السند {lastReceipt.receiptNo}</p>
            <p className="text-xs text-gray-500">المبلغ: {lastReceipt.amount.toLocaleString('ar-SA')} ر.س</p>
          </div>
          <Button
            onClick={handlePrintReceipt}
            size="sm"
            className="h-9 rounded-xl bg-[#34C759] text-white hover:bg-[#34C759]/90 font-semibold text-sm gap-1.5 shrink-0"
          >
            <Printer className="w-4 h-4" />
            طباعة السند
          </Button>
          <button
            onClick={() => setLastReceipt(null)}
            className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </motion.div>
      </motion.div>
    )}
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        {/* Gradient Header */}
        <div className="bg-gradient-to-bl from-[#34C759] to-[#30D158] rounded-t-2xl px-6 pt-6 pb-8">
          <DrawerHeader className="px-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <DrawerTitle className="text-white text-lg">سند قبض</DrawerTitle>
                <DrawerDescription className="text-white/80 text-sm">
                  {client?.name || 'العميل'}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
        </div>

        <div className="px-6 pb-6 space-y-5 -mt-3">
          {/* Amount Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm -mt-4"
          >
            <label className="text-sm font-semibold text-gray-700 mb-3 block">المبلغ (ر.س)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                dir="ltr"
                className="w-full text-3xl font-bold text-center py-3 bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-[#34C759] focus:ring-0 focus:outline-none transition-colors text-[#1c1c1e] placeholder:text-gray-300"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">
                ر.س
              </span>
            </div>
          </motion.div>

          {/* Payment Method */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <label className="text-sm font-semibold text-gray-700 mb-3 block">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => setMethod(pm.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                    method === pm.value
                      ? 'border-[#34C759] bg-[#34C759]/5 text-[#34C759]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <pm.icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{pm.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <label className="text-sm font-semibold text-gray-700 mb-3 block">ملاحظات (اختياري)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظة..."
              rows={2}
              className="resize-none rounded-xl border-gray-200 focus:border-[#34C759] focus:ring-0"
            />
          </motion.div>

          {/* Balance Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gray-50 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">الرصيد الحالي</span>
              <span className={`text-sm font-bold ${currentBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                {currentBalance.toLocaleString('ar-SA')} ر.س
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">المبلغ المدفوع</span>
              <span className="text-sm font-bold text-[#34C759]">
                +{parsedAmount.toLocaleString('ar-SA')} ر.س
              </span>
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">الرصيد بعد الدفع</span>
              <span className={`text-base font-bold ${newBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                {newBalance.toLocaleString('ar-SA')} ر.س
              </span>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={submitting || parsedAmount <= 0}
              className="w-full h-13 rounded-2xl bg-gradient-to-bl from-[#34C759] to-[#30D158] text-white font-bold text-base shadow-lg shadow-[#34C759]/25 hover:shadow-xl hover:shadow-[#34C759]/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جارٍ التسجيل...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5 ml-2" />
                  تسجيل الدفعة
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </DrawerContent>
    </Drawer>
    </>
  );
}
