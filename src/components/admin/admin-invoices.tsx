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
  FileText,
  Search,
  Trash2,
  Eye,
  X,
  UserCircle,
  Calendar,
  Hash,
  Package,
  DollarSign,
  CreditCard,
  AlertCircle,
  Gift,
  Percent,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Wallet,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

interface InvoiceWithDetails {
  id: string;
  repId: string;
  clientId: string;
  productSize: string;
  quantity: number;
  price: number;
  total: number;
  discountType: string;
  discountValue: number;
  finalTotal: number;
  promotionQty: number;
  paidAmount: number;
  debtAmount: number;
  creditAmount: number;
  synced: boolean;
  createdAt: string;
  client?: { id: string; name: string };
  rep?: { id: string; name: string };
}

function formatCurrency(n: number) {
  return n.toLocaleString('ar-SA');
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminInvoices() {
  const { user } = useAppStore();
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRep, setFilterRep] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'debt'>('all');
  const [receiptDialog, setReceiptDialog] = useState<InvoiceWithDetails | null>(null);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptMethod, setReceiptMethod] = useState('نقدي');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ adminId: user.id });
      if (filterRep !== 'all') params.set('filterRepId', filterRep);
      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) setInvoices(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, filterRep]);

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
    fetchInvoices();
  }, [fetchInvoices]);

  const now = new Date();

  const filtered = invoices
    .filter((inv) => {
      // Search
      if (search) {
        const s = search.toLowerCase();
        const matchClient = inv.client?.name && inv.client.name.includes(s);
        const matchRep = inv.rep?.name && inv.rep.name.includes(s);
        const matchAmount = String(inv.finalTotal).includes(s);
        if (!matchClient && !matchRep && !matchAmount) return false;
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

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Summary stats
  const totalFiltered = filtered.reduce((s, i) => s + i.finalTotal, 0);
  const totalDebt = filtered.reduce((s, i) => s + i.debtAmount, 0);
  const totalPaid = filtered.reduce((s, i) => s + i.paidAmount, 0);

  const hasActiveFilters = dateFilter !== 'all' || statusFilter !== 'all';

  const handleOpenReceiptDialog = (inv: InvoiceWithDetails) => {
    setReceiptDialog(inv);
    setReceiptAmount(String(inv.debtAmount));
    setReceiptMethod('نقدي');
    setReceiptNotes('');
  };

  const handleSubmitReceipt = async () => {
    if (!receiptDialog || !user) return;
    const amount = parseFloat(receiptAmount);
    if (!amount || amount <= 0) {
      toast.error({ description: 'المبلغ يجب أن يكون أكبر من صفر' });
      return;
    }
    if (amount > receiptDialog.debtAmount) {
      toast.error({ description: 'المبلغ أكبر من الدين المستحق' });
      return;
    }
    setSubmittingReceipt(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          clientId: receiptDialog.clientId,
          amount,
          method: receiptMethod,
          notes: receiptNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error('حدث خطأ أثناء تسجيل الدفعة');
      toast.success({ description: 'تم تسجيل الدفعة بنجاح ✅' });
      setReceiptDialog(null);
      fetchInvoices();
    } catch (err) {
      toast.error({ description: err instanceof Error ? err.message : 'حدث خطأ' });
    } finally {
      setSubmittingReceipt(false);
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error({ description: 'لا توجد بيانات للتصدير' });
      return;
    }
    const BOM = '\uFEFF';
    const headers = ['رقم الفاتورة', 'المندوب', 'العميل', 'المنتج', 'الكمية', 'السعر', 'الإجمالي', 'الخصم', 'النهائي', 'المدفوع', 'الدين', 'التاريخ'];
    const rows = filtered.map((inv) => [
      inv.id.slice(-6).toUpperCase(),
      inv.rep?.name || '-',
      inv.client?.name || '-',
      `مياه جبأ - ${inv.productSize}`,
      String(inv.quantity),
      String(inv.price),
      String(inv.total),
      inv.discountType !== 'none' && inv.discountValue > 0
        ? inv.discountType === 'percentage'
          ? `${inv.discountValue}%`
          : String(inv.discountValue)
        : '0',
      String(inv.finalTotal),
      String(inv.paidAmount),
      String(inv.debtAmount),
      new Date(inv.createdAt).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    ]);
    const csvContent = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `invoices_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success({ description: `تم تصدير ${filtered.length} فاتورة بنجاح ✅` });
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !user) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices?invoiceId=${deleteConfirm}&adminId=${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success({ description: 'تم حذف الفاتورة بنجاح 🗑️' });
      setDeleteConfirm(null);
      if (selectedInvoice?.id === deleteConfirm) setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      toast.error({ description: err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف' });
    } finally {
      setDeleting(false);
    }
  };

  if (selectedInvoice) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">تفاصيل الفاتورة</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-l from-[#34C759] to-[#2DA44E] p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">فاتورة</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {selectedInvoice.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <p className="text-3xl font-bold">{selectedInvoice.finalTotal.toLocaleString('ar-SA')} ر.س</p>
            <p className="text-sm opacity-80 mt-1">
              {new Date(selectedInvoice.createdAt).toLocaleDateString('ar-SA', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex gap-3">
              <InfoRow icon={<UserCircle className="w-4 h-4 text-[#007AFF]" />} label="المندوب" value={selectedInvoice.rep?.name || '-'} />
              <InfoRow icon={<UserCircle className="w-4 h-4 text-[#34C759]" />} label="العميل" value={selectedInvoice.client?.name || '-'} />
            </div>

            <div className="h-px bg-gray-100" />

            <InfoRow icon={<Package className="w-4 h-4 text-gray-400" />} label="المنتج" value={`مياه جبأ - ${selectedInvoice.productSize}`} />
            <InfoRow icon={<Package className="w-4 h-4 text-gray-400" />} label="الكمية" value={`${selectedInvoice.quantity} كرتون`} />
            <InfoRow icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="سعر الوحدة" value={`${selectedInvoice.price.toLocaleString('ar-SA')} ر.س`} />
            <InfoRow icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="الإجمالي" value={`${selectedInvoice.total.toLocaleString('ar-SA')} ر.س`} />

            {selectedInvoice.discountType !== 'none' && selectedInvoice.discountValue > 0 && (
              <InfoRow icon={<Percent className="w-4 h-4 text-[#FF3B30]" />} label="الخصم" value={`-${selectedInvoice.discountValue.toLocaleString('ar-SA')} ر.س`} className="text-[#FF3B30]" />
            )}

            <InfoRow icon={<DollarSign className="w-4 h-4 text-[#34C759]" />} label="الإجمالي النهائي" value={`${selectedInvoice.finalTotal.toLocaleString('ar-SA')} ر.س`} bold />

            {selectedInvoice.promotionQty > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#FF9500] bg-[#FF9500]/5 px-3 py-2 rounded-lg">
                <Gift className="w-3.5 h-3.5" />
                دعاية: {selectedInvoice.promotionQty} كرتون مجاني
              </div>
            )}

            <div className="h-px bg-gray-100" />

            <InfoRow icon={<CreditCard className="w-4 h-4 text-[#34C759]" />} label="المدفوع" value={`${selectedInvoice.paidAmount.toLocaleString('ar-SA')} ر.س`} />
            {selectedInvoice.debtAmount > 0 && (
              <InfoRow icon={<AlertCircle className="w-4 h-4 text-[#FF3B30]" />} label="الدين" value={`${selectedInvoice.debtAmount.toLocaleString('ar-SA')} ر.س`} className="text-[#FF3B30]" />
            )}
            {selectedInvoice.creditAmount > 0 && (
              <InfoRow icon={<CreditCard className="w-4 h-4 text-[#007AFF]" />} label="إضافة للرصيد" value={`${selectedInvoice.creditAmount.toLocaleString('ar-SA')} ر.س`} className="text-[#007AFF]" />
            )}
          </div>
        </div>

        <Button
          onClick={() => { setDeleteConfirm(selectedInvoice.id); setSelectedInvoice(null); }}
          variant="outline"
          className="w-full h-11 rounded-2xl border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5 font-semibold"
        >
          <Trash2 className="w-4 h-4 ml-1.5" />
          حذف الفاتورة
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

  const statusFilters = [
    { id: 'all' as const, label: 'الكل' },
    { id: 'paid' as const, label: 'مدفوعة' },
    { id: 'debt' as const, label: 'عليها دين' },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold mb-3">إدارة الفواتير</h2>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="bg-white rounded-xl border-0 pr-10 h-10 shadow-sm" />
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
            onClick={handleExportCSV}
            variant="outline"
            className="h-10 px-3 rounded-xl shrink-0 border-0 bg-white shadow-sm text-[#34C759] hover:bg-[#34C759]/5 font-semibold text-sm gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>
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

              {/* Status Filter */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">الحالة</p>
                <div className="flex gap-1.5 flex-wrap">
                  {statusFilters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === f.id
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
                  onClick={() => { setDateFilter('all'); setStatusFilter('all'); }}
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
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">الإجمالي</p>
              <p className="text-sm font-bold text-[#1c1c1e]">{formatCurrency(totalFiltered)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">المدفوع</p>
              <p className="text-sm font-bold text-[#34C759]">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">الديون</p>
              <p className="text-sm font-bold text-[#FF3B30]">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">
            {search || hasActiveFilters ? 'لا توجد نتائج' : 'لا توجد فواتير'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); }}
              className="text-sm text-[#007AFF] font-medium mt-2"
            >
              مسح جميع الفلاتر
            </button>
          )}
        </div>
      ) : (
        <motion.div variants={fadeUp}>
          <p className="text-xs text-gray-500 mb-2">{filtered.length} فاتورة</p>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-right px-4 py-3 font-medium text-gray-500">المندوب</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">العميل</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">المنتج</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">الكمية</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">المبلغ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">المدفوع</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{inv.rep?.name || '-'}</td>
                      <td className="px-4 py-3">{inv.client?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(inv.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-[#FF9500]/10 text-[#FF9500] px-1.5 py-0.5 rounded-md font-medium">
                          {inv.productSize}
                        </span>
                      </td>
                      <td className="px-4 py-3">{inv.quantity}</td>
                      <td className="px-4 py-3 font-bold">{inv.finalTotal.toLocaleString('ar-SA')}</td>
                      <td className="px-4 py-3">{inv.paidAmount.toLocaleString('ar-SA')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {inv.debtAmount > 0 ? (
                            <span className="text-xs bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-0.5 rounded-lg">دين</span>
                          ) : (
                            <span className="text-xs bg-[#34C759]/10 text-[#34C759] px-2 py-0.5 rounded-lg">مدفوعة</span>
                          )}
                          {inv.discountValue > 0 && (
                            <span className="text-[10px] bg-[#AF52DE]/10 text-[#AF52DE] px-1.5 py-0.5 rounded-md">خصم</span>
                          )}
                          {inv.promotionQty > 0 && (
                            <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-1.5 py-0.5 rounded-md">دعاية</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg hover:bg-gray-100">
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          {inv.debtAmount > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); handleOpenReceiptDialog(inv); }} className="p-1.5 rounded-lg hover:bg-[#34C759]/5" title="تسجيل دفعة">
                              <Wallet className="w-3.5 h-3.5 text-[#34C759]" />
                            </button>
                          )}
                          <button onClick={() => setDeleteConfirm(inv.id)} className="p-1.5 rounded-lg hover:bg-[#FF3B30]/5">
                            <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((inv) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedInvoice(inv)}
                className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                      inv.debtAmount > 0
                        ? 'bg-gradient-to-br from-[#FF3B30] to-[#E6362C]'
                        : 'bg-gradient-to-br from-[#34C759] to-[#2DA44E]'
                    }`}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {inv.client?.name || '-'}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(inv.createdAt)}
                        </div>
                        <span className="text-[11px] text-gray-300">|</span>
                        <span className="text-[11px] text-gray-400">{inv.rep?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-bold">{formatCurrency(inv.finalTotal)}</p>
                      <p className="text-[11px] text-gray-400">{inv.quantity} كرتون</p>
                    </div>
                    <div className="shrink-0">
                      {inv.debtAmount > 0 ? (
                        <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-[#34C759]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {inv.productSize !== 'عادي' && (
                    <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2 py-0.5 rounded-md font-medium">
                      {inv.productSize}
                    </span>
                  )}
                  {inv.discountValue > 0 && (
                    <span className="text-[10px] bg-[#AF52DE]/10 text-[#AF52DE] px-2 py-0.5 rounded-md font-medium">
                      خصم: {inv.discountType === 'percentage' ? `${inv.discountValue}%` : formatCurrency(inv.discountValue)}
                    </span>
                  )}
                  {inv.promotionQty > 0 && (
                    <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2 py-0.5 rounded-md font-medium">
                      دعاية: {inv.promotionQty} كرتون
                    </span>
                  )}
                  {inv.debtAmount > 0 && (
                    <span className="text-[10px] bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-0.5 rounded-md font-medium">
                      دين: {formatCurrency(inv.debtAmount)}
                    </span>
                  )}
                  {inv.creditAmount > 0 && (
                    <span className="text-[10px] bg-[#34C759]/10 text-[#34C759] px-2 py-0.5 rounded-md font-medium">
                      رصيد: +{formatCurrency(inv.creditAmount)}
                    </span>
                  )}
                </div>

                {/* Quick Receipt Button on Mobile */}
                {inv.debtAmount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenReceiptDialog(inv); }}
                    className="w-full mt-2.5 py-2 rounded-xl bg-[#34C759]/5 text-[#34C759] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#34C759]/10 transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    تسجيل دفعة
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Receipt Dialog */}
      <Dialog open={!!receiptDialog} onOpenChange={(open) => { if (!open) setReceiptDialog(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#34C759]" />
              تسجيل دفعة
            </DialogTitle>
            <DialogDescription>تسجيل دفعة على الفاتورة</DialogDescription>
          </DialogHeader>
          {receiptDialog && (
            <div className="space-y-4">
              {/* Invoice Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">رقم الفاتورة</span>
                  <span className="text-xs font-bold">{receiptDialog.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">العميل</span>
                  <span className="text-xs font-semibold">{receiptDialog.client?.name || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">الدين المستحق</span>
                  <span className="text-xs font-bold text-[#FF3B30]">{formatCurrency(receiptDialog.debtAmount)} ر.س</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <Label className="text-xs">المبلغ</Label>
                <Input
                  type="number"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="rounded-xl h-11"
                  max={receiptDialog.debtAmount}
                  min={1}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-xs">طريقة الدفع</Label>
                <Select value={receiptMethod} onValueChange={setReceiptMethod}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="تحويل">تحويل</SelectItem>
                    <SelectItem value="شيك">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات (اختياري)</Label>
                <Textarea
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  className="rounded-xl min-h-[60px] resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmitReceipt}
                disabled={submittingReceipt || !receiptAmount || parseFloat(receiptAmount) <= 0}
                className="w-full h-11 rounded-xl bg-[#34C759] hover:bg-[#34C759]/90 font-semibold"
              >
                {submittingReceipt ? (
                  <><Loader2 className="w-4 h-4 animate-spin ml-1.5" /> جارٍ التسجيل...</>
                ) : (
                  <><Wallet className="w-4 h-4 ml-1.5" /> تسجيل الدفعة</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الفاتورة واسترجاع المخزون. هل أنت متأكد؟
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
