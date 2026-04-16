'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, Clock, Receipt, Banknote, ArrowLeftRight, FileCheck, Wallet, Hash } from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';

interface ReceiptItem {
  id: string;
  receiptNo: string;
  amount: number;
  method: string;
  notes: string | null;
  createdAt: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'الآن';
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
  return `منذ ${Math.floor(diffDays / 30)} شهر`;
}

function getMethodIcon(method: string) {
  switch (method) {
    case 'تحويل':
      return ArrowLeftRight;
    case 'شيك':
      return FileCheck;
    default:
      return Banknote;
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export function ReceiptList({ clientId }: { clientId: string }) {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/receipts?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [clientId]);

  // Summary stats
  const totalCollected = useMemo(
    () => receipts.reduce((sum, r) => sum + r.amount, 0),
    [receipts]
  );
  const transactionCount = receipts.length;
  const lastTransactionTime = useMemo(() => {
    if (receipts.length === 0) return null;
    return getRelativeTime(receipts[0].createdAt);
  }, [receipts]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {/* Skeleton for summary header */}
        <div className="h-20 bg-gray-100 dark:bg-gray-800/50 rounded-2xl shimmer-skeleton" />
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800/50 rounded-xl shimmer-skeleton" />
        ))}
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        variants={fadeUp}
        className="py-8 text-center text-gray-400"
      >
        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">لا توجد سندات قبض</p>
      </motion.div>
    );
  }

  const summaryStats = [
    {
      label: 'إجمالي المحصل',
      value: `${totalCollected.toLocaleString('ar-SA')} ر.س`,
      icon: Wallet,
      gradient: 'from-[#34C759]/10 to-[#34C759]/5',
      iconBg: 'bg-[#34C759]/15',
      iconColor: 'text-[#34C759]',
      valueColor: 'text-[#34C759]',
      border: 'border-[#34C759]/15',
      darkGradient: 'dark:from-[#34C759]/5 dark:to-[#34C759]/0',
    },
    {
      label: 'عدد العمليات',
      value: String(transactionCount),
      icon: Hash,
      gradient: 'from-[#007AFF]/10 to-[#007AFF]/5',
      iconBg: 'bg-[#007AFF]/15',
      iconColor: 'text-[#007AFF]',
      valueColor: 'text-[#007AFF]',
      border: 'border-[#007AFF]/15',
      darkGradient: 'dark:from-[#007AFF]/5 dark:to-[#007AFF]/0',
    },
    {
      label: 'آخر عملية',
      value: lastTransactionTime || '---',
      icon: Clock,
      gradient: 'from-[#FF9500]/10 to-[#FF9500]/5',
      iconBg: 'bg-[#FF9500]/15',
      iconColor: 'text-[#FF9500]',
      valueColor: 'text-[#FF9500]',
      border: 'border-[#FF9500]/15',
      darkGradient: 'dark:from-[#FF9500]/5 dark:to-[#FF9500]/0',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Summary Stats Header - Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-3 bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-100/80 dark:border-gray-700/40 shadow-sm"
      >
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-2"
        >
          {summaryStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                variants={{
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                className={`rounded-xl p-2.5 bg-gradient-to-b ${stat.gradient} ${stat.darkGradient} border ${stat.border} text-center`}
              >
                <div className={`w-7 h-7 rounded-lg ${stat.iconBg} flex items-center justify-center mx-auto mb-1.5`}>
                  <Icon className={`w-3.5 h-3.5 ${stat.iconColor}`} />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{stat.label}</p>
                <p className={`text-xs font-bold number-mono ${stat.valueColor}`}>{stat.value}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Receipt List */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
        {receipts.map((receipt, index) => {
          const MethodIcon = getMethodIcon(receipt.method);
          return (
            <motion.div
              key={receipt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="px-4 py-3.5 flex items-center justify-between card-hover-lift touch-feedback transition-all duration-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#34C759]/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4.5 h-4.5 text-[#34C759]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium dark:text-gray-200">{receipt.receiptNo}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md">
                      <MethodIcon className="w-3 h-3" />
                      {receipt.method}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDate(receipt.createdAt)}
                  </div>
                  {receipt.notes && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">
                      {receipt.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="text-sm font-bold text-[#34C759] number-mono">
                  +{receipt.amount.toLocaleString('ar-SA')}
                </p>
                <p className="text-[11px] text-gray-400"><SarIcon size={10} /></p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
