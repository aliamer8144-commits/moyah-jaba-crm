'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Zap,
  UtensilsCrossed,
  Wrench,
  Phone,
  MoreHorizontal,
  Plus,
  Trash2,
  Receipt,
  TrendingDown,
  CalendarDays,
  Filter,
} from 'lucide-react';
import { ExpenseForm } from './expense-form';
import { SarIcon } from '@/components/shared/sar-icon';

interface Expense {
  id: string;
  repId: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  createdAt: string;
}

const categories = [
  { id: 'all', label: 'الكل', icon: Filter, color: '#007AFF' },
  { id: 'fuel', label: 'وقود', icon: Zap, color: '#FF9500' },
  { id: 'food', label: 'طعام', icon: UtensilsCrossed, color: '#34C759' },
  { id: 'maintenance', label: 'صيانة', icon: Wrench, color: '#AF52DE' },
  { id: 'phone', label: 'هاتف', icon: Phone, color: '#007AFF' },
  { id: 'other', label: 'أخرى', icon: MoreHorizontal, color: '#8E8E93' },
];

const dateFilters = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر' },
];

const categoryLabels: Record<string, string> = {
  fuel: 'وقود',
  food: 'طعام',
  maintenance: 'صيانة',
  phone: 'هاتف',
  other: 'أخرى',
};

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'fuel': return Zap;
    case 'food': return UtensilsCrossed;
    case 'maintenance': return Wrench;
    case 'phone': return Phone;
    default: return MoreHorizontal;
  }
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case 'fuel': return '#FF9500';
    case 'food': return '#34C759';
    case 'maintenance': return '#AF52DE';
    case 'phone': return '#007AFF';
    default: return '#8E8E93';
  }
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
  });
}

function getDateRange(filter: string) {
  const now = new Date();
  const start = new Date();

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return {
        from: start.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return {
        from: start.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    }
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return {
        from: start.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    default:
      return null;
  }
}

export function ExpenseTracker() {
  const { user } = useAppStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const range = getDateRange(dateFilter);
      let url = `/api/expenses?repId=${user.id}`;
      if (range) {
        url += `&from=${range.from}&to=${range.to}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, dateFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  // Calculate totals
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  const todayTotal = expenses
    .filter((e) => e.date && e.date.startsWith(todayStr))
    .reduce((sum, e) => sum + e.amount, 0);

  const monthTotal = expenses
    .filter((e) => e.date && e.date >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDelete = async (expense: Expense) => {
    if (deletingId) return;
    setDeletingId(expense.id);
    try {
      const res = await fetch(`/api/expenses?expenseId=${expense.id}&repId=${user!.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('تم حذف المصروف بنجاح 🗑️');
        fetchExpenses();
      } else {
        toast.error('فشل في حذف المصروف');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        {/* Page Title */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF3B30]/10 to-[#FF453A]/5 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-[#FF3B30]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1c1c1e]">المصروفات</h2>
            <p className="text-xs text-gray-500">تتبع مصروفاتك اليومية</p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-[#FF3B30]/5 to-white rounded-2xl p-4 shadow-sm border border-[#FF3B30]/10">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-xs text-gray-500">مصروفات اليوم</span>
            </div>
            <p className="text-xl font-bold text-[#FF3B30]">{todayTotal.toLocaleString('ar-SA')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5"><SarIcon size={10} /></p>
          </div>
          <div className="bg-gradient-to-br from-[#FF9500]/5 to-white rounded-2xl p-4 shadow-sm border border-[#FF9500]/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-[#FF9500]" />
              <span className="text-xs text-gray-500">هذا الشهر</span>
            </div>
            <p className="text-xl font-bold text-[#FF9500]">{monthTotal.toLocaleString('ar-SA')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5"><SarIcon size={10} /></p>
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div variants={fadeUp}>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {categories.map((cat) => {
              const isActive = categoryFilter === cat.id;
              const Icon = cat.icon;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200/50'
                  }`}
                  style={isActive ? { backgroundColor: cat.color } : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Date Range Filter */}
        <motion.div variants={fadeUp}>
          <div className="flex gap-1 bg-[#f2f2f7] rounded-xl p-0.5">
            {dateFilters.map((df) => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  dateFilter === df.id
                    ? 'bg-white text-[#1c1c1e] shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filtered Total */}
        {filteredExpenses.length > 0 && (
          <motion.div variants={fadeUp} className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500">
              {filteredExpenses.length} مصروف
            </span>
            <span className="text-sm font-bold text-[#FF3B30]">
              الإجمالي: {filteredTotal.toLocaleString('ar-SA')} <SarIcon className="inline" size={10} />
            </span>
          </motion.div>
        )}

        {/* Expense List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
                      <div className="h-2.5 bg-gray-50 rounded w-32 animate-pulse" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded w-16 animate-pulse" />
                  </div>
                </motion.div>
              ))
            ) : filteredExpenses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-8 shadow-sm text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF3B30]/10 to-[#FF9500]/5 flex items-center justify-center">
                  <Receipt className="w-10 h-10 text-[#FF3B30]/40" />
                </div>
                <h3 className="text-base font-bold text-[#1c1c1e] mb-1">لا توجد مصروفات</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {categoryFilter !== 'all'
                    ? `لا توجد مصروفات في فئة "${categoryLabels[categoryFilter]}"`
                    : 'ابدأ بتسجيل مصروفاتك اليومية'}
                </p>
                <button
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] text-white rounded-xl text-sm font-medium shadow-sm shadow-[#007AFF]/20 hover:bg-[#0066DD] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مصروف
                </button>
              </motion.div>
            ) : (
              filteredExpenses.map((expense, index) => {
                const CatIcon = getCategoryIcon(expense.category);
                const catColor = getCategoryColor(expense.category);
                return (
                  <motion.div
                    key={expense.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ y: -1 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Category Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${catColor}12` }}
                      >
                        <CatIcon className="w-5 h-5" style={{ color: catColor }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${catColor}12`, color: catColor }}
                          >
                            {categoryLabels[expense.category] || expense.category}
                          </span>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-[#1c1c1e] font-medium truncate">
                            {expense.description}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(expense.date)}
                        </p>
                      </div>

                      {/* Amount + Delete */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <p className="text-base font-bold text-[#FF3B30]">
                          -{expense.amount.toLocaleString('ar-SA')}
                          <SarIcon className="text-gray-400 mr-0.5" size={10} />
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(expense);
                          }}
                          disabled={deletingId === expense.id}
                          className="opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                        >
                          {deletingId === expense.id ? (
                            <div className="w-4 h-4 border-2 border-[#FF3B30]/30 border-t-[#FF3B30] rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]/60" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* FAB - Add Expense */}
      {!loading && expenses.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setFormOpen(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] text-white shadow-lg shadow-[#007AFF]/30 flex items-center justify-center animate-fab-glow"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Expense Form Dialog */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          fetchExpenses();
          setFormOpen(false);
        }}
      />
    </div>
  );
}
