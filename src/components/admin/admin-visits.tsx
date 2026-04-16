'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Search,
  MapPin,
  Clock,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  StickyNote,
  Filter,
  Trash2,
  UserCircle,
} from 'lucide-react';

interface VisitItem {
  id: string;
  repId: string;
  clientId: string | null;
  clientName: string;
  notes: string | null;
  status: string;
  date: string;
  createdAt: string;
  rep: { id: string; name: string };
  client?: { id: string; name: string; businessName: string | null };
}

interface Rep {
  id: string;
  name: string;
  username: string;
  role: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

type DateFilter = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'completed' | 'no_answer' | 'rescheduled';

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        label: 'مكتمل',
        color: 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20',
        icon: CheckCircle,
      };
    case 'no_answer':
      return {
        label: 'لا يوجد رد',
        color: 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20',
        icon: HelpCircle,
      };
    case 'rescheduled':
      return {
        label: 'مؤجل',
        color: 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20',
        icon: RefreshCw,
      };
    default:
      return {
        label: 'مكتمل',
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: CheckCircle,
      };
  }
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

function filterByDate(visits: VisitItem[], filter: DateFilter): VisitItem[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  switch (filter) {
    case 'today':
      return visits.filter((v) => new Date(v.createdAt) >= startOfToday);
    case 'week':
      return visits.filter((v) => new Date(v.createdAt) >= startOfWeek);
    case 'month':
      return visits.filter((v) => new Date(v.createdAt) >= startOfMonth);
    default:
      return visits;
  }
}

export function AdminVisits() {
  const { user } = useAppStore();
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRepId, setSelectedRepId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchVisits = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({ adminId: user.id });
      if (selectedRepId) params.set('filterRepId', selectedRepId);
      const res = await fetch(`/api/visits?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, selectedRepId]);

  const fetchReps = useCallback(async () => {
    try {
      const res = await fetch('/api/reps');
      if (res.ok) {
        const data = await res.json();
        setReps(data.filter((r: Rep) => r.role === 'REP'));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handleDelete = async (visitId: string) => {
    try {
      const res = await fetch(`/api/visits?visitId=${visitId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('🗑️ تم حذف الزيارة');
        setVisits(visits.filter((v) => v.id !== visitId));
      }
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  // Filtered visits
  const filtered = filterByDate(visits, dateFilter)
    .filter((v) => statusFilter === 'all' || v.status === statusFilter)
    .filter(
      (v) =>
        v.clientName.includes(search) ||
        (v.notes && v.notes.includes(search)) ||
        v.rep.name.includes(search)
    );

  // Stats
  const totalVisits = filtered.length;
  const completedCount = filtered.filter((v) => v.status === 'completed').length;
  const noAnswerCount = filtered.filter((v) => v.status === 'no_answer').length;
  const rescheduledCount = filtered.filter((v) => v.status === 'rescheduled').length;

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      {/* Header Toolbar */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعميل أو المندوب..."
            className="rounded-xl border-gray-200 pr-9 bg-white text-sm"
            dir="rtl"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border transition-colors ${
            showFilters ? 'bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]' : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Collapsible Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800 space-y-3">
              {/* Rep Filter */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">المندوب</label>
                <select
                  value={selectedRepId}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-[#f2f2f7] px-3 py-2 text-sm focus:ring-2 ring-[#007AFF]/20 focus:border-[#007AFF] outline-none"
                  dir="rtl"
                >
                  <option value="">جميع المناديب</option>
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">التاريخ</label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { key: 'today' as DateFilter, label: 'اليوم' },
                    { key: 'week' as DateFilter, label: 'هذا الأسبوع' },
                    { key: 'month' as DateFilter, label: 'هذا الشهر' },
                    { key: 'all' as DateFilter, label: 'الكل' },
                  ]).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setDateFilter(f.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        dateFilter === f.key
                          ? 'bg-[#007AFF] text-white shadow-sm'
                          : 'bg-[#f2f2f7] text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">الحالة</label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { key: 'all' as StatusFilter, label: 'الكل' },
                    { key: 'completed' as StatusFilter, label: '✅ مكتمل' },
                    { key: 'no_answer' as StatusFilter, label: '❓ لا يوجد رد' },
                    { key: 'rescheduled' as StatusFilter, label: '🔄 مؤجل' },
                  ]).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        statusFilter === f.key
                          ? 'bg-[#007AFF] text-white shadow-sm'
                          : 'bg-[#f2f2f7] text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <motion.div variants={fadeUp} className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800">
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-[#1c1c1e] dark:text-white">{totalVisits}</p>
            <p className="text-[11px] text-gray-400">الإجمالي</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#34C759]">{completedCount}</p>
            <p className="text-[11px] text-gray-400">مكتمل</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#FF9500]">{noAnswerCount}</p>
            <p className="text-[11px] text-gray-400">لا يوجد رد</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#007AFF]">{rescheduledCount}</p>
            <p className="text-[11px] text-gray-400">مؤجل</p>
          </div>
        </div>
      </motion.div>

      {/* Visit List */}
      {filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">لا توجد زيارات</p>
          <p className="text-xs text-gray-400">
            {search || dateFilter !== 'all' || statusFilter !== 'all'
              ? 'لا توجد نتائج مطابقة للفلاتر'
              : 'لم يتم تسجيل أي زيارات بعد'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-right px-4 py-3 font-medium text-gray-500">العميل</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">المندوب</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">ملاحظات</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((visit) => {
                  const statusConfig = getStatusConfig(visit.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={visit.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{visit.clientName.charAt(0)}</span>
                          </div>
                          <span className="font-medium">{visit.clientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{visit.rep.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{visit.notes || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(visit.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(visit.id)}
                          className="p-1.5 rounded-full hover:bg-[#FF3B30]/10 text-gray-300 hover:text-[#FF3B30] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3 md:hidden">
            <AnimatePresence mode="popLayout">
              {filtered.map((visit, i) => {
                const statusConfig = getStatusConfig(visit.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <motion.div
                    key={visit.id}
                    variants={fadeUp}
                    layout
                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 ${statusConfig.color.split(' ')[0]}`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig.color.split(' ')[1]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-bold text-[#1c1c1e] dark:text-white truncate">{visit.clientName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1">
                            <UserCircle className="w-3 h-3" />
                            {visit.rep.name}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatDate(visit.createdAt)}
                          </div>
                          {visit.notes && (
                            <div className="flex items-start gap-1 text-xs text-gray-500 mt-1.5">
                              <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{visit.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 mr-2">
                        <span className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <button
                          onClick={() => handleDelete(visit.id)}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-300 hover:text-[#FF3B30]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
