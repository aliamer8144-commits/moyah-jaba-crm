'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, Invoice } from '@/lib/store';
import {
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceDetail } from './invoice-detail';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
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

function formatCurrency(n: number) {
  return n.toLocaleString('ar-SA');
}

function InvoiceSkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm shimmer-skeleton dark-card-border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded-lg" />
          <Skeleton className="h-4 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-32 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20 rounded-lg" />
          <Skeleton className="h-3 w-12 rounded-lg" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function InvoiceList() {
  const { user, invoices, setInvoices, setRepTab } = useAppStore();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'debt' | 'synced' | 'unsynced'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [syncTooltipId, setSyncTooltipId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?repId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, setInvoices]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Auto-hide sync tooltip
  useEffect(() => {
    if (syncTooltipId) {
      const timer = setTimeout(() => setSyncTooltipId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncTooltipId]);

  const now = new Date();

  const filtered = invoices
    .filter((inv) => {
      // Search
      if (search) {
        const s = search.toLowerCase();
        const matchName = inv.client?.name && inv.client.name.includes(s);
        const matchAmount = String(inv.finalTotal).includes(s);
        if (!matchName && !matchAmount) return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const invDate = new Date(inv.createdAt);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateFilter === 'today' && invDate < startOfDay) return false;
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          if (invDate < weekAgo) return false;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 86400000);
          if (invDate < monthAgo) return false;
        }
      }

      // Status filter
      if (statusFilter === 'paid' && inv.debtAmount > 0) return false;
      if (statusFilter === 'debt' && inv.debtAmount <= 0) return false;
      if (statusFilter === 'synced' && !inv.synced) return false;
      if (statusFilter === 'unsynced' && inv.synced) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest': return b.finalTotal - a.finalTotal;
        case 'lowest': return a.finalTotal - b.finalTotal;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Summary stats
  const totalFiltered = filtered.reduce((s, i) => s + i.finalTotal, 0);
  const totalDebt = filtered.reduce((s, i) => s + i.debtAmount, 0);
  const totalPaid = filtered.reduce((s, i) => s + i.paidAmount, 0);

  const hasActiveFilters = dateFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'newest';

  if (selectedInvoice) {
    return (
      <InvoiceDetail
        invoice={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
      />
    );
  }

  const dateFilters = [
    { id: 'all' as const, label: 'الكل' },
    { id: 'today' as const, label: 'اليوم' },
    { id: 'week' as const, label: 'هذا الأسبوع' },
    { id: 'month' as const, label: 'هذا الشهر' },
  ];

  const statusFilters = [
    { id: 'all' as const, label: 'الكل' },
    { id: 'paid' as const, label: 'مدفوعة' },
    { id: 'debt' as const, label: 'عليها دين' },
    { id: 'synced' as const, label: 'متزامنة' },
    { id: 'unsynced' as const, label: 'غير متزامنة' },
  ];

  const sortOptions = [
    { id: 'newest' as const, label: 'الأحدث' },
    { id: 'oldest' as const, label: 'الأقدم' },
    { id: 'highest' as const, label: 'الأعلى سعراً' },
    { id: 'lowest' as const, label: 'الأقل سعراً' },
  ];

  const handleSyncClick = (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation();
    setSyncTooltipId(syncTooltipId === inv.id ? null : inv.id);
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="p-4 space-y-4">
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold px-1 mb-3 text-[#1c1c1e] dark:text-white">الفواتير</h2>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <motion.div animate={searchFocused ? { scale: 1.01 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="بحث بالعميل أو المبلغ..."
                className={`bg-white dark:bg-[#1c1c1e] rounded-xl border-0 pr-10 h-11 shadow-sm transition-all duration-300 ${
                  searchFocused
                    ? 'ring-2 ring-[#007AFF]/30 shadow-[0_0_16px_rgba(0,122,255,0.08)]'
                    : ''
                }`}
              />
            </motion.div>
          </div>
          <Button
            onClick={() => setShowFilter(!showFilter)}
            variant="outline"
            className={`h-11 w-11 rounded-xl p-0 shrink-0 border-0 shadow-sm transition-all duration-300 ${
              hasActiveFilters
                ? 'bg-[#007AFF]/10 text-[#007AFF] shadow-[#007AFF]/10'
                : 'bg-white dark:bg-[#1c1c1e]'
            }`}
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
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800 space-y-3 glass-card-enhanced">
              {/* Date Filter */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">الفترة الزمنية</p>
                <div className="flex gap-1.5 flex-wrap">
                  {dateFilters.map((f) => (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setDateFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        dateFilter === f.id
                          ? 'bg-gradient-to-l from-[#007AFF] to-[#0055D4] text-white shadow-md shadow-[#007AFF]/20'
                          : 'bg-[#f2f2f7] dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {f.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">الحالة</p>
                <div className="flex gap-1.5 flex-wrap">
                  {statusFilters.map((f) => (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        statusFilter === f.id
                          ? 'bg-gradient-to-l from-[#007AFF] to-[#0055D4] text-white shadow-md shadow-[#007AFF]/20'
                          : 'bg-[#f2f2f7] dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {f.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">ترتيب</p>
                <div className="flex gap-1.5 flex-wrap">
                  {sortOptions.map((f) => (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setSortBy(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        sortBy === f.id
                          ? 'bg-gradient-to-l from-[#007AFF] to-[#0055D4] text-white shadow-md shadow-[#007AFF]/20'
                          : 'bg-[#f2f2f7] dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {f.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  onClick={() => { setDateFilter('all'); setStatusFilter('all'); setSortBy('newest'); }}
                  className="text-xs text-[#007AFF] font-medium hover:text-[#0055D4] transition-colors"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Bar */}
      {filtered.length > 0 && !loading && (
        <motion.div
          variants={fadeUp}
          className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800 glass-card-enhanced"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">ملخص</h3>
            <span className="text-[10px] text-gray-400">{filtered.length} فاتورة</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-gradient-to-b from-[#007AFF]/5 to-transparent dark:from-[#007AFF]/10 rounded-xl py-2.5 px-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet className="w-3 h-3 text-[#007AFF]" />
              </div>
              <p className="text-[10px] text-gray-500 mb-0.5">الإجمالي</p>
              <p className="text-sm font-bold text-[#1c1c1e] dark:text-white">{formatCurrency(totalFiltered)}</p>
            </div>
            <div className="text-center bg-gradient-to-b from-[#34C759]/5 to-transparent dark:from-[#34C759]/10 rounded-xl py-2.5 px-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-[#34C759]" />
              </div>
              <p className="text-[10px] text-gray-500 mb-0.5">المدفوع</p>
              <p className="text-sm font-bold text-[#34C759]">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-center bg-gradient-to-b from-[#FF3B30]/5 to-transparent dark:from-[#FF3B30]/10 rounded-xl py-2.5 px-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-[#FF3B30]" />
              </div>
              <p className="text-[10px] text-gray-500 mb-0.5">الديون</p>
              <p className="text-sm font-bold debt-gradient-text">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <InvoiceSkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText className="w-8 h-8 text-[#007AFF]/50" />
          </div>
          <p className="font-medium text-gray-600 dark:text-gray-300 text-base">
            {search || hasActiveFilters ? 'لا توجد نتائج' : 'لا توجد فواتير بعد'}
          </p>
          <p className="empty-state-text mt-1">
            {!search && !hasActiveFilters ? 'ابدأ بإنشاء أول فاتورة لعملائك' : 'حاول تغيير معايير البحث'}
          </p>
          {!search && !hasActiveFilters ? (
            <Button
              onClick={() => setRepTab('create-invoice')}
              className="mt-4 h-11 px-6 rounded-2xl bg-[#007AFF] text-white font-semibold gap-2"
            >
              <Plus className="w-4 h-4" />
              إنشاء فاتورة
            </Button>
          ) : (
            <button
              onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); setSortBy('newest'); }}
              className="text-sm text-[#007AFF] font-medium mt-2"
            >
              مسح جميع الفلاتر
            </button>
          )}
        </div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-2">
          <p className="text-xs text-gray-500 px-1">{filtered.length} فاتورة</p>
          <AnimatePresence mode="popLayout">
            {filtered.map((inv) => (
              <motion.div
                key={inv.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => setSelectedInvoice(inv)}
                className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm cursor-pointer transition-shadow duration-200 hover:shadow-md card-hover-lift dark-card-border"
              >
                {/* Top Row: Date (left) + Sync (right) */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(inv.createdAt)}
                  </span>
                  <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => handleSyncClick(e, inv)}
                    className="touch-feedback"
                    title={inv.synced ? 'تمت المزامنة' : 'بانتظار المزامنة'}
                  >
                    {inv.synced ? (
                      <CheckCircle className="w-4.5 h-4.5 text-[#34C759]" />
                    ) : (
                      <XCircle className="w-4.5 h-4.5 text-[#FF3B30]" />
                    )}
                  </motion.button>
                  <AnimatePresence>
                    {syncTooltipId === inv.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 4 }}
                        className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                      >
                        <div className="bg-[#1c1c1e] dark:bg-gray-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                          {inv.synced
                            ? 'تمت مزامنة هذه الفاتورة بنجاح ✓'
                            : 'سيتم مزامنة هذه الفاتورة تلقائياً عند الاتصال بالإنترنت'}
                          <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-2.5 h-2.5 bg-[#1c1c1e] dark:bg-gray-700 rotate-45 rounded-sm" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                </div>

                {/* Client Info: Name aligned with avatar top, business name below */}
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#007AFF] to-[#0055D4] shadow-sm shadow-[#007AFF]/15 mt-[-2px]">
                    <span className="text-white font-bold text-xs">
                      {(inv.client?.name || 'ع').charAt(0)}
                    </span>
                    {inv.debtAmount > 0 && (
                      <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-[#FF3B30] rounded-full border-2 border-white dark:border-[#1c1c1e]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-[#1c1c1e] dark:text-white leading-tight">
                      {inv.client?.name || 'عميل'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {inv.client?.businessName && (
                        <span className="text-[11px] text-gray-400 truncate">
                          {inv.client.businessName}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500 font-medium shrink-0">
                        {inv.quantity} كرتون
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Discount/Debt/Credit (right) + Final Total (left) */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {inv.discountValue > 0 && (
                      <span className="text-[10px] bg-[#AF52DE]/10 text-[#AF52DE] px-2 py-0.5 rounded-md font-medium">
                        خصم: {inv.discountType === 'percentage' ? `${inv.discountValue}%` : formatCurrency(inv.discountValue)}
                      </span>
                    )}
                    {inv.debtAmount > 0 && (
                      <span className="text-[10px] bg-[#FF3B30]/8 rounded-md px-1.5 py-0.5 font-bold debt-gradient-text">
                        دين: {formatCurrency(inv.debtAmount)}
                      </span>
                    )}
                    {inv.creditAmount > 0 && (
                      <span className="text-[10px] text-white bg-gradient-to-l from-[#34C759] to-[#4CD964] px-2 py-0.5 rounded-md font-medium shadow-sm shadow-[#34C759]/20">
                        رصيد: +{formatCurrency(inv.creditAmount)}
                      </span>
                    )}
                    {inv.promotionQty > 0 && (
                      <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2 py-0.5 rounded-md font-medium">
                        دعاية: {inv.promotionQty} كرتون
                      </span>
                    )}
                  </div>
                  <p className="text-base font-extrabold text-[#1c1c1e] dark:text-white shrink-0">
                    {formatCurrency(inv.finalTotal)} <span className="text-[10px] font-normal text-gray-400">ر.س</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
