'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Receipt,
  Search,
  Trash2,
  Eye,
  X,
  UserCircle,
  Calendar,
  Hash,
  DollarSign,
  Filter,
  Clock,
  FileCheck,
  Building2,
  StickyNote,
  Wallet,
  Landmark,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

interface ReceiptWithDetails {
  id: string;
  repId: string;
  clientId: string;
  receiptNo: string;
  amount: number;
  method: string;
  notes: string | null;
  createdAt: string;
  rep: { id: string; name: string };
  client: { id: string; name: string };
}

function formatCurrency(n: number) {
  return n.toLocaleString('ar-SA');
}

function formatFullDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMethodBadge(method: string) {
  switch (method) {
    case 'نقدي':
      return { color: 'bg-[#34C759]/10 text-[#34C759]', icon: Banknote };
    case 'تحويل':
      return { color: 'bg-[#007AFF]/10 text-[#007AFF]', icon: Building2 };
    case 'شيك':
      return { color: 'bg-[#AF52DE]/10 text-[#AF52DE]', icon: Landmark };
    default:
      return { color: 'bg-gray-100 text-gray-600', icon: CreditCard };
  }
}

export function AdminReceipts() {
  const { user } = useAppStore();
  const [receipts, setReceipts] = useState<ReceiptWithDetails[]>([]);
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRep, setFilterRep] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithDetails | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ adminId: user.id });
      const res = await fetch(`/api/receipts?${params}`);
      if (res.ok) setReceipts(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const now = new Date();

  const filtered = receipts
    .filter((rc) => {
      // Rep filter
      if (filterRep !== 'all' && rc.repId !== filterRep) return false;

      // Search
      if (search) {
        const s = search.toLowerCase();
        const matchReceiptNo = rc.receiptNo && rc.receiptNo.toLowerCase().includes(s);
        const matchRep = rc.rep?.name && rc.rep.name.includes(s);
        const matchClient = rc.client?.name && rc.client.name.includes(s);
        const matchAmount = String(rc.amount).includes(s);
        if (!matchReceiptNo && !matchRep && !matchClient && !matchAmount) return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const rcDate = new Date(rc.createdAt);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateFilter === 'today' && rcDate < startOfDay) return false;
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          if (rcDate < weekAgo) return false;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 86400000);
          if (rcDate < monthAgo) return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Summary stats
  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);

  const hasActiveFilters = dateFilter !== 'all' || filterRep !== 'all';

  const handleDelete = async () => {
    if (!deleteConfirm || !user) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/receipts?receiptId=${deleteConfirm}&adminId=${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success('تم حذف السند بنجاح');
      setDeleteConfirm(null);
      if (selectedReceipt?.id === deleteConfirm) setSelectedReceipt(null);
      fetchReceipts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setDeleting(false);
    }
  };

  if (selectedReceipt) {
    const methodBadge = getMethodBadge(selectedReceipt.method);
    const MethodIcon = methodBadge.icon;
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedReceipt(null)} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">تفاصيل السند</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-l from-[#34C759] to-[#2DA44E] p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">سند قبض</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {selectedReceipt.receiptNo}
              </span>
            </div>
            <p className="text-3xl font-bold flex items-center gap-1">{formatCurrency(selectedReceipt.amount)} <SarIcon size={20} /></p>
            <p className="text-sm opacity-80 mt-1">
              {formatFullDate(selectedReceipt.createdAt)}
            </p>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex gap-3">
              <InfoRow icon={<UserCircle className="w-4 h-4 text-[#007AFF]" />} label="المندوب" value={selectedReceipt.rep?.name || '-'} />
              <InfoRow icon={<UserCircle className="w-4 h-4 text-[#34C759]" />} label="العميل" value={selectedReceipt.client?.name || '-'} />
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MethodIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">طريقة الدفع</span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${methodBadge.color}`}>
                {selectedReceipt.method}
              </span>
            </div>

            {selectedReceipt.notes && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <StickyNote className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">ملاحظات</span>
                  </div>
                  <p className="text-sm text-left">{selectedReceipt.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <Button
          onClick={() => { setDeleteConfirm(selectedReceipt.id); setSelectedReceipt(null); }}
          variant="outline"
          className="w-full h-11 rounded-2xl border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5 font-semibold"
        >
          <Trash2 className="w-4 h-4 ml-1.5" />
          حذف السند
        </Button>
      </motion.div>
    );
  }

  const dateFilters = [
    { id: 'all' as const, label: 'الكل' },
    { id: 'today' as const, label: 'اليوم' },
    { id: 'week' as const, label: 'هذا الأسبوع' },
    { id: 'month' as const, label: 'هذا الشهر' },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold mb-3">سندات القبض</h2>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالعميل أو المندوب أو رقم السند..." className="bg-white rounded-xl border-0 pr-10 h-10 shadow-sm" />
          </div>
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="w-[110px] bg-white rounded-xl border-0 shadow-sm h-10">
              <SelectValue placeholder="المناديب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowFilter(!showFilter)}
            variant="outline"
            className={`h-10 w-10 rounded-xl p-0 shrink-0 border-0 shadow-sm ${hasActiveFilters ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-white'}`}
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              {/* Date Filter */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">الفترة الزمنية</p>
                <div className="flex gap-1.5 flex-wrap">
                  {dateFilters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDateFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        dateFilter === f.id
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#f2f2f7] text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  onClick={() => { setDateFilter('all'); setFilterRep('all'); }}
                  className="text-xs text-[#007AFF] font-medium"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats Bar */}
      {filtered.length > 0 && !loading && (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">إجمالي المبالغ</p>
              <p className="text-sm font-bold text-[#34C759] flex items-center gap-0.5">{formatCurrency(totalAmount)} <SarIcon size={14} className="text-[#34C759]" /></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">عدد السندات</p>
              <p className="text-sm font-bold text-[#1c1c1e]">{filtered.length}</p>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Receipt className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">
            {search || hasActiveFilters ? 'لا توجد نتائج' : 'لا توجد سندات قبض بعد'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setDateFilter('all'); setFilterRep('all'); }}
              className="text-sm text-[#007AFF] font-medium mt-2"
            >
              مسح جميع الفلاتر
            </button>
          )}
        </div>
      ) : (
        <motion.div variants={fadeUp}>
          <p className="text-xs text-gray-500 mb-2">{filtered.length} سند قبض</p>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-right px-4 py-3 font-medium text-gray-500">رقم السند</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">المندوب</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">العميل</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">المبلغ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">الطريقة</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((rc) => {
                    const badge = getMethodBadge(rc.method);
                    const MethodIcon = badge.icon;
                    return (
                      <tr key={rc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#007AFF]">{rc.receiptNo}</td>
                        <td className="px-4 py-3">{rc.rep?.name || '-'}</td>
                        <td className="px-4 py-3">{rc.client?.name || '-'}</td>
                        <td className="px-4 py-3 font-bold text-[#34C759]">{formatCurrency(rc.amount)} <SarIcon size={14} className="text-[#34C759]" /></td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1 ${badge.color}`}>
                            <MethodIcon className="w-3 h-3" />
                            {rc.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(rc.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setSelectedReceipt(rc)} className="p-1.5 rounded-lg hover:bg-gray-100">
                              <Eye className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button onClick={() => setDeleteConfirm(rc.id)} className="p-1.5 rounded-lg hover:bg-[#FF3B30]/5">
                              <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                            </button>
                          </div>
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
            <AnimatePresence mode="popLayout">
              {filtered.map((rc) => {
                const badge = getMethodBadge(rc.method);
                const MethodIcon = badge.icon;
                return (
                  <motion.div
                    key={rc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedReceipt(rc)}
                    className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#34C759] to-[#2DA44E] flex items-center justify-center shrink-0">
                          <FileCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {rc.client?.name || '-'}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock className="w-3 h-3" />
                              {formatShortDate(rc.createdAt)}
                            </div>
                            <span className="text-[11px] text-gray-300">|</span>
                            <span className="text-[11px] text-gray-400">{rc.rep?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <p className="text-sm font-bold text-[#34C759]">{formatCurrency(rc.amount)}</p>
                          <p className="text-[10px] text-gray-400">{rc.receiptNo}</p>
                        </div>
                      </div>
                    </div>

                    {/* Method badge and notes */}
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1 ${badge.color}`}>
                        <MethodIcon className="w-3 h-3" />
                        {rc.method}
                      </span>
                      {rc.notes && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium truncate max-w-[200px]">
                          {rc.notes}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف السند</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف السند وسيتم استرجاع المبلغ من رصيد العميل. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-xl bg-[#FF3B30] hover:bg-[#FF3B30]/90">
              {deleting ? 'جارٍ الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function InfoRow({ icon, label, value, bold, className }: { icon: React.ReactNode; label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <span className={`text-sm ${bold ? 'font-bold' : ''} ${className || ''}`}>{value}</span>
    </div>
  );
}
