'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { TrendingUp, TrendingDown, DollarSign, FileText, Users, Wallet, CalendarDays } from 'lucide-react';

interface DailyData {
  date: string;
  label: string;
  revenue: number;
  invoices: number;
  clients: number;
  collected: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

export function WeeklySummary() {
  const { user, invoices } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/invoices?repId=${user.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setAllInvoices(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const { thisWeek, lastWeek, dailyRevenue } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get start of this week (Sunday)
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    // Get start of last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const endOfLastWeek = new Date(thisWeekStart);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);

    // Process daily data for this week
    const dailyData: DailyData[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(thisWeekStart);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayInvoices = allInvoices.filter((inv) => {
        const invDate = new Date(inv.createdAt);
        return invDate >= dayStart && invDate < dayEnd;
      });

      const revenue = dayInvoices.reduce((sum, inv) => sum + inv.finalTotal, 0);
      const uniqueClients = new Set(dayInvoices.map((inv) => inv.clientId)).size;
      const collected = dayInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

      dailyData.push({
        date: dayStart.toISOString(),
        label: arabicDays[i],
        revenue,
        invoices: dayInvoices.length,
        clients: uniqueClients,
        collected,
      });
    }

    // This week totals
    const thisWeekInvoices = allInvoices.filter((inv) => {
      const invDate = new Date(inv.createdAt);
      return invDate >= thisWeekStart && invDate < now;
    });

    const thisWeekRevenue = thisWeekInvoices.reduce((sum, inv) => sum + inv.finalTotal, 0);
    const thisWeekInvoiceCount = thisWeekInvoices.length;
    const thisWeekClients = new Set(thisWeekInvoices.map((inv) => inv.clientId)).size;
    const thisWeekCollected = thisWeekInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    // Last week totals
    const lastWeekInvoices = allInvoices.filter((inv) => {
      const invDate = new Date(inv.createdAt);
      return invDate >= lastWeekStart && invDate < endOfLastWeek;
    });

    const lastWeekRevenue = lastWeekInvoices.reduce((sum, inv) => sum + inv.finalTotal, 0);
    const lastWeekInvoiceCount = lastWeekInvoices.length;
    const lastWeekClients = new Set(lastWeekInvoices.map((inv) => inv.clientId)).size;
    const lastWeekCollected = lastWeekInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    return {
      thisWeek: {
        revenue: thisWeekRevenue,
        invoices: thisWeekInvoiceCount,
        clients: thisWeekClients,
        collected: thisWeekCollected,
      },
      lastWeek: {
        revenue: lastWeekRevenue,
        invoices: lastWeekInvoiceCount,
        clients: lastWeekClients,
        collected: lastWeekCollected,
      },
      dailyRevenue: dailyData,
    };
  }, [allInvoices]);

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1);

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800 card-hover-lift glass-card-enhanced">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-[#AF52DE]" />
        <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">ملخص الأسبوع</h3>
      </div>

      {/* 4 Mini Stats */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <MiniStatRow
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="الإيرادات"
          value={thisWeek.revenue.toLocaleString('ar-SA')}
          unit="ر.س"
          color="#34C759"
          change={getPercentChange(thisWeek.revenue, lastWeek.revenue)}
          delay={0}
        />
        <MiniStatRow
          icon={<FileText className="w-3.5 h-3.5" />}
          label="الفواتير"
          value={String(thisWeek.invoices)}
          unit="فاتورة"
          color="#007AFF"
          change={getPercentChange(thisWeek.invoices, lastWeek.invoices)}
          delay={0.08}
        />
        <MiniStatRow
          icon={<Users className="w-3.5 h-3.5" />}
          label="العملاء"
          value={String(thisWeek.clients)}
          unit="عميل"
          color="#AF52DE"
          change={getPercentChange(thisWeek.clients, lastWeek.clients)}
          delay={0.16}
        />
        <MiniStatRow
          icon={<Wallet className="w-3.5 h-3.5" />}
          label="المحصل"
          value={thisWeek.collected.toLocaleString('ar-SA')}
          unit="ر.س"
          color="#FF9500"
          change={getPercentChange(thisWeek.collected, lastWeek.collected)}
          delay={0.24}
        />
      </div>

      {/* Mini Bar Chart - Daily Revenue */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <p className="text-xs text-gray-400 mb-2.5 font-medium">الإيرادات اليومية</p>
        <div className="flex items-end gap-1.5 h-20">
          {dailyRevenue.map((day, i) => {
            const barHeight = maxRevenue > 0 ? Math.max((day.revenue / maxRevenue) * 100, 4) : 4;
            const isToday = i === new Date().getDay();
            return (
              <motion.div
                key={day.label}
                className="flex-1 flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeight}%` }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                  className={`w-full rounded-md min-h-[4px] ${
                    isToday
                      ? 'bg-gradient-to-t from-[#AF52DE] to-[#BF5AF2] shadow-sm shadow-[#AF52DE]/30'
                      : day.revenue > 0
                      ? 'bg-gradient-to-t from-[#007AFF]/30 to-[#007AFF]/60'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  style={isToday ? { boxShadow: '0 2px 8px rgba(175, 82, 222, 0.3)' } : {}}
                />
                <span className={`text-[9px] ${isToday ? 'font-bold text-[#AF52DE]' : 'text-gray-400'}`}>
                  {day.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStatRow({
  icon,
  label,
  value,
  unit,
  color,
  change,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
  change: number;
  delay: number;
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 touch-feedback"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[11px] text-gray-400">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-[#1c1c1e] dark:text-white number-mono">{value}</span>
          <span className="text-[10px] text-gray-400 mr-1">{unit}</span>
        </div>
        {!isNeutral && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
