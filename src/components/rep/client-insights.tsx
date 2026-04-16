'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  ShoppingCart,
  Banknote,
  Wallet,
  TrendingUp,
  Clock,
  Activity,
  ShieldCheck,
  Receipt,
  Loader2,
} from 'lucide-react';

interface ClientInsightsData {
  totalPurchases: number;
  totalPaid: number;
  outstandingDebt: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
  purchaseFrequency: string;
  paymentReliability: number;
  invoiceCount: number;
  receiptCount: number;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

function formatArabicDate(dateStr: string | null) {
  if (!dateStr) return 'لا يوجد';
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getFrequencyStyle(freq: string) {
  switch (freq) {
    case 'نشط':
      return { color: '#34C759', bg: 'bg-[#34C759]/10', label: 'نشط' };
    case 'منتظم':
      return { color: '#007AFF', bg: 'bg-[#007AFF]/10', label: 'منتظم' };
    default:
      return { color: '#FF3B30', bg: 'bg-[#FF3B30]/10', label: 'غير نشط' };
  }
}

export function ClientInsights({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ClientInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(`/api/client-insights?clientId=${clientId}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [clientId]);

  if (loading) {
    return (
      <div className="mx-4 bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-gray-200 animate-pulse" />
          <div className="h-5 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const freqStyle = getFrequencyStyle(data.purchaseFrequency);

  const insightCards = [
    {
      icon: ShoppingCart,
      label: 'إجمالي المشتريات',
      value: `${data.totalPurchases.toLocaleString('ar-SA')} ر.س`,
      color: '#34C759',
      bg: 'from-[#34C759]/8 to-white',
    },
    {
      icon: Banknote,
      label: 'إجمالي المدفوع',
      value: `${data.totalPaid.toLocaleString('ar-SA')} ر.س`,
      color: '#007AFF',
      bg: 'from-[#007AFF]/8 to-white',
    },
    {
      icon: Wallet,
      label: 'المديونية المستحقة',
      value: `${data.outstandingDebt.toLocaleString('ar-SA')} ر.س`,
      color: data.outstandingDebt > 0 ? '#FF3B30' : '#34C759',
      bg: data.outstandingDebt > 0 ? 'from-[#FF3B30]/8 to-white' : 'from-[#34C759]/8 to-white',
    },
    {
      icon: TrendingUp,
      label: 'متوسط قيمة الطلب',
      value: `${data.averageOrderValue.toLocaleString('ar-SA')} ر.س`,
      color: '#5856D6',
      bg: 'from-[#5856D6]/8 to-white',
    },
    {
      icon: Clock,
      label: 'آخر عملية شراء',
      value: formatArabicDate(data.lastPurchaseDate),
      color: '#FF9500',
      bg: 'from-[#FF9500]/8 to-white',
    },
    {
      icon: ShieldCheck,
      label: 'موثوقية الدفع',
      value: `${data.paymentReliability}%`,
      color: data.paymentReliability >= 80 ? '#34C759' : data.paymentReliability >= 50 ? '#FF9500' : '#FF3B30',
      bg: data.paymentReliability >= 80 ? 'from-[#34C759]/8 to-white' : data.paymentReliability >= 50 ? 'from-[#FF9500]/8 to-white' : 'from-[#FF3B30]/8 to-white',
    },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="mx-4 bg-white rounded-2xl p-5 shadow-sm"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#007AFF]" />
          <h3 className="text-base font-bold">تحليل العميل</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${freqStyle.bg}`} style={{ color: freqStyle.color }}>
            {freqStyle.label}
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            {data.receiptCount} سند
          </span>
        </div>
      </motion.div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {insightCards.map((card, i) => (
          <motion.div
            key={card.label}
            variants={fadeUp}
            className={`bg-gradient-to-br ${card.bg} rounded-xl p-3 border border-gray-100/50 transition-all duration-200 hover:shadow-sm`}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: `${card.color}12` }}
            >
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">{card.label}</p>
            <p className="text-sm font-bold number-mono" style={{ color: card.color }}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Summary footer */}
      <motion.div variants={fadeUp} className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[11px] text-gray-400">
          إجمالي {data.invoiceCount} فاتورة
        </p>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-gray-400" />
          <p className="text-[11px] text-gray-400">
            {data.purchaseFrequency === 'نشط' ? 'عميل نشط جداً' : data.purchaseFrequency === 'منتظم' ? 'عميل منتظم' : 'يحتاج متابعة'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
