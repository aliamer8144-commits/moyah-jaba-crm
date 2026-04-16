'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  PieChart,
  Award,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

function formatCurrency(n: number) {
  return Number(n).toLocaleString('ar-SA');
}

// SVG Progress Ring component
function ProgressRing({ value, size = 80, strokeWidth = 6, color = '#007AFF' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        strokeDasharray={circumference}
      />
    </svg>
  );
}

interface ReportData {
  period: string;
  generatedAt: string;
  revenue: {
    total: number;
    paid: number;
    debt: number;
    avgInvoiceValue: number;
    totalCount: number;
    paidCount: number;
    debtCount: number;
    collectionRate: number;
    byPayment: { paid: number; debt: number };
    byProductSize: Array<{ size: string; revenue: number; count: number }>;
  };
  topReps: Array<{ rank: number; name: string; revenue: number; count: number; debt: number }>;
  clientGrowth: Array<{ week: string; count: number }>;
  newClientCount: number;
  mostActiveClients: Array<{ name: string; invoiceCount: number; totalRevenue: number }>;
}

interface TopClient {
  id: string;
  name: string;
  totalPurchases: number;
  invoiceCount: number;
  paymentReliability: number;
}

export function AdminReports() {
  const { user } = useAppStore();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [topClientsLoading, setTopClientsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-reports?adminId=${user.id}&period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error('حدث خطأ في جلب التقرير');
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const fetchTopClients = useCallback(async () => {
    if (!user) return;
    setTopClientsLoading(true);
    try {
      const [clientsRes, invoicesRes] = await Promise.all([
        fetch(`/api/clients?adminId=${user.id}`),
        fetch(`/api/invoices?adminId=${user.id}`),
      ]);

      if (!clientsRes.ok || !invoicesRes.ok) {
        setTopClientsLoading(false);
        return;
      }

      const clients = await clientsRes.json();
      const invoices = await invoicesRes.json();

      // Build a map of clientId -> { totalPurchases, invoiceCount, paidCount }
      const clientMap = new Map<string, { totalPurchases: number; invoiceCount: number; paidCount: number }>();

      for (const inv of invoices) {
        const existing = clientMap.get(inv.clientId) || { totalPurchases: 0, invoiceCount: 0, paidCount: 0 };
        existing.totalPurchases += inv.finalTotal || 0;
        existing.invoiceCount += 1;
        if (inv.debtAmount <= 0) {
          existing.paidCount += 1;
        }
        clientMap.set(inv.clientId, existing);
      }

      // Build top clients list
      const rankedClients = clients
        .map((client: { id: string; name: string }) => {
          const stats = clientMap.get(client.id);
          return {
            id: client.id,
            name: client.name,
            totalPurchases: stats?.totalPurchases || 0,
            invoiceCount: stats?.invoiceCount || 0,
            paymentReliability: stats && stats.invoiceCount > 0
              ? Math.round((stats.paidCount / stats.invoiceCount) * 100)
              : 0,
          };
        })
        .filter((c: TopClient) => c.invoiceCount > 0)
        .sort((a: TopClient, b: TopClient) => b.totalPurchases - a.totalPurchases)
        .slice(0, 10);

      setTopClients(rankedClients);
    } catch {
      // silent
    } finally {
      setTopClientsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTopClients();
  }, [fetchTopClients]);

  const handleExportCSV = () => {
    if (!data) return;
    const bom = '\uFEFF';
    let csv = bom + 'التقرير المالي - مياه جبأ\n\n';
    csv += `الفترة,${period === 'all' ? 'الكل' : period}\n`;
    csv += `تاريخ الإنشاء,${new Date(data.generatedAt).toLocaleDateString('ar-SA')}\n\n`;
    csv += 'إجمالي الإيرادات,المدفوع,الديون,معدل التحصيل,متوسط الفاتورة,عدد الفواتير\n';
    csv += `${data.revenue.total},${data.revenue.paid},${data.revenue.debt},${data.revenue.collectionRate.toFixed(1)}%,${data.revenue.avgInvoiceValue.toFixed(0)},${data.revenue.totalCount}\n\n`;
    csv += 'المندوب,الإيرادات,عدد الفواتير,الديون\n';
    data.topReps.forEach(r => {
      csv += `${r.name},${r.revenue},${r.count},${r.debt}\n`;
    });
    csv += '\nالعملاء الأكثر نشاطاً\nالعميل,عدد الفواتير,إجمالي الإنفاق\n';
    data.mostActiveClients.forEach(c => {
      csv += `${c.name},${c.invoiceCount},${c.totalRevenue}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_مياه_جبأ_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التقرير بنجاح');
  };

  const handlePrint = () => {
    window.print();
  };

  const periods = [
    { id: '7d' as const, label: '7 أيام' },
    { id: '30d' as const, label: '30 يوم' },
    { id: '90d' as const, label: '90 يوم' },
    { id: 'all' as const, label: 'الكل' },
  ];

  const maxProductSizeRevenue = data?.revenue.byProductSize.reduce((max, p) => Math.max(max, p.revenue), 0) || 1;
  const maxClientInvoices = data?.mostActiveClients[0]?.invoiceCount || 1;

  // Max revenue in client growth for scaling
  const maxGrowth = data?.clientGrowth.reduce((max, g) => Math.max(max, g.count), 0) || 1;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      {/* Header with Period Selector */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#007AFF]" />
            التقارير المتقدمة
          </h2>
          <p className="text-xs text-gray-500 mt-1">تحليل شامل لأداء المبيعات والتحصيل</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export & Print */}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="rounded-xl h-9 gap-1.5 text-xs border-[#34C759] text-[#34C759] hover:bg-[#34C759]/5 print:hidden"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير CSV
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="rounded-xl h-9 gap-1.5 text-xs border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5 print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </Button>
        </div>
      </motion.div>

      {/* Period Selector */}
      <motion.div variants={fadeUp} className="flex gap-2">
        {periods.map((p) => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              period === p.id
                ? 'bg-gradient-to-l from-[#007AFF] to-[#5856D6] text-white shadow-md shadow-[#007AFF]/20'
                : 'bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-400 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            {p.label}
          </motion.button>
        ))}
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm shimmer-loading">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="w-24 h-6 bg-gray-100 rounded animate-pulse" />
              <div className="w-16 h-3 bg-gray-100 rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Section 1: Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-[#007AFF]/10 to-transparent rounded-bl-3xl" />
              <div className="relative flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-sm shadow-[#007AFF]/20">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  إيرادات
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-[#1c1c1e] dark:text-white">{formatCurrency(data.revenue.total)}</p>
              <p className="text-[10px] text-gray-400 mt-1">ر.س</p>
            </motion.div>

            {/* Collection Rate */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-[#34C759]/10 to-transparent rounded-bl-3xl" />
              <div className="relative flex items-center justify-between mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34C759] to-[#28A745] flex items-center justify-center shadow-sm shadow-[#34C759]/20">
                  <Target className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">معدل التحصيل</p>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ProgressRing value={data.revenue.collectionRate} size={56} strokeWidth={5} color="#34C759" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#34C759]">{data.revenue.collectionRate.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">{data.revenue.paidCount}</p>
                  <p className="text-[10px] text-gray-400">مدفوعة من {data.revenue.totalCount}</p>
                </div>
              </div>
            </motion.div>

            {/* Average Invoice Value */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-[#FF9500]/10 to-transparent rounded-bl-3xl" />
              <div className="relative flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9500] to-[#E68A00] flex items-center justify-center shadow-sm shadow-[#FF9500]/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {data.revenue.totalCount} فاتورة
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">متوسط قيمة الفاتورة</p>
              <p className="text-2xl font-bold text-[#1c1c1e] dark:text-white">{formatCurrency(Math.round(data.revenue.avgInvoiceValue))}</p>
              <p className="text-[10px] text-gray-400 mt-1">ر.س</p>
            </motion.div>

            {/* New Clients */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-[#AF52DE]/10 to-transparent rounded-bl-3xl" />
              <div className="relative flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#AF52DE] to-[#9B30D9] flex items-center justify-center shadow-sm shadow-[#AF52DE]/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-[#AF52DE] bg-[#AF52DE]/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  جدد
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">عدد العملاء الجدد</p>
              <p className="text-2xl font-bold text-[#1c1c1e] dark:text-white">{data.newClientCount}</p>
              <p className="text-[10px] text-gray-400 mt-1">عميل خلال هذه الفترة</p>
            </motion.div>
          </div>

          {/* Section 2: Revenue by Product Size */}
          <motion.div
            variants={fadeUp}
            className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FF9500]/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#FF9500]" />
              </div>
              <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">الإيرادات حسب حجم المنتج</h3>
            </div>
            <div className="space-y-4">
              {data.revenue.byProductSize.map((item, index) => {
                const percentage = maxProductSizeRevenue > 0 ? (item.revenue / maxProductSizeRevenue) * 100 : 0;
                const colors = ['from-[#007AFF] to-[#5856D6]', 'from-[#FF9500] to-[#E68A00]', 'from-[#AF52DE] to-[#9B30D9]', 'from-[#34C759] to-[#28A745]'];
                return (
                  <div key={item.size}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[#1c1c1e] dark:text-white">{item.size}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{item.count} فاتورة</span>
                        <span className="text-sm font-bold text-[#1c1c1e] dark:text-white">{formatCurrency(item.revenue)} ر.س</span>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 + 0.2 }}
                        className={`h-full rounded-full bg-gradient-to-l ${colors[index % colors.length]}`}
                      />
                    </div>
                  </div>
                );
              })}
              {data.revenue.byProductSize.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">لا توجد بيانات</p>
              )}
            </div>
          </motion.div>

          {/* Section 3: Top Reps Ranking */}
          <motion.div
            variants={fadeUp}
            className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-[#007AFF]" />
              </div>
              <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">ترتيب المناديب</h3>
            </div>
            <div className="space-y-2">
              {data.topReps.map((rep, index) => (
                <motion.div
                  key={rep.rank}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 + 0.3 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    index === 0 ? 'bg-gradient-to-l from-[#FF9500]/5 to-[#FF9500]/0 border border-[#FF9500]/10' :
                    index === 1 ? 'bg-gradient-to-l from-gray-200/30 to-transparent border border-gray-100' :
                    index === 2 ? 'bg-gradient-to-l from-[#FF9500]/5/20 to-transparent border border-[#FF9500]/5' :
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    index === 0 ? 'bg-gradient-to-br from-[#FF9500] to-[#E68A00] text-white shadow-sm' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' :
                    index === 2 ? 'bg-gradient-to-br from-[#CD7F32] to-[#A0522D] text-white' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {rep.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-[#1c1c1e] dark:text-white truncate">{rep.name}</h4>
                      <span className="text-sm font-bold text-[#007AFF]">{formatCurrency(rep.revenue)} ر.س</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {rep.count} فاتورة
                      </span>
                      {rep.debt > 0 && (
                        <span className="text-[11px] text-[#FF3B30] flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          دين: {formatCurrency(rep.debt)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {data.topReps.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">لا توجد بيانات</p>
              )}
            </div>
          </motion.div>

          {/* Section 4: Client Growth Trend */}
          <motion.div
            variants={fadeUp}
            className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#AF52DE]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#AF52DE]" />
              </div>
              <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">نمو العملاء</h3>
              <span className="text-xs text-gray-400 mr-auto">عملاء جدد أسبوعياً</span>
            </div>
            {data.clientGrowth.length > 0 ? (
              <div className="space-y-3">
                {data.clientGrowth.map((week, index) => {
                  const barHeight = maxGrowth > 0 ? (week.count / maxGrowth) * 100 : 0;
                  return (
                    <div key={week.week} className="flex items-center gap-3">
                      <div className="w-24 text-[11px] text-gray-500 font-medium shrink-0">
                        {new Date(week.week).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="flex-1 flex items-end gap-1">
                        <div className="w-full h-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden flex items-end">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(barHeight, 8)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 + 0.2 }}
                            className="w-full rounded-lg bg-gradient-to-t from-[#AF52DE] to-[#C77DFF] min-h-[4px]"
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#1c1c1e] dark:text-white w-8 text-center">{week.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">لا يوجد نمو خلال هذه الفترة</p>
            )}
          </motion.div>

          {/* Section 5: Payment Distribution (Donut-style) + Most Active Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Method Distribution */}
            <motion.div
              variants={fadeUp}
              className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-[#34C759]" />
                </div>
                <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">توزيع المدفوعات</h3>
              </div>
              <div className="flex items-center justify-center gap-8">
                {/* Simple donut with CSS */}
                <div className="relative">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="16" />
                    {/* Paid portion */}
                    <motion.circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="#34C759" strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={`${(data.revenue.paid / Math.max(data.revenue.total, 1)) * 314} 314`}
                      initial={{ strokeDasharray: '0 314' }}
                      animate={{ strokeDasharray: `${(data.revenue.paid / Math.max(data.revenue.total, 1)) * 314} 314` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                    />
                    {/* Debt portion */}
                    <motion.circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="#FF3B30" strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={`${(data.revenue.debt / Math.max(data.revenue.total, 1)) * 314} 314`}
                      strokeDashoffset={-((data.revenue.paid / Math.max(data.revenue.total, 1)) * 314)}
                      initial={{ strokeDasharray: '0 314', strokeDashoffset: 0 }}
                      animate={{
                        strokeDasharray: `${(data.revenue.debt / Math.max(data.revenue.total, 1)) * 314} 314`,
                        strokeDashoffset: -((data.revenue.paid / Math.max(data.revenue.total, 1)) * 314),
                      }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[#1c1c1e] dark:text-white">{data.revenue.totalCount}</span>
                    <span className="text-[10px] text-gray-400">فاتورة</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#34C759]" />
                    <div>
                      <p className="text-xs text-gray-500">مدفوعة</p>
                      <p className="text-sm font-bold text-[#34C759]">{formatCurrency(data.revenue.paid)} ر.س</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF3B30]" />
                    <div>
                      <p className="text-xs text-gray-500">ديون</p>
                      <p className="text-sm font-bold text-[#FF3B30]">{formatCurrency(data.revenue.debt)} ر.س</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                    <div>
                      <p className="text-xs text-gray-500">الإجمالي</p>
                      <p className="text-sm font-bold text-[#1c1c1e] dark:text-white">{formatCurrency(data.revenue.total)} ر.س</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Most Active Clients */}
            <motion.div
              variants={fadeUp}
              className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#007AFF]" />
                </div>
                <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">العملاء الأكثر نشاطاً</h3>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.mostActiveClients.map((client, index) => (
                  <motion.div
                    key={client.name}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{client.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-[#1c1c1e] dark:text-white truncate">{client.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">{client.invoiceCount} فاتورة</span>
                        <span className="text-[10px] text-gray-300">|</span>
                        <span className="text-[10px] font-medium text-[#007AFF]">{formatCurrency(client.totalRevenue)} ر.س</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {data.mostActiveClients.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">لا توجد بيانات</p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      ) : null}

      {/* Section 6: Top Clients Ranking */}
      <motion.div
        variants={fadeUp}
        className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100/50 dark:border-gray-800"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#FF9500]/10 flex items-center justify-center">
            <Award className="w-4 h-4 text-[#FF9500]" />
          </div>
          <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">أفضل العملاء</h3>
          <span className="text-xs text-gray-400 mr-auto">حسب إجمالي المشتريات</span>
        </div>

        {topClientsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-2 w-48 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : topClients.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">لا توجد بيانات عن العملاء</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topClients.map((client, index) => {
              const maxPurchase = topClients[0]?.totalPurchases || 1;
              const percentage = Math.round((client.totalPurchases / maxPurchase) * 100);
              const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

              const reliabilityColor = client.paymentReliability >= 80
                ? 'text-[#34C759] bg-[#34C759]/10'
                : client.paymentReliability >= 50
                  ? 'text-[#FF9500] bg-[#FF9500]/10'
                  : 'text-[#FF3B30] bg-[#FF3B30]/10';

              const reliabilityLabel = client.paymentReliability >= 80
                ? 'ممتاز'
                : client.paymentReliability >= 50
                  ? 'جيد'
                  : 'ضعيف';

              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 + 0.2 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    index === 0
                      ? 'bg-gradient-to-l from-[#FFD700]/10 to-transparent border border-[#FFD700]/20'
                      : index === 1
                        ? 'bg-gradient-to-l from-gray-100/50 to-transparent border border-gray-100 dark:from-gray-800/50 dark:border-gray-800'
                        : index === 2
                          ? 'bg-gradient-to-l from-[#CD7F32]/10 to-transparent border border-[#CD7F32]/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    index === 0
                      ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white shadow-sm shadow-[#FFD700]/30'
                      : index === 1
                        ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                        : index === 2
                          ? 'bg-gradient-to-br from-[#CD7F32] to-[#A0522D] text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {medalEmoji || (index + 1)}
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-[#1c1c1e] dark:text-white truncate">
                        {client.name}
                      </h4>
                      <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-md ${reliabilityColor}`}>
                        {reliabilityLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 + 0.4 }}
                          className={`h-full rounded-full ${
                            index === 0
                              ? 'bg-gradient-to-l from-[#FFD700] to-[#FF9500]'
                              : index === 1
                                ? 'bg-gradient-to-l from-gray-400 to-gray-500'
                                : index === 2
                                  ? 'bg-gradient-to-l from-[#CD7F32] to-[#A0522D]'
                                  : 'bg-gradient-to-l from-[#007AFF] to-[#5856D6]'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <FileText className="w-3 h-3" />
                        {client.invoiceCount} فاتورة
                      </span>
                      <span className="text-[10px] text-gray-300">|</span>
                      <span className="text-[10px] text-gray-400">
                        موثوقية: {client.paymentReliability}%
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold text-[#1c1c1e] dark:text-white">{formatCurrency(client.totalPurchases)}</p>
                    <p className="text-[10px] text-gray-400">ر.س</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
