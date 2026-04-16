'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MapPin,
  Plus,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  StickyNote,
  Search,
  Trash2,
  Filter,
  CalendarDays,
  Users,
} from 'lucide-react';

interface VisitLogItem {
  id: string;
  repId: string;
  clientId: string | null;
  clientName: string;
  notes: string | null;
  status: string;
  date: string;
  createdAt: string;
  client?: { id: string; name: string };
}

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

type DateFilter = 'today' | 'week' | 'month' | 'all';

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        label: 'مكتمل',
        emoji: '✅',
        color: 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20',
        icon: CheckCircle,
      };
    case 'no_answer':
      return {
        label: 'لا يوجد رد',
        emoji: '❓',
        color: 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20',
        icon: HelpCircle,
      };
    case 'rescheduled':
      return {
        label: 'مؤجل',
        emoji: '🔄',
        color: 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20',
        icon: RefreshCw,
      };
    default:
      return {
        label: 'مكتمل',
        emoji: '✅',
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: CheckCircle,
      };
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function filterByDate(visits: VisitLogItem[], filter: DateFilter): VisitLogItem[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
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

interface VisitLogProps {
  compact?: boolean;
  clientId?: string;
  clientName?: string;
}

export function VisitLog({ compact = false, clientId, clientName }: VisitLogProps) {
  const { user, clients } = useAppStore();
  const [visits, setVisits] = useState<VisitLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [visitClientName, setVisitClientName] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitStatus, setVisitStatus] = useState('completed');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const fetchVisits = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/visits?repId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Set client if passed from props
  useEffect(() => {
    if (clientId && clientName) {
      setSelectedClient(clientId);
      setVisitClientName(clientName);
    }
  }, [clientId, clientName]);

  const handleSubmit = async () => {
    if (!user || !visitClientName.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          clientId: selectedClient || null,
          clientName: visitClientName.trim(),
          notes: visitNotes.trim() || null,
          status: visitStatus,
        }),
      });

      if (res.ok) {
        toast.success('✅ تم تسجيل الزيارة بنجاح');
        setDialogOpen(false);
        setVisitClientName('');
        setVisitNotes('');
        setVisitStatus('completed');
        setSelectedClient('');
        fetchVisits();
      } else {
        toast.error('حدث خطأ أثناء تسجيل الزيارة');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

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
  const filteredVisits = filterByDate(visits, dateFilter).filter(
    (v) =>
      v.clientName.includes(search) ||
      (v.notes && v.notes.includes(search))
  );

  // Today's summary
  const todayVisits = filterByDate(visits, 'today');
  const completedCount = todayVisits.filter((v) => v.status === 'completed').length;
  const noAnswerCount = todayVisits.filter((v) => v.status === 'no_answer').length;
  const rescheduledCount = todayVisits.filter((v) => v.status === 'rescheduled').length;

  // Filtered clients for dropdown
  const filteredClients = clients.filter((c) =>
    c.name.includes(clientSearch) || (c.businessName && c.businessName.includes(clientSearch))
  );

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (compact) {
    // Compact mode for embedding in other components
    return (
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5"
            >
              <MapPin className="w-4 h-4 ml-1.5" />
              تسجيل زيارة
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-sm mx-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">تسجيل زيارة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">الحالة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'completed', label: '✅ مكتمل', color: 'bg-[#34C759]/10 border-[#34C759]/30 text-[#34C759]' },
                    { value: 'no_answer', label: '❓ لا يوجد رد', color: 'bg-[#FF9500]/10 border-[#FF9500]/30 text-[#FF9500]' },
                    { value: 'rescheduled', label: '🔄 مؤجل', color: 'bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setVisitStatus(opt.value)}
                      className={`p-2 rounded-xl text-xs font-medium border-2 transition-all ${
                        visitStatus === opt.value ? opt.color : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">ملاحظات</label>
                <Textarea
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="أضف ملاحظات عن الزيارة..."
                  className="rounded-xl border-gray-200 resize-none min-h-[80px]"
                  dir="rtl"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-[#007AFF] text-white font-semibold"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'تأكيد التسجيل'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="p-4 space-y-4">
      {/* Summary Bar */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[#1c1c1e]">سجل الزيارات</h3>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (open && clientName) { setVisitClientName(clientName); setSelectedClient(clientId || ''); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 rounded-xl bg-[#007AFF] text-white text-xs font-semibold gap-1.5">
                <Plus className="w-4 h-4" />
                تسجيل زيارة
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-sm mx-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#007AFF]" />
                  تسجيل زيارة جديدة
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Client Selector */}
                <div className="relative">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">العميل</label>
                  {!selectedClient ? (
                    <>
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={clientSearch}
                          onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                          onFocus={() => setShowClientDropdown(true)}
                          placeholder="ابحث عن عميل أو أدخل اسم..."
                          className="rounded-xl border-gray-200 pr-9 text-sm"
                          dir="rtl"
                        />
                      </div>
                      <AnimatePresence>
                        {showClientDropdown && clientSearch && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-48 overflow-y-auto"
                          >
                            {filteredClients.length > 0 ? (
                              filteredClients.slice(0, 6).map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setSelectedClient(c.id);
                                    setVisitClientName(c.name);
                                    setClientSearch(c.name);
                                    setShowClientDropdown(false);
                                  }}
                                  className="w-full px-3 py-2.5 text-right text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center shrink-0">
                                    <span className="text-white text-xs font-bold">{c.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{c.name}</p>
                                    {c.businessName && <p className="text-[11px] text-gray-400">{c.businessName}</p>}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-sm text-gray-400">
                                لا توجد نتائج
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <p className="text-[11px] text-gray-400 mt-1">أو أدخل اسم عميل غير مسجل</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-[#007AFF]/5 rounded-xl border border-[#007AFF]/20">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{visitClientName.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-medium flex-1">{visitClientName}</span>
                      <button
                        onClick={() => { setSelectedClient(''); setVisitClientName(''); setClientSearch(''); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {!selectedClient && !clientSearch && (
                    <Input
                      value={visitClientName}
                      onChange={(e) => setVisitClientName(e.target.value)}
                      placeholder="اسم العميل"
                      className="rounded-xl border-gray-200 text-sm"
                      dir="rtl"
                    />
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">حالة الزيارة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'completed', label: '✅ مكتمل', color: 'bg-[#34C759]/10 border-[#34C759]/30 text-[#34C759]' },
                      { value: 'no_answer', label: '❓ لا يوجد رد', color: 'bg-[#FF9500]/10 border-[#FF9500]/30 text-[#FF9500]' },
                      { value: 'rescheduled', label: '🔄 مؤجل', color: 'bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setVisitStatus(opt.value)}
                        className={`p-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
                          visitStatus === opt.value ? opt.color : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">ملاحظات</label>
                  <Textarea
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="أضف ملاحظات عن الزيارة..."
                    className="rounded-xl border-gray-200 resize-none min-h-[80px]"
                    dir="rtl"
                  />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !visitClientName.trim()}
                  className="w-full h-11 rounded-xl bg-[#007AFF] text-white font-semibold"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'تأكيد التسجيل'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#34C759]/5 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-[#34C759]">{completedCount}</p>
            <p className="text-[11px] text-gray-500">مكتمل</p>
          </div>
          <div className="bg-[#FF9500]/5 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-[#FF9500]">{noAnswerCount}</p>
            <p className="text-[11px] text-gray-500">لا يوجد رد</p>
          </div>
          <div className="bg-[#007AFF]/5 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-[#007AFF]">{rescheduledCount}</p>
            <p className="text-[11px] text-gray-500">مؤجل</p>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الملاحظات..."
            className="rounded-xl border-gray-200 pr-9 bg-white text-sm"
            dir="rtl"
          />
        </div>

        {/* Date Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { key: 'today' as DateFilter, label: 'اليوم' },
            { key: 'week' as DateFilter, label: 'هذا الأسبوع' },
            { key: 'month' as DateFilter, label: 'هذا الشهر' },
            { key: 'all' as DateFilter, label: 'الكل' },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                dateFilter === f.key
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Visit Cards */}
      {filteredVisits.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">لا توجد زيارات</p>
          <p className="text-xs text-gray-400">ابدأ بتسجيل زياراتك اليومية</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredVisits.map((visit, i) => {
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
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 ${statusConfig.color.split(' ')[0]}`}>
                        <StatusIcon className={`w-5 h-5 ${statusConfig.color.split(' ')[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-[#1c1c1e] truncate">{visit.clientName}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1.5">
                          <Clock className="w-3 h-3" />
                          {formatDate(visit.createdAt)}
                        </div>
                        {visit.notes && (
                          <div className="flex items-start gap-1 text-xs text-gray-500">
                            <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{visit.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-2">
                      <span className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${statusConfig.color}`}>
                        {statusConfig.emoji} {statusConfig.label}
                      </span>
                      <button
                        onClick={() => handleDelete(visit.id)}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-300 hover:text-[#FF3B30]"
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
      )}
    </motion.div>
  );
}
