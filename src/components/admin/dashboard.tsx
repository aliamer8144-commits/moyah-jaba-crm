'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Users,
  UserCheck,
  UserCircle,
  FileText,
  DollarSign,
  ClipboardList,
  TrendingUp,
  Clock,
  ArrowLeft,
  BarChart3,
  Package,
  CreditCard,
  CalendarDays,
  AlertTriangle,
  Eye,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  FilePlus,
  ScrollText,
  Zap,
  PlusCircle,
  Trash2,
  RefreshCw,
  ChevronDown,
  Activity,
  UserPlus2,
  Banknote,
  Percent,
  Sun,
  Moon,
  Shield,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SarIcon } from '@/components/shared/sar-icon';
import { Button } from '@/components/ui/button';
import { RepLeaderboard } from '@/components/admin/rep-leaderboard';
import { InvoiceAging } from '@/components/admin/invoice-aging';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface DashboardStats {
  totalReps: number;
  activeReps: number;
  totalClients: number;
  totalInvoices: number;
  pendingRequests: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  todayInvoices: number;
  todayRevenue: number;
}

interface ChartData {
  dailyInvoices: { date: string; total: number; count: number }[];
  monthlyRevenue: { month: string; total: number }[];
  topClients: { clientId: string; clientName: string; total: number; invoiceCount: number }[];
  repStats: Array<{
    id: string; name: string; isActive: boolean; clientCount: number;
    invoiceCount: number; totalRevenue: number; totalPaid: number; totalDebt: number;
  }>;
  paymentMethods: { method: string; count: number; total: number }[];
  inventoryStatus: { id: string; name: string; allocatedInventory: number }[];
}

interface ActivityItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  rep?: { id: string; name: string };
}

const CHART_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA'];

// Sparkline SVG component
function MiniSparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = height;
  const padding = 2;
  const step = (w - padding * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = padding + i * step;
    const y = h - padding - ((v - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1 opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Get activity type and styling
function getActivityMeta(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('حذف') || lower.includes('delete')) return { icon: Trash2, color: '#FF3B30', gradient: 'from-[#FF3B30] to-[#FF453A]', borderColor: 'border-r-[#FF3B30]' };
   if (lower.includes('تحديث') || lower.includes('تعديل') || lower.includes('update') || lower.includes('edit')) return { icon: RefreshCw, color: '#FF9500', gradient: 'from-[#FF9500] to-[#FF9F0A]', borderColor: 'border-r-[#FF9500]' };
  if (lower.includes('دفع') || lower.includes('payment') || lower.includes('قبض') || lower.includes('receipt')) return { icon: CreditCard, color: '#34C759', gradient: 'from-[#34C759] to-[#30D158]', borderColor: 'border-r-[#34C759]' };
  return { icon: PlusCircle, color: '#007AFF', gradient: 'from-[#007AFF] to-[#5856D6]', borderColor: 'border-r-[#007AFF]' };
}

function formatArabicDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

function getTodayArabicDate() {
  return new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{displayValue.toLocaleString('ar-SA')}</>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-gray-100 p-3 min-w-[140px]">
        <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
            {entry.name === 'total' ? 'الإيرادات' : entry.name === 'count' ? 'العدد' : entry.name}: {entry.value.toLocaleString('ar-SA')} {entry.name === 'total' ? 'ر.س' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { user, setAdminTab } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [topDebtors, setTopDebtors] = useState<Array<{
    clientId: string;
    clientName: string;
    repName: string;
    totalDebt: number;
    lastInvoiceDate: string;
  }>>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [allInvoicesData, setAllInvoicesData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'fresh' | 'stale' | 'lost'>('fresh');

  const refreshData = useCallback(async (showLoading = false) => {
    if (!user) return;
    if (showLoading) setIsRefreshing(true);
    try {
      const [statsRes, chartRes, activityRes, invRes, expRes] = await Promise.all([
        fetch(`/api/reps?adminId=${user.id}`),
        fetch(`/api/stats?adminId=${user.id}&period=${chartPeriod}`),
        fetch(`/api/activity?adminId=${user.id}&limit=10`),
        fetch(`/api/invoices?adminId=${user.id}`),
        fetch(`/api/expenses?adminId=${user.id}`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data.logs || []);
      }
      // Fetch top indebted clients
      if (invRes.ok) {
        const allInvoices = await invRes.json();
        const debtInvoices = allInvoices.filter((inv: any) => inv.debtAmount > 0);
        const clientDebtMap = new Map<string, { clientName: string; repName: string; totalDebt: number; lastDate: string }>();
        for (const inv of debtInvoices) {
          const existing = clientDebtMap.get(inv.clientId);
          if (existing) {
            existing.totalDebt += inv.debtAmount;
            if (inv.createdAt > existing.lastDate) existing.lastDate = inv.createdAt;
          } else {
            clientDebtMap.set(inv.clientId, {
              clientName: inv.client?.name || 'غير معروف',
              repName: inv.rep?.name || 'غير معروف',
              totalDebt: inv.debtAmount,
              lastDate: inv.createdAt,
            });
          }
        }
        const sorted = Array.from(clientDebtMap.entries())
          .map(([clientId, data]) => ({ clientId, ...data }))
          .sort((a, b) => b.totalDebt - a.totalDebt)
          .slice(0, 5);
        setTopDebtors(sorted);
        // Store all invoices for trend calculations
        setAllInvoicesData(allInvoices);
      }
      // Fetch total expenses
      if (expRes.ok) {
        const allExpenses = await expRes.json();
        const sum = (allExpenses as Array<{ amount: number }>).reduce((s: number, e: { amount: number }) => s + e.amount, 0);
        setTotalExpenses(sum);
      }
      setLastRefreshed(new Date());
      setConnectionStatus('fresh');
    } catch {
      setConnectionStatus('lost');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, chartPeriod]);

  // Initial fetch
  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Check if tab is visible
      if (document.visibilityState === 'visible') {
        refreshData(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Connection status monitoring + tick for time display
  const [, setRefreshTick] = useState(0);
  useEffect(() => {
    const statusInterval = setInterval(() => {
      const elapsed = (Date.now() - lastRefreshed.getTime()) / 1000;
      if (elapsed < 30) {
        setConnectionStatus('fresh');
      } else if (elapsed < 60) {
        setConnectionStatus('stale');
      } else {
        setConnectionStatus('lost');
      }
      setRefreshTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(statusInterval);
  }, [lastRefreshed]);

  // Pause auto-refresh when tab is not visible, resume when visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshData]);

  const handleManualRefresh = () => {
    refreshData(true);
  };

  // Format last refreshed time
  const formatLastRefreshed = () => {
    const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
    if (diff < 5) return 'الآن';
    if (diff < 60) return `منذ ${diff} ثانية`;
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    return `منذ ${Math.floor(diff / 3600)} ساعة`;
  };

  const statCards = stats
    ? [
        { label: 'إجمالي المناديب', value: stats.totalReps, icon: UserCircle, color: '#007AFF', gradient: 'from-[#007AFF]/10 to-[#5856D6]/5' },
        { label: 'المناديب النشطون', value: stats.activeReps, icon: UserCheck, color: '#34C759', gradient: 'from-[#34C759]/10 to-[#30D158]/5' },
        { label: 'إجمالي العملاء', value: stats.totalClients, icon: Users, color: '#AF52DE', gradient: 'from-[#AF52DE]/10 to-[#BF5AF2]/5' },
        { label: 'إجمالي الفواتير', value: stats.totalInvoices, icon: FileText, color: '#FF9500', gradient: 'from-[#FF9500]/10 to-[#FF9F0A]/5' },
        { label: 'إجمالي الإيرادات', value: stats.totalRevenue, icon: DollarSign, color: '#34C759', format: true, gradient: 'from-[#34C759]/10 to-[#30D158]/5' },
        { label: 'الطلبات المعلقة', value: stats.pendingRequests, icon: ClipboardList, color: '#FF3B30', clickable: true, gradient: 'from-[#FF3B30]/10 to-[#FF453A]/5' },
      ]
    : [];

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  }

  const dailyChartData = (chartData?.dailyInvoices || []).map((d) => ({
    ...d,
    date: d?.date ? formatArabicDate(String(d.date)) : '',
    total: d?.total || 0,
    count: d?.count || 0,
  }));

  const monthlyChartData = (chartData?.monthlyRevenue || []).map((d) => {
    if (!d?.month) return { month: '', total: 0 };
    const parts = String(d.month).split('-');
    const y = parts[0] || '';
    const m = parts[1] || '1';
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return { month: `${monthNames[parseInt(m) - 1]} ${y}`, total: d.total || 0 };
  });

  const repBarData = (chartData?.repStats || []).map((r) => ({
    name: r.name,
    إيرادات: r.totalRevenue,
    مدفوع: r.totalPaid,
    ديون: Math.abs(r.totalDebt),
  }));

  const methodPieData = (chartData?.paymentMethods || []).map((p) => ({
    name: p.method,
    value: p.count,
    total: p.total,
  }));

  const inventoryData = (chartData?.inventoryStatus || []).map((r) => ({
    name: r.name,
    مخزون: r.allocatedInventory,
  }));

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      {/* Greeting Card with Gradient Mesh Background */}
      <motion.div variants={fadeUp}>
        <div className="gradient-mesh-blue rounded-2xl p-5 text-white shadow-lg shadow-[#007AFF]/20 relative overflow-hidden">
          {/* Decorative mesh overlays */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/3 rounded-full blur-2xl" />
          <div className="absolute top-3 right-3 w-3 h-3 bg-white/20 rounded-full animate-badge-pulse" />
          <div className="absolute top-3 right-10 w-2 h-2 bg-white/15 rounded-full animate-badge-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-4 left-4 w-20 h-20 border border-white/10 rounded-full" />
          <div className="absolute bottom-6 left-6 w-12 h-12 border border-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FFD60A]" />
                <p className="text-sm opacity-80">{(() => {
                  const hour = new Date().getHours();
                  return hour < 12 ? 'صباح الخير،' : 'مساء الخير،';
                })()}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] opacity-60">{getTodayArabicDate()}</p>
                {(() => {
                  const hour = new Date().getHours();
                  const isMorning = hour < 12;
                  return isMorning
                    ? <Sun className="w-4 h-4 text-[#FFD60A]" />
                    : <Moon className="w-4 h-4 text-[#FFD60A]" />;
                })()}
              </div>
            </div>
            <h2 className="text-2xl font-bold mt-1 drop-shadow-sm">{user?.name || 'المدير'}</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs opacity-70 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <motion.div
                  animate={{ scale: connectionStatus === 'lost' ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: connectionStatus === 'lost' ? Infinity : 0 }}
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'fresh' ? 'bg-[#34C759]' :
                    connectionStatus === 'stale' ? 'bg-[#FF9500]' :
                    'bg-[#FF3B30]'
                  }`}
                />
                <span>{formatLastRefreshed()}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-xs opacity-70 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <motion.span
                  animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                  transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.span>
                <span>تحديث</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : statCards.map((card) => (
              <motion.div
                key={card.label}
                variants={fadeUp}
                onClick={card.clickable ? () => setAdminTab('requests') : undefined}
                whileTap={card.clickable ? { scale: 0.97 } : undefined}
                className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-700/30 transition-all duration-300 animate-card-gradient ${
                  card.clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center animate-gradient-bg"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <card.icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  {card.clickable && (
                    <ArrowLeft className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <p className="text-2xl font-bold text-[#1c1c1e] dark:text-white">
                  {!loading ? (
                    card.format ? (
                      <AnimatedNumber value={card.value || 0} />
                    ) : (
                      <AnimatedNumber value={card.value} />
                    )
                  ) : (
                    '...'
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
              </motion.div>
            ))}
      </div>

      {/* Quick Actions Panel */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#FF9500]" />
          <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white">إجراءات سريعة</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'إضافة مندوب', icon: UserPlus, tab: 'reps' as const, gradient: 'from-[#007AFF] to-[#0055D4]', shadow: 'shadow-[#007AFF]/20' },
            { label: 'إنشاء فاتورة', icon: FilePlus, tab: 'invoices' as const, gradient: 'from-[#34C759] to-[#28A745]', shadow: 'shadow-[#34C759]/20' },
            { label: 'عرض التقارير', icon: BarChart3, tab: 'reports' as const, gradient: 'from-[#AF52DE] to-[#9B30D9]', shadow: 'shadow-[#AF52DE]/20' },
            { label: 'إدارة المنتجات', icon: Package, tab: 'products' as const, gradient: 'from-[#FF9500] to-[#E68A00]', shadow: 'shadow-[#FF9500]/20' },
            { label: 'طلبات معلقة', icon: ClipboardList, tab: 'requests' as const, gradient: 'from-[#FF3B30] to-[#D70015]', shadow: 'shadow-[#FF3B30]/20', badge: stats?.pendingRequests || 0 },
            { label: 'سجل النشاطات', icon: ScrollText, tab: 'activity' as const, gradient: 'from-[#5856D6] to-[#4A48C5]', shadow: 'shadow-[#5856D6]/20' },
          ].map((action, i) => (
            <motion.button
              key={action.tab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{ y: -3, boxShadow: `0 12px 28px ${action.shadow}` }}
              whileTap={{ scale: 0.93 }}
              onClick={() => setAdminTab(action.tab)}
              className={`relative bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-lg transition-all duration-300 ${action.shadow}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <action.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold leading-tight text-center">{action.label}</span>
              {action.badge && action.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-badge-pulse">
                  {action.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Rep Performance Leaderboard */}
      <RepLeaderboard />

      {/* Today Stats Banner */}
      {stats && (
        <motion.div variants={fadeUp}>
          <div className="bg-gradient-to-l from-[#007AFF] to-[#0055D4] rounded-2xl p-5 text-white shadow-lg shadow-[#007AFF]/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
            <h3 className="text-sm font-medium opacity-80 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              إحصائيات اليوم
            </h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-2xl font-bold"><AnimatedNumber value={stats.todayInvoices} duration={800} /></p>
                <p className="text-xs opacity-70">فاتورة اليوم</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-2xl font-bold"><AnimatedNumber value={stats.todayRevenue} duration={800} /></p>
                <p className="text-xs opacity-70">إيرادات اليوم (<SarIcon size={12} className="opacity-70" />)</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Performance Trends */}
      {stats && !loading && (() => {
        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 86400000);
        const prevWeekStart = new Date(weekStart.getTime() - 7 * 86400000);

        // This week data
        const weekInvoices = allInvoicesData.filter((inv: any) => new Date(inv.createdAt) >= weekStart);
        const weekRevenue = weekInvoices.reduce((s: number, inv: any) => s + (inv.finalTotal || 0), 0);
        const weekPaid = weekInvoices.reduce((s: number, inv: any) => s + (inv.paidAmount || 0), 0);
        const weekCount = weekInvoices.length;

        // Prev week data
        const prevWeekInvoices = allInvoicesData.filter((inv: any) => {
          const d = new Date(inv.createdAt);
          return d >= prevWeekStart && d < weekStart;
        });
        const prevRevenue = prevWeekInvoices.reduce((s: number, inv: any) => s + (inv.finalTotal || 0), 0);
        const prevWeekClients = new Set(prevWeekInvoices.map((inv: any) => inv.clientId)).size;

        // Week clients
        const weekClients = new Set(weekInvoices.map((inv: any) => inv.clientId)).size;

        // Revenue change
        const revenueChange = prevRevenue > 0 ? Math.round(((weekRevenue - prevRevenue) / prevRevenue) * 100) : (weekRevenue > 0 ? 100 : 0);

        // Client change
        const clientChange = prevWeekClients > 0 ? Math.round(((weekClients - prevWeekClients) / prevWeekClients) * 100) : (weekClients > 0 ? 100 : 0);

        // Collection rate
        const collectionRate = weekRevenue > 0 ? Math.round((weekPaid / weekRevenue) * 100) : 0;

        const trends = [
          { label: 'إيرادات الأسبوع', value: weekRevenue.toLocaleString('ar-SA'), change: revenueChange, icon: DollarSign, color: '#34C759', bgColor: 'from-[#34C759]/5 to-white dark:to-gray-900' },
          { label: 'عملاء جدد', value: weekClients.toString(), change: clientChange, icon: UserPlus2, color: '#007AFF', bgColor: 'from-[#007AFF]/5 to-white dark:to-gray-900' },
          { label: 'فواتير الأسبوع', value: weekCount.toString(), change: prevWeekInvoices.length > 0 ? Math.round(((weekCount - prevWeekInvoices.length) / prevWeekInvoices.length) * 100) : (weekCount > 0 ? 100 : 0), icon: FileText, color: '#FF9500', bgColor: 'from-[#FF9500]/5 to-white dark:to-gray-900' },
          { label: 'نسبة التحصيل', value: `${collectionRate}%`, change: 0, icon: Banknote, color: '#AF52DE', bgColor: 'from-[#AF52DE]/5 to-white dark:to-gray-900', noChange: true },
        ];

        return (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-[#007AFF]" />
              <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white">اتجاهات الأداء</h3>
              <span className="text-[10px] bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-full font-medium mr-auto">
                هذا الأسبوع
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trends.map((trend, i) => {
                const isPositive = trend.change >= 0;
                return (
                  <motion.div
                    key={trend.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
                    className={`bg-gradient-to-br ${trend.bgColor} rounded-2xl p-3.5 shadow-sm border border-gray-100/50 dark:border-gray-700/30 card-hover-effect`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${trend.color}12` }}>
                        <trend.icon className="w-4 h-4" style={{ color: trend.color }} />
                      </div>
                      {!trend.noChange && trend.change !== 0 && (
                        <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isPositive ? 'text-[#34C759] bg-[#34C759]/10' : 'text-[#FF3B30] bg-[#FF3B30]/10'}`}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(trend.change)}%
                        </div>
                      )}
                    </div>
                    <p className="text-lg font-bold text-[#1c1c1e] dark:text-white">{trend.value}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{trend.label}</p>
                    {/* Mini sparkline placeholder */}
                    {i < 3 && (
                      <div className="mt-1.5 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Math.abs(trend.change) * 2 + 20, 100)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: trend.color, opacity: 0.3 }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* Financial Summary with Net Profit + Sparklines */}
      {stats && (() => {
        const netProfit = stats.totalRevenue - totalExpenses;
        const isProfit = netProfit >= 0;
        const profitMargin = stats.totalRevenue > 0 ? Math.round((netProfit / stats.totalRevenue) * 100) : 0;
        // Sparkline data: last 7 daily revenue points
        const sparkRevenue = dailyChartData.slice(-7).map(d => d.total || 0);
        // Simulate paid/debt trends from daily data (use scaled proportions)
        const sparkPaid = sparkRevenue.map(v => Math.round(v * (stats.totalPaid / (stats.totalRevenue || 1))));
        const sparkDebt = sparkRevenue.map(v => Math.round(v * (stats.totalDebt / (stats.totalRevenue || 1))));
        return (
          <>
            <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-gradient-to-br from-[#34C759]/5 to-white dark:to-gray-900 rounded-2xl p-4 shadow-sm text-center card-hover-effect">
                <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-4 h-4 text-[#34C759]" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">الإيرادات</p>
                <p className="text-base font-bold text-[#34C759]"><AnimatedNumber value={stats.totalRevenue} duration={1200} /></p>
                <MiniSparkline data={sparkRevenue} color="#34C759" />
              </div>
              <div className="bg-gradient-to-br from-[#007AFF]/5 to-white dark:to-gray-900 rounded-2xl p-4 shadow-sm text-center card-hover-effect">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="w-4 h-4 text-[#007AFF]" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">المدفوع</p>
                <p className="text-base font-bold text-[#007AFF]"><AnimatedNumber value={stats.totalPaid} duration={1200} /></p>
                <MiniSparkline data={sparkPaid} color="#007AFF" />
              </div>
              <div className="bg-gradient-to-br from-[#FF3B30]/5 to-white dark:to-gray-900 rounded-2xl p-4 shadow-sm text-center card-hover-effect">
                <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-2">
                  <ClipboardList className="w-4 h-4 text-[#FF3B30]" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">الديون</p>
                <p className="text-base font-bold text-[#FF3B30]"><AnimatedNumber value={stats.totalDebt} duration={1200} /></p>
                <MiniSparkline data={sparkDebt} color="#FF3B30" />
              </div>
              <div className="bg-gradient-to-br from-[#FF9500]/5 to-white dark:to-gray-900 rounded-2xl p-4 shadow-sm text-center card-hover-effect">
                <div className="w-8 h-8 rounded-lg bg-[#FF9500]/10 flex items-center justify-center mx-auto mb-2">
                  <TrendingDown className="w-4 h-4 text-[#FF9500]" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">المصروفات</p>
                <p className="text-base font-bold text-[#FF9500]"><AnimatedNumber value={totalExpenses} duration={1200} /></p>
              </div>
              {/* Net Profit Card */}
              <div className={`bg-gradient-to-br ${isProfit ? 'from-[#34C759]/8 to-[#34C759]/3' : 'from-[#FF3B30]/8 to-[#FF3B30]/3'} rounded-2xl p-4 shadow-sm text-center card-hover-effect border ${isProfit ? 'border-[#34C759]/20' : 'border-[#FF3B30]/20'} col-span-2 lg:col-span-1`}>
                <div className={`w-8 h-8 rounded-lg ${isProfit ? 'bg-[#34C759]/10' : 'bg-[#FF3B30]/10'} flex items-center justify-center mx-auto mb-2 animate-percent-pulse`}>
                  {isProfit ? (
                    <ArrowUpRight className={`w-4 h-4 text-[#34C759]`} />
                  ) : (
                    <ArrowDownRight className={`w-4 h-4 text-[#FF3B30]`} />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">صافي الربح</p>
                <p className={`text-base font-bold ${isProfit ? 'text-[#34C759] text-shadow-glow-green' : 'text-[#FF3B30]'}`}>
                  <AnimatedNumber value={netProfit} duration={1200} />
                </p>
                <p className={`text-[10px] mt-0.5 font-medium ${isProfit ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                  {isProfit ? '↑' : '↓'} هامش {profitMargin}%
                </p>
              </div>
            </motion.div>
          </>
        );
      })()}

      {/* Debt Overview - Glassmorphism Card */}
      {topDebtors.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-[#FF3B30]/20 via-[#FF9500]/20 to-[#AF52DE]/20">
            <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                  نظرة على الديون
                </h3>
                <button
                  onClick={() => setAdminTab('invoices')}
                  className="flex items-center gap-1 text-xs text-[#007AFF] font-medium hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  عرض الكل
                </button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {topDebtors.map((debtor, i) => (
                  <motion.div
                    key={debtor.clientId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF3B30] to-[#FF453A] flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-[#FF3B30]/20 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white truncate">{debtor.clientName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />
                            <span className="truncate">{debtor.repName}</span>
                          </p>
                        </div>
                        {/* Progress bar for debtor */}
                        <div className="debt-progress-bar mt-1.5">
                          <motion.div
                            className="debt-progress-fill bg-gradient-to-l from-[#FF3B30] to-[#FF6259]"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((debtor.totalDebt / (topDebtors[0]?.totalDebt || 1)) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0 mr-3">
                      <p className="text-sm font-bold text-[#FF3B30] flex items-center gap-0.5">
                        <AnimatedNumber value={debtor.totalDebt} duration={800} /> <SarIcon size={14} className="text-[#FF3B30]" />
                      </p>
                      <p className="text-[10px] text-gray-400">{formatTime(debtor.lastInvoiceDate)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-gradient-to-l from-[#FF3B30]/5 to-transparent border-t border-gray-100 dark:border-gray-800">
                <p className="text-[11px] text-gray-500 text-center">
                  إجمالي ديون أعلى {topDebtors.length} عملاء:{' '}
                  <span className="font-bold text-[#FF3B30]">
                    {topDebtors.reduce((sum, d) => sum + d.totalDebt, 0).toLocaleString('ar-SA')} <SarIcon size={14} className="text-[#FF3B30]" />
                  </span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Invoice Aging Report */}
      <InvoiceAging />

      {/* Revenue Chart with Gradient Background */}
      <motion.div variants={fadeUp}>
        <div className="bg-white dark:bg-gray-800/30 rounded-2xl shadow-sm p-4 md:p-5 chart-bg-gradient chart-container-enhanced">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#007AFF]" />
              الإيرادات اليومية
            </h3>
            <div className="flex gap-1 bg-[#f2f2f7] dark:bg-gray-800 rounded-xl p-0.5">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                    chartPeriod === p ? 'bg-white dark:bg-gray-700 text-[#007AFF] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {p === '7d' ? '7 أيام' : p === '30d' ? '30 يوم' : '90 يوم'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56 md:h-64">
            {loading ? (
              <div className="h-full w-full rounded-xl flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="water-spinner mx-auto">
                    <div className="droplet" />
                    <div className="droplet" />
                    <div className="droplet" />
                  </div>
                  <p className="text-xs text-gray-400">جارٍ تحميل البيانات...</p>
                </div>
              </div>
            ) : dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#007AFF" strokeWidth={2.5} fill="url(#revenueGradient)" name="total" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد بيانات</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Two-column charts: Rep Performance + Payment Methods */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rep Performance */}
        <div className="bg-white dark:bg-gray-800/30 rounded-2xl shadow-sm p-4 md:p-5 chart-bg-gradient chart-container-enhanced">
          <h3 className="text-base font-bold flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4 text-[#34C759]" />
            أداء المناديب
          </h3>
          <div className="h-56">
            {loading ? (
              <div className="h-full w-full rounded-xl flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#34C759]/30 border-t-[#34C759] rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-400">جارٍ تحميل البيانات...</p>
                </div>
              </div>
            ) : repBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repBarData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="إيرادات" fill="#007AFF" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="مدفوع" fill="#34C759" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>
            )}
          </div>
        </div>

        {/* Payment Methods + Inventory */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800/30 rounded-2xl shadow-sm p-4 md:p-5 chart-bg-gradient chart-container-enhanced">
            <h3 className="text-base font-bold flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-[#AF52DE]" />
              طرق الدفع
            </h3>
            <div className="h-40">
              {loading ? (
                <div className="h-full w-full rounded-xl flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-[#AF52DE]/30 border-t-[#AF52DE] rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-gray-400">جارٍ تحميل البيانات...</p>
                  </div>
                </div>
              ) : methodPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={methodPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3} stroke="none">
                      {methodPieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value: string) => value} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>
              )}
            </div>
          </div>

          {/* Inventory Status */}
          <div className="bg-white dark:bg-gray-800/30 rounded-2xl shadow-sm p-4 md:p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-[#FF9500]" />
              حالة المخزون
            </h3>
            {loading ? (
              <div className="h-20 w-full rounded-xl flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-[#FF9500]/30 border-t-[#FF9500] rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-400">جارٍ التحميل...</p>
                </div>
              </div>
            ) : inventoryData.length > 0 ? (
              <div className="space-y-2">
                {inventoryData.slice(0, 4).map((r) => {
                  const maxInv = Math.max(...inventoryData.map((i) => i.مخزون), 1);
                  const pct = Math.min((r.مخزون / maxInv) * 100, 100);
                  const isLow = r.مخزون < 50;
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate font-medium">{r.name}</span>
                      <div className="flex-1 h-2 bg-[#f2f2f7] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${isLow ? 'bg-[#FF3B30]' : 'bg-[#007AFF]'}`}
                        />
                      </div>
                      <span className={`text-xs font-bold w-10 text-left ${isLow ? 'text-[#FF3B30]' : 'text-gray-600 dark:text-gray-400'}`}>
                        {r.مخزون}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-400 text-sm">لا يوجد مناديب</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Top Clients */}
      {chartData?.topClients && chartData.topClients.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF9500]" />
                أكبر العملاء
              </h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {chartData.topClients.map((c, i) => (
                <div key={c.clientId} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9500] to-[#E68A00] flex items-center justify-center text-white text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.clientName}</p>
                      <p className="text-[11px] text-gray-500">{c.invoiceCount} فاتورة</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#1c1c1e] dark:text-white flex items-center gap-0.5"><AnimatedNumber value={c.total} duration={800} /> <SarIcon size={14} /></p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Recent Activity Feed */}
      <motion.div variants={fadeUp}>
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#007AFF]" />
              آخر النشاطات
            </h3>
            {recentActivity.length > 0 && (
              <button
                onClick={() => setAdminTab('activity')}
                className="flex items-center gap-1 text-xs text-[#007AFF] font-medium hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                عرض الكل
              </button>
            )}
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد نشاطات بعد</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {recentActivity.slice(0, showAllActivity ? undefined : 5).map((item, i) => {
                  const meta = getActivityMeta(item.action);
                  const ActivityIcon = meta.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-r-[3px] ${meta.borderColor}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Circular icon with gradient */}
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                          <ActivityIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1c1c1e] leading-relaxed">
                            {item.action}
                          </p>
                          {item.details && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.details}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {item.rep && (
                              <span className="text-[11px] font-bold text-[#007AFF]">{item.rep.name}</span>
                            )}
                            <span className="text-[10px] text-gray-400">{formatTime(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {/* Load More / Show Less */}
              {recentActivity.length > 5 && (
                <div className="px-4 py-2.5 border-t border-gray-100">
                  <button
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="flex items-center justify-center gap-1 w-full text-xs text-[#007AFF] font-medium hover:underline py-1"
                  >
                    {showAllActivity ? (
                      <>عرض أقل <ChevronDown className="w-3 h-3 rotate-180" /></>
                    ) : (
                      <>عرض المزيد ({recentActivity.length - 5} نشاط إضافي) <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
