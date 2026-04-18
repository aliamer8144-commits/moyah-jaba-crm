'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, Client, Invoice } from '@/lib/store';
import { Users, FileText, Package, AlertCircle, Clock, Sun, Moon, TrendingUp, Trophy, Wallet } from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';
import { AchievementBadges } from '@/components/rep/achievement-badges';
import { WeeklySummary } from '@/components/rep/weekly-summary';
import { Skeleton } from '@/components/ui/skeleton';

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProgressRing({ value, max, color, size = 56 }: { value: number; max: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference - pct * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-100 dark:text-gray-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            '--ring-circumference': circumference,
            '--ring-offset': offset,
          } as React.CSSProperties}
          className="animate-progress-ring"
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-[#1c1c1e] dark:text-white">{value}</span>
      </div>
    </div>
  );
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

const motivationalMessages = [
  'استمر في العمل المتميز! 🌟',
  'كل يوم هو فرصة جديدة للنجاح 💪',
  'أداؤك اليوم رائع، واصل التقدم! 🚀',
  'العمل الجاد يصنع النتائج العظيمة ✨',
  'النجاح يبدأ بخطوة واحدة 🎯',
];

// --- Today's Quick Stats ---
interface QuickStats {
  totalInvoicesToday: number;
  activeClientsToday: number;
  amountCollectedToday: number;
}

function TodaysQuickStats() {
  const { user } = useAppStore();
  const [stats, setStats] = useState<QuickStats>({
    totalInvoicesToday: 0,
    activeClientsToday: 0,
    amountCollectedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fetchStats = async () => {
      try {
        const [invoicesRes, clientsRes, receiptsRes] = await Promise.all([
          fetch(`/api/invoices?repId=${user.id}`),
          fetch(`/api/clients?repId=${user.id}`),
          fetch(`/api/receipts?repId=${user.id}`),
        ]);

        let todayInvoices = 0;
        let todayClientIds = new Set<string>();
        let todayCollected = 0;

        if (invoicesRes.ok) {
          const invoices = await invoicesRes.json();
          for (const inv of invoices) {
            const invDate = new Date(inv.createdAt);
            if (invDate >= today) {
              todayInvoices++;
              if (inv.clientId) todayClientIds.add(inv.clientId);
            }
          }
        }

        if (clientsRes.ok) {
          // Clients created today also count
          const clients = await clientsRes.json();
          for (const client of clients) {
            const clientDate = new Date(client.createdAt);
            if (clientDate >= today) {
              todayClientIds.add(client.id);
            }
          }
        }

        if (receiptsRes.ok) {
          const receipts = await receiptsRes.json();
          for (const r of receipts) {
            const rDate = new Date(r.createdAt);
            if (rDate >= today) {
              todayCollected += r.amount || 0;
            }
          }
        }

        setStats({
          totalInvoicesToday: todayInvoices,
          activeClientsToday: todayClientIds.size,
          amountCollectedToday: todayCollected,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const quickStatItems = [
    {
      label: 'إجمالي الفواتير',
      value: stats.totalInvoicesToday,
      icon: FileText,
      gradient: 'from-[#007AFF] to-[#5856D6]',
      iconBg: 'bg-[#007AFF]/15',
      iconColor: 'text-[#007AFF]',
    },
    {
      label: 'العملاء النشطين',
      value: stats.activeClientsToday,
      icon: Users,
      gradient: 'from-[#34C759] to-[#28A745]',
      iconBg: 'bg-[#34C759]/15',
      iconColor: 'text-[#34C759]',
    },
    {
      label: 'المبالغ المحصلة',
      value: stats.amountCollectedToday,
      icon: Wallet,
      gradient: 'from-[#AF52DE] to-[#9B30D9]',
      iconBg: 'bg-[#AF52DE]/15',
      iconColor: 'text-[#AF52DE]',
      format: true,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm shimmer-loading">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <Skeleton className="w-8 h-8 rounded-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded mt-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl p-4 shadow-md border border-gray-200/60 dark:border-gray-800/50">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#007AFF]" />
        <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">إحصائيات اليوم السريعة</h3>
        <span className="text-[10px] text-gray-400 mr-auto">يومياً</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {quickStatItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.08 + 0.1, duration: 0.4, ease: 'easeOut' }}
              whileTap={{ scale: 0.97 }}
              className={`relative rounded-xl p-3 overflow-hidden bg-gradient-to-br ${item.gradient} text-white`}
            >
              {/* Decorative circle */}
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
              <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <p className="text-xl font-bold font-mono leading-none">
                  {item.format ? item.value.toLocaleString('ar-SA') : item.value}
                </p>
                <p className="text-[10px] text-white/70 mt-1 font-medium">{item.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function RepHome() {
  const { user, clients, setClients, invoices, setInvoices, setRepTab } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [clientsRes, invoicesRes] = await Promise.all([
        fetch(`/api/clients?repId=${user.id}`),
        fetch(`/api/invoices?repId=${user.id}`),
      ]);
      if (clientsRes.ok) {
        const cData = await clientsRes.json();
        setClients(cData);
      }
      if (invoicesRes.ok) {
        const iData = await invoicesRes.json();
        setInvoices(iData);
      }
    } catch {
      // silent - use cached data
    } finally {
      setLoading(false);
    }
  }, [user, setClients, setInvoices]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalDebt = invoices.reduce((sum, inv) => sum + (inv.debtAmount || 0), 0);
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.finalTotal, 0);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  const todayDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const motivational = motivationalMessages[Math.floor(Date.now() / 86400000) % motivationalMessages.length];

  const recentInvoices = invoices.slice(0, 5);

  // Sales breakdown by product size
  const salesBySize = useMemo(() => {
    const sizeMap = new Map<string, { total: number; count: number }>();
    invoices.forEach((inv) => {
      const size = inv.productSize || 'عادي';
      const existing = sizeMap.get(size) || { total: 0, count: 0 };
      existing.total += inv.finalTotal;
      existing.count += 1;
      sizeMap.set(size, existing);
    });
    return Array.from(sizeMap.entries()).map(([size, data]) => ({ size, ...data }));
  }, [invoices]);

  const hasMultipleSizes = salesBySize.length > 1;

  const maxClients = Math.max(clients.length, 10);
  const maxInvoices = Math.max(invoices.length, 10);
  const maxInventory = Math.max(user?.allocatedInventory || 0, 100);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setScrollY(mainRef.current.scrollTop);
      }
    };
    const el = mainRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl shimmer-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="p-4 space-y-4" ref={mainRef}>
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
                {(() => {
                  const hour = new Date().getHours();
                  const isMorning = hour < 12;
                  return isMorning
                    ? <Sun className="w-4 h-4 text-[#FFD60A]" />
                    : <Moon className="w-4 h-4 text-[#C7D2FE]" />;
                })()}
                <p className="text-sm opacity-80">{greeting()}،</p>
              </div>
              <p className="text-[11px] opacity-60">{todayDate}</p>
            </div>
            <h2 className="text-2xl font-bold mt-1 drop-shadow-sm">{user?.name}</h2>
            <div className="mt-3 flex items-center gap-2 text-xs opacity-70 bg-white/10 px-3 py-1.5 rounded-full inline-flex backdrop-blur-sm">
              <span>{motivational}</span>
            </div>
            {/* Revenue indicator */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>إجمالي المبيعات</span>
              </div>
              <span className="text-sm font-bold">{totalRevenue.toLocaleString('ar-SA')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Quick Stats */}
      <motion.div variants={fadeUp}>
        <TodaysQuickStats />
      </motion.div>

      {/* Stats Grid with Enhanced Micro-Interactions */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 gap-3 parallax-scroll"
        style={{ transform: `translateY(${scrollY * -0.03}px)`, transition: 'transform 0.1s linear' }}
      >
        <motion.div
          whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0, 122, 255, 0.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl rounded-2xl p-4 bg-gradient-to-br from-white/40 to-[#f0f2ff]/30 dark:from-[#1c1c1e]/40 dark:to-[#1c1c1e] hover-lift press-scale card-3d-tilt card-hover-lift glass-card-enhanced"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing value={clients.length} max={maxClients} color="#007AFF" />
              <div>
                <p className="text-xs text-gray-500">العملاء</p>
                <p className="text-lg font-bold text-[#1c1c1e] dark:text-white"><AnimatedNumber value={clients.length} duration={800} /></p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#007AFF]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(52, 199, 89, 0.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl rounded-2xl p-4 bg-gradient-to-br from-white/40 to-[#edf8f0]/30 dark:from-[#1c1c1e]/40 dark:to-[#1c1c1e] hover-lift press-scale card-3d-tilt card-hover-lift glass-card-enhanced"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing value={invoices.length} max={maxInvoices} color="#34C759" />
              <div>
                <p className="text-xs text-gray-500">الفواتير</p>
                <p className="text-lg font-bold text-[#1c1c1e] dark:text-white"><AnimatedNumber value={invoices.length} duration={800} /></p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#34C759]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(255, 149, 0, 0.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl rounded-2xl p-4 bg-gradient-to-br from-white/40 to-[#fdf5ed]/30 dark:from-[#1c1c1e]/40 dark:to-[#1c1c1e] hover-lift press-scale card-3d-tilt card-hover-lift glass-card-enhanced"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing value={user?.allocatedInventory || 0} max={maxInventory} color="#FF9500" />
              <div>
                <p className="text-xs text-gray-500">المخزون</p>
                <p className="text-lg font-bold text-[#1c1c1e] dark:text-white"><AnimatedNumber value={user?.allocatedInventory || 0} duration={800} /></p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-[#FF9500]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(255, 59, 48, 0.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-xl rounded-2xl p-4 bg-gradient-to-br from-white/40 to-[#fdf0f0]/30 dark:from-[#1c1c1e]/40 dark:to-[#1c1c1e] hover-lift press-scale card-3d-tilt card-hover-lift glass-card-enhanced"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProgressRing value={totalDebt} max={Math.max(totalDebt * 2, 100)} color="#FF3B30" />
              <div>
                <p className="text-xs text-gray-500">الديون</p>
                <p className="text-lg font-bold text-[#FF3B30]"><AnimatedNumber value={totalDebt} duration={800} /></p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* My Achievements */}
      <motion.div variants={fadeUp}>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FFD700]" />
              <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">إنجازاتي</h3>
            </div>
            {invoices.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setRepTab('profile')}
                className="text-xs text-[#FFD700] font-medium hover:bg-[#FFD700]/5 px-2 py-1 rounded-lg transition-colors"
              >
                عرض الكل
              </motion.button>
            )}
          </div>
          <AchievementBadges invoices={invoices} clients={clients} compact maxShow={3} />
        </div>
      </motion.div>

      {/* Sales Breakdown by Product Size */}
      {hasMultipleSizes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-[#FF9500]" />
              <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">توزيع المبيعات حسب الحجم</h3>
            </div>
            <div className="space-y-2.5">
              {salesBySize.map((item) => {
                const maxTotal = Math.max(...salesBySize.map((s) => s.total), 1);
                const pct = Math.round((item.total / maxTotal) * 100);
                const sizeColors: Record<string, { bar: string; text: string; bg: string }> = {
                  'عادي': { bar: 'bg-gradient-to-l from-[#007AFF] to-[#5AC8FA]', text: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10' },
                  'صغير': { bar: 'bg-gradient-to-l from-[#FF9500] to-[#FFCC02]', text: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
                  'كبير': { bar: 'bg-gradient-to-l from-[#AF52DE] to-[#BF5AF2]', text: 'text-[#AF52DE]', bg: 'bg-[#AF52DE]/10' },
                };
                const colors = sizeColors[item.size] || sizeColors['عادي'];
                return (
                  <div key={item.size}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                        {item.size}
                      </span>
                      <span className="text-gray-500">
                        <span className="font-bold text-[#1c1c1e] dark:text-white">{item.total.toLocaleString('ar-SA')}</span>
                        {' '}<SarIcon className="inline" size={10} /> ({item.count} فاتورة)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full ${colors.bar} rounded-full`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Invoices with Staggered fadeUp & Count Badge */}
      <motion.div variants={fadeUp}>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-800 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white">آخر الفواتير</h3>
              {recentInvoices.length > 0 && (
                <span className="count-badge bg-[#007AFF]/10 text-[#007AFF]">
                  {invoices.length}
                </span>
              )}
            </div>
            {recentInvoices.length > 0 && (
              <span className="text-xs text-[#007AFF] font-medium">عرض الكل</span>
            )}
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد فواتير بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentInvoices.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 flex items-center justify-center animate-scale-in" style={{ animationDelay: `${i * 0.06}s` }}>
                      <FileText className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1c1c1e] dark:text-white">{inv.client?.name || 'عميل'}</p>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(inv.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#1c1c1e] dark:text-white">{inv.finalTotal.toLocaleString('ar-SA')}</p>
                    {inv.debtAmount > 0 && (
                      <p className="text-[11px] text-[#FF3B30]">دين: {inv.debtAmount.toLocaleString('ar-SA')}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Weekly Summary */}
      <motion.div variants={fadeUp}>
        <WeeklySummary />
      </motion.div>

      {/* Floating gradient orb background */}
      <div
        className="floating-gradient-orb"
        style={{
          top: `${200 + scrollY * 0.05}px`,
          left: '-40px',
          transition: 'top 0.15s linear',
        }}
      />
      <div
        className="floating-gradient-orb"
        style={{
          top: `${600 + scrollY * -0.03}px`,
          right: '-60px',
          background: 'radial-gradient(circle, rgba(175, 82, 222, 0.06) 0%, transparent 70%)',
          animationDelay: '3s',
          transition: 'top 0.15s linear',
        }}
      />
    </motion.div>
  );
}
