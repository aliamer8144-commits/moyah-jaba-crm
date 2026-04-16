'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Clock,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  Receipt,
  AlertCircle,
  LogIn,
  CalendarDays,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react';

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

interface ActivityEntry {
  id: string;
  repId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
  rep?: { id: string; name: string };
}

const PAGE_SIZE = 20;

type DateFilter = 'all' | 'today' | 'week' | 'month';

const dateFilterLabels: Record<DateFilter, string> = {
  all: 'الكل',
  today: 'اليوم',
  week: 'هذا الأسبوع',
  month: 'هذا الشهر',
};

function getStartDate(filter: DateFilter): Date | null {
  const now = new Date();
  switch (filter) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'week': {
      const d = new Date(now);
      const dayOfWeek = d.getDay() || 7;
      d.setDate(d.getDate() - dayOfWeek + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d;
    }
    default:
      return null;
  }
}

function getActivityIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('فاتورة') || lower.includes('invoice')) {
    return { icon: FileText, color: 'text-[#007AFF] bg-[#007AFF]/10' };
  }
  if (lower.includes('عميل') || lower.includes('client')) {
    return { icon: Users, color: 'text-[#AF52DE] bg-[#AF52DE]/10' };
  }
  if (lower.includes('سند قبض') || lower.includes('receipt')) {
    return { icon: Receipt, color: 'text-[#34C759] bg-[#34C759]/10' };
  }
  if (lower.includes('تعديل') || lower.includes('حذف') || lower.includes('edit') || lower.includes('delete')) {
    return { icon: AlertCircle, color: 'text-[#FF9500] bg-[#FF9500]/10' };
  }
  if (lower.includes('تسجيل دخول') || lower.includes('login')) {
    return { icon: LogIn, color: 'text-gray-500 bg-gray-100' };
  }
  return { icon: Activity, color: 'text-[#007AFF] bg-[#007AFF]/10' };
}

export function ActivityLog() {
  const { user } = useAppStore();
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRep, setFilterRep] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [offset, setOffset] = useState(0);

  const fetchReps = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/auth?adminId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setReps(data.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
      }
    } catch {
      // silent
    }
  }, [user]);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({
        adminId: user.id,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (filterRep !== 'all') params.set('filterRepId', filterRep);
      const res = await fetch(`/api/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        let allLogs = data.logs || [];
        // Apply date filter client-side
        if (dateFilter !== 'all') {
          const startDate = getStartDate(dateFilter);
          if (startDate) {
            allLogs = allLogs.filter((log: ActivityEntry) => new Date(log.createdAt) >= startDate);
          }
        }
        setLogs(allLogs);
        setTotal(data.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, filterRep, dateFilter, offset]);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    fetchLogs(true);
  };

  const filteredTotal = useMemo(() => {
    if (dateFilter === 'all') return total;
    const startDate = getStartDate(dateFilter);
    if (!startDate) return total;
    return logs.length;
  }, [dateFilter, total, logs.length]);

  const todayCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return logs.filter((log) => new Date(log.createdAt) >= startOfToday).length;
  }, [logs]);

  const mostActiveRep = useMemo(() => {
    const repCounts: Record<string, number> = {};
    const repNames: Record<string, string> = {};
    logs.forEach((log) => {
      if (log.rep) {
        repCounts[log.rep.id] = (repCounts[log.rep.id] || 0) + 1;
        repNames[log.rep.id] = log.rep.name;
      }
    });
    let maxId = '';
    let maxCount = 0;
    Object.entries(repCounts).forEach(([id, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxId = id;
      }
    });
    return maxId ? repNames[maxId] : null;
  }, [logs]);

  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const handleDateFilterChange = (val: string) => {
    setDateFilter(val as DateFilter);
    setOffset(0);
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">سجل النشاط</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-500 hover:bg-gray-100 rounded-xl h-9 w-9 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Summary Bar */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-2xl p-4 shadow-sm mb-3"
        >
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#007AFF]" />
              </div>
              <span className="text-lg font-bold text-[#1c1c1e]">{filteredTotal}</span>
              <span className="text-[10px] text-gray-500">إجمالي النشاطات</span>
            </div>

            <div className="w-px h-12 bg-gray-100" />

            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#34C759]" />
              </div>
              <span className="inline-flex items-center gap-1">
                <span className="text-lg font-bold text-[#34C759]">{todayCount}</span>
              </span>
              <span className="text-[10px] text-gray-500 bg-[#34C759]/10 px-2 py-0.5 rounded-full font-medium text-[#34C759]">نشاطات اليوم</span>
            </div>

            <div className="w-px h-12 bg-gray-100" />

            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FF9500]" />
              </div>
              <span className="text-xs font-bold text-[#1c1c1e] max-w-[60px] truncate">
                {mostActiveRep || '—'}
              </span>
              <span className="text-[10px] text-gray-500">الأكثر نشاطاً</span>
            </div>
          </div>
        </motion.div>

        {/* Date Filter Buttons */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {(Object.entries(dateFilterLabels) as [DateFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleDateFilterChange(key)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                dateFilter === key
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Rep Filter */}
        <div className="flex items-center justify-between mb-3">
          <Select value={filterRep} onValueChange={(v) => { setFilterRep(v); setOffset(0); }}>
            <SelectTrigger className="w-[160px] bg-white rounded-xl border-0 shadow-sm h-10">
              <SelectValue placeholder="تصفية بالمندوب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{filteredTotal} نشاط</span>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <motion.div variants={fadeUp} className="space-y-2">
          {/* Table-row style skeletons */}
          <Skeleton className="h-10 w-full rounded-xl" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <Skeleton className="h-14 w-full" />
            </div>
          ))}
        </motion.div>
      ) : logs.length === 0 ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center py-24 text-gray-400">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Activity className="w-12 h-12 opacity-30" />
          </div>
          <p className="font-semibold text-gray-500 text-base">لا توجد نشاطات</p>
          <p className="text-sm mt-1.5 text-gray-400 max-w-[240px] text-center leading-relaxed">
            {dateFilter !== 'all' || filterRep !== 'all'
              ? 'جرّب تغيير عوامل التصفية لعرض المزيد من النتائج'
              : 'ستظهر النشاطات هنا عند قيام المندوبين بأي إجراء مثل إنشاء فاتورة أو إدارة عملاء'}
          </p>
          {(dateFilter !== 'all' || filterRep !== 'all') && (
            <button
              onClick={() => { setDateFilter('all'); setFilterRep('all'); setOffset(0); }}
              className="mt-4 text-sm text-[#007AFF] font-medium hover:underline"
            >
              مسح الفلاتر
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp}>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-right px-4 py-3 font-medium text-gray-500">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">المندوب</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">الإجراء</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log, index) => {
                    const { icon: ActivityIcon, color } = getActivityIcon(log.action);
                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-[#007AFF]/[0.03] transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{log.rep?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${color}`}>
                            <ActivityIcon className="w-3.5 h-3.5" />
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[300px] truncate">
                          {log.details || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {logs.map((log) => {
              const { icon: ActivityIcon, color } = getActivityIcon(log.action);
              return (
                <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${color}`}>
                      <ActivityIcon className="w-3.5 h-3.5" />
                      {log.action}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatTime(log.createdAt)}
                    </div>
                  </div>
                  {log.details && (
                    <p className="text-sm text-gray-600 line-clamp-2">{log.details}</p>
                  )}
                  {log.rep && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                      <UserCircle className="w-3.5 h-3.5" />
                      {log.rep.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="rounded-xl h-9"
              >
                <ChevronRight className="w-4 h-4 ml-1" />
                السابق
              </Button>
              <span className="text-sm text-gray-500 px-3">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="rounded-xl h-9"
              >
                التالي
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
