'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Wallet,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};
const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

function formatCurrency(n: number) {
  return n.toLocaleString('ar-SA');
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

export function RepPerformance({ repId, repName, onBack }: { repId: string; repName: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, invoicesRes, receiptsRes] = await Promise.all([
        fetch(`/api/clients?repId=${repId}`),
        fetch(`/api/invoices?repId=${repId}`),
        fetch(`/api/receipts?repId=${repId}`),
      ]);

      if (clientsRes.ok) setClients(await clientsRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (receiptsRes.ok) setReceipts(await receiptsRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [repId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed stats
  const totalClients = clients.length;
  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((s: number, i: any) => s + i.finalTotal, 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + i.paidAmount, 0);
  const totalDebt = invoices.reduce((s: number, i: any) => s + i.debtAmount, 0);
  const totalReceipts = receipts.reduce((s: number, r: any) => s + r.amount, 0);
  const collectionRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : '0';

  // Top 5 clients by total purchases
  const clientTotals = invoices.reduce((acc: Record<string, number>, inv: any) => {
    acc[inv.clientId] = (acc[inv.clientId] || 0) + inv.finalTotal;
    return acc;
  }, {});
  const topClients = Object.entries(clientTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([clientId, total]) => {
      const client = clients.find((c: any) => c.id === clientId);
      return { client, total };
    });

  // Recent 10 invoices
  const recentInvoices = [...invoices]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Revenue trend - last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const dailyRevenue: Record<string, number> = {};
  invoices
    .filter((inv: any) => new Date(inv.createdAt) >= thirtyDaysAgo)
    .forEach((inv: any) => {
      const dateKey = new Date(inv.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + inv.finalTotal;
    });
  const chartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue }));
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        <p className="text-sm text-gray-500 mt-3">جارٍ تحميل بيانات الأداء...</p>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-[#1c1c1e]" />
        </button>
        <div>
          <h2 className="text-lg font-bold">تفاصيل الأداء</h2>
          <p className="text-sm text-gray-500">{repName}</p>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="العملاء" value={String(totalClients)} color="#007AFF" />
        <StatCard icon={FileText} label="الفواتير" value={String(totalInvoices)} color="#34C759" />
        <StatCard icon={DollarSign} label="الإيرادات" value={formatCurrency(totalRevenue)} color="#FF9500" />
        <StatCard icon={TrendingUp} label="المدفوع" value={formatCurrency(totalPaid)} color="#34C759" />
        <StatCard icon={Wallet} label="الديون" value={formatCurrency(totalDebt)} color="#FF3B30" />
        <StatCard icon={Receipt} label="السندات" value={formatCurrency(totalReceipts)} color="#AF52DE" />
      </motion.div>

      {/* Collection Rate */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-sm font-bold">نسبة التحصيل</p>
              <p className="text-xs text-gray-500">المدفوع من الإجمالي</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold text-[#007AFF]">{collectionRate}%</p>
            <p className="text-[11px] text-gray-400">{formatCurrency(totalPaid)} / {formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="mt-3 w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-gradient-to-l from-[#007AFF] to-[#5856D6] h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(parseFloat(collectionRate), 100)}%` }}
          />
        </div>
      </motion.div>

      {/* Revenue Trend Chart */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#FF9500]" />
          <h3 className="text-base font-bold">اتجاه الإيرادات (30 يوم)</h3>
        </div>
        {chartData.length > 0 ? (
          <div className="flex items-end gap-1 h-32">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.03 }}
                  className="w-full rounded-t-md bg-gradient-to-t from-[#007AFF] to-[#5856D6] min-h-[4px] relative group cursor-pointer"
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1c1c1e] text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {formatCurrency(item.revenue)}
                  </div>
                </motion.div>
                {chartData.length <= 10 && (
                  <span className="text-[8px] text-gray-400 truncate max-w-full">{item.date}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <BarChart3 className="w-8 h-8 opacity-30" />
            <p className="text-sm mt-2">لا توجد بيانات في آخر 30 يوم</p>
          </div>
        )}
      </motion.div>

      {/* Top Clients */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight className="w-4 h-4 text-[#34C759]" />
          <h3 className="text-base font-bold">أفضل العملاء</h3>
        </div>
        {topClients.length > 0 ? (
          <div className="space-y-2">
            {topClients.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{item.client?.name?.charAt(0) || '?'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.client?.name || 'غير معروف'}</p>
                    <p className="text-[11px] text-gray-400">{item.client?.businessName || ''}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#007AFF] flex items-center gap-0.5">{formatCurrency(item.total)} <SarIcon size={14} className="text-[#007AFF]" /></p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">لا توجد بيانات</div>
        )}
      </motion.div>

      {/* Recent Invoices */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#007AFF]" />
          <h3 className="text-base font-bold">أحدث الفواتير</h3>
        </div>
        {recentInvoices.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentInvoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    inv.debtAmount > 0 ? 'bg-[#FF3B30]/10' : 'bg-[#34C759]/10'
                  }`}>
                    {inv.debtAmount > 0 ? (
                      <XCircle className="w-4 h-4 text-[#FF3B30]" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-[#34C759]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.client?.name || 'عميل'}</p>
                    <p className="text-[11px] text-gray-400">{formatDate(inv.createdAt)}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{formatCurrency(inv.finalTotal)}</p>
                  {inv.debtAmount > 0 && (
                    <p className="text-[10px] text-[#FF3B30]">دين: {formatCurrency(inv.debtAmount)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">لا توجد فواتير</div>
        )}
      </motion.div>

      {/* Payment Collection Summary */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-[#34C759]" />
          <h3 className="text-base font-bold">ملخص التحصيل</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#34C759]/5 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">إجمالي السندات</p>
            <p className="text-lg font-bold text-[#34C759]">{formatCurrency(totalReceipts)}</p>
            <p className="text-[11px] text-gray-400">{receipts.length} سند</p>
          </div>
          <div className="bg-[#007AFF]/5 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">إجمالي التحصيل</p>
            <p className="text-lg font-bold text-[#007AFF]">{formatCurrency(totalPaid)}</p>
            <p className="text-[11px] text-gray-400">{collectionRate}% نسبة</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
      <div
        className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
