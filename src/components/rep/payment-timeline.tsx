'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  FileText,
  Banknote,
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

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
  runningBalance: number;
}

function getMethodColor(method: string) {
  switch (method) {
    case 'نقدي':
      return { bg: 'bg-[#34C759]/10', text: 'text-[#34C759]', border: 'border-[#34C759]/30' };
    case 'تحويل':
      return { bg: 'bg-[#007AFF]/10', text: 'text-[#007AFF]', border: 'border-[#007AFF]/30' };
    case 'شيك':
      return { bg: 'bg-[#AF52DE]/10', text: 'text-[#AF52DE]', border: 'border-[#AF52DE]/30' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return {
        label: 'مدفوعة',
        bg: 'bg-[#34C759]/10',
        text: 'text-[#34C759]',
        icon: <CheckCircle className="w-3 h-3" />,
      };
    case 'overdue':
      return {
        label: 'متأخرة',
        bg: 'bg-[#FF3B30]/10',
        text: 'text-[#FF3B30]',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    case 'pending':
      return {
        label: 'مديون',
        bg: 'bg-[#FF9500]/10',
        text: 'text-[#FF9500]',
        icon: <Clock className="w-3 h-3" />,
      };
    default:
      return {
        label: 'مكتمل',
        bg: 'bg-[#34C759]/10',
        text: 'text-[#34C759]',
        icon: <CheckCircle className="w-3 h-3" />,
      };
  }
}

function SkeletonTimeline() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-3/4" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaymentTimeline({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`/api/payment-timeline?clientId=${clientId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [clientId]);

  if (loading) {
    return (
      <div className="mx-4 bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-[#007AFF]" />
          <h3 className="text-base font-bold">الجدول الزمني للمدفوعات</h3>
        </div>
        <SkeletonTimeline />
      </div>
    );
  }

  return (
    <div className="mx-4 bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-[#007AFF]" />
        <h3 className="text-base font-bold">الجدول الزمني للمدفوعات</h3>
        {items.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full mr-auto">
            {items.length} عملية
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ArrowLeftRight className="w-7 h-7 text-gray-300 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-400">لا توجد عمليات مالية بعد</p>
        </div>
      ) : (
        <div className="px-4 pb-4">
          {/* Summary bar */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <Wallet className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">الرصيد الحالي:</span>
            <span
              className={`text-sm font-bold number-mono ${
                items.length > 0 && items[0].runningBalance > 0
                  ? 'text-[#FF3B30]'
                  : items.length > 0 && items[0].runningBalance < 0
                  ? 'text-[#34C759]'
                  : 'text-gray-500'
              }`}
            >
              {items.length > 0
                ? `${Math.abs(items[0].runningBalance).toLocaleString('ar-SA')} ر.س ${
                    items[0].runningBalance > 0 ? '(مدين)' : items[0].runningBalance < 0 ? '(دائن)' : ''
                  }`
                : '0 ر.س'}
            </span>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute right-[15px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="space-y-1">
              {items.map((item, index) => {
                const isPayment = item.type === 'payment';
                const statusBadge = !isPayment ? getStatusBadge(item.status) : null;
                const methodColor = isPayment && item.method ? getMethodColor(item.method) : null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: isPayment ? -15 : 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
                    className="relative flex gap-3 py-2"
                  >
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          isPayment
                            ? 'bg-[#34C759]/10 border-[#34C759]/30'
                            : item.status === 'overdue'
                            ? 'bg-[#FF3B30]/10 border-[#FF3B30]/30'
                            : item.status === 'paid'
                            ? 'bg-[#34C759]/10 border-[#34C759]/30'
                            : 'bg-[#FF9500]/10 border-[#FF9500]/30'
                        }`}
                      >
                        {isPayment ? (
                          <Wallet className="w-3.5 h-3.5 text-[#34C759]" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#FF9500]" />
                        )}
                      </div>
                    </div>

                    {/* Content card */}
                    <div
                      className={`flex-1 rounded-xl p-3 border transition-colors ${
                        isPayment
                          ? 'bg-[#34C759]/5 dark:bg-[#34C759]/5 border-[#34C759]/10'
                          : item.status === 'overdue'
                          ? 'bg-[#FF3B30]/5 dark:bg-[#FF3B30]/5 border-[#FF3B30]/10'
                          : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isPayment ? 'text-[#34C759]' : item.status === 'overdue' ? 'text-[#FF3B30]' : 'text-[#FF9500]'
                            }`}
                          >
                            {isPayment ? 'دفعة مستلمة' : 'فاتورة جديدة'}
                          </span>
                          {methodColor && item.method && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${methodColor.bg} ${methodColor.text}`}>
                              {item.method}
                            </span>
                          )}
                          {statusBadge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5 ${statusBadge.bg} ${statusBadge.text}`}>
                              {statusBadge.icon}
                              {statusBadge.label}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">{item.relativeTime}</span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold number-mono ${isPayment ? 'text-[#34C759]' : 'text-gray-800 dark:text-white'}`}>
                          {isPayment ? '+' : ''}
                          {item.amount.toLocaleString('ar-SA')} ر.س
                        </span>
                        <span className={`text-[11px] number-mono ${
                          item.runningBalance > 0 ? 'text-[#FF3B30]' : item.runningBalance < 0 ? 'text-[#34C759]' : 'text-gray-400'
                        }`}>
                          الرصيد: {Math.abs(item.runningBalance).toLocaleString('ar-SA')} ر.س
                        </span>
                      </div>

                      {/* Invoice details */}
                      {!isPayment && item.invoiceDetails && (
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                          <span>{item.invoiceDetails.quantity} كرتون × {item.invoiceDetails.productSize}</span>
                          {item.invoiceDetails.debtAmount > 0 && (
                            <span className="text-[#FF3B30]">دين: {item.invoiceDetails.debtAmount.toLocaleString('ar-SA')}</span>
                          )}
                        </div>
                      )}

                      {/* Payment method details */}
                      {isPayment && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
                          {item.method === 'نقدي' && <Banknote className="w-3 h-3" />}
                          <span>دفعة نقدية</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
