'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, RequestItem } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  UserCircle,
  MessageSquare,
  Loader2,
  AlertTriangle,
  CheckCheck,
  X,
} from 'lucide-react';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

type StatusFilter = 'pending' | 'approved' | 'rejected';

export function RequestManagement() {
  const { user } = useAppStore();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusFilter>('pending');
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Batch operation state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<'approve-all' | 'reject-all' | 'approve-selected' | 'reject-selected' | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchRejectNote, setBatchRejectNote] = useState('');
  const [batchRejectDialog, setBatchRejectDialog] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/requests?adminId=${user.id}`);
      if (res.ok) setRequests(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = requests.filter((r) => r.status === activeTab);
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const counts = {
    pending: pendingRequests.length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  // Reset selections when tab changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map((r) => r.id)));
    }
  };

  const handleApprove = async () => {
    if (!approveConfirm || !user) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          requestId: approveConfirm,
          status: 'approved',
          adminNote: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success('تمت الموافقة على الطلب');
      setApproveConfirm(null);
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !user) return;
    if (!rejectNote.trim()) {
      toast.error('يرجى إدخال سبب الرفض');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          requestId: rejectDialog,
          status: 'rejected',
          adminNote: rejectNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success('تم رفض الطلب');
      setRejectDialog(null);
      setRejectNote('');
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  // Batch operations
  const getBatchIds = (): string[] => {
    switch (batchAction) {
      case 'approve-all':
      case 'reject-all':
        return pendingRequests.map((r) => r.id);
      case 'approve-selected':
      case 'reject-selected':
        return Array.from(selectedIds);
      default:
        return [];
    }
  };

  const handleBatchApproveConfirm = async () => {
    if (!user || !batchAction) return;
    const ids = getBatchIds();
    if (ids.length === 0) return;

    setBatchProcessing(true);
    const total = ids.length;
    let success = 0;
    let failed = 0;

    try {
      const promises = ids.map(async (id) => {
        try {
          const res = await fetch('/api/requests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminId: user.id,
              requestId: id,
              status: 'approved',
              adminNote: '',
            }),
          });
          if (res.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      });

      await Promise.all(promises);
      toast.success(`تمت الموافقة على ${success} طلب بنجاح${failed > 0 ? ` (${failed} فشل)` : ''}`);
      setBatchAction(null);
      setSelectedIds(new Set());
      fetchRequests();
    } catch {
      toast.error('حدث خطأ أثناء المعالجة');
    } finally {
      setBatchProcessing(false);
    }
  };

  const openBatchRejectDialog = () => {
    setBatchRejectDialog(true);
  };

  const handleBatchRejectConfirm = async () => {
    if (!user || !batchAction) return;
    if (!batchRejectNote.trim()) {
      toast.error('يرجى إدخال سبب الرفض');
      return;
    }
    const ids = getBatchIds();
    if (ids.length === 0) return;

    setBatchProcessing(true);
    const total = ids.length;
    let success = 0;
    let failed = 0;

    try {
      const promises = ids.map(async (id) => {
        try {
          const res = await fetch('/api/requests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminId: user.id,
              requestId: id,
              status: 'rejected',
              adminNote: batchRejectNote.trim(),
            }),
          });
          if (res.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      });

      await Promise.all(promises);
      toast.success(`تم رفض ${success} طلب بنجاح${failed > 0 ? ` (${failed} فشل)` : ''}`);
      setBatchAction(null);
      setBatchRejectNote('');
      setBatchRejectDialog(false);
      setSelectedIds(new Set());
      fetchRequests();
    } catch {
      toast.error('حدث خطأ أثناء المعالجة');
    } finally {
      setBatchProcessing(false);
    }
  };

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

  const tabs: { id: StatusFilter; label: string; color: string }[] = [
    { id: 'pending', label: 'معلق', color: '#FF9500' },
    { id: 'approved', label: 'موافق عليه', color: '#34C759' },
    { id: 'rejected', label: 'مرفوض', color: '#FF3B30' },
  ];

  const typeLabel = (type: string, entityType: string) => {
    const t = type === 'edit' ? 'تعديل' : 'حذف';
    const e = entityType === 'client' ? 'عميل' : 'فاتورة';
    return `${t} ${e}`;
  };

  const batchActionLabel = batchAction === 'approve-all' || batchAction === 'approve-selected'
    ? 'موافقة'
    : 'رفض';
  const batchCount = getBatchIds().length;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold mb-3">إدارة الطلبات</h2>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 h-9 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={activeTab === tab.id ? { backgroundColor: tab.color } : {}}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Batch Actions Bar - only in pending tab */}
      {activeTab === 'pending' && pendingRequests.length > 0 && !loading && (
        <motion.div variants={fadeUp}>
          {/* Select All + Quick Batch Buttons */}
          <div className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === pendingRequests.length && pendingRequests.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="rounded-lg border-gray-300 data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]"
                />
                <span className="text-sm font-medium text-gray-600">
                  تحديد الكل ({pendingRequests.length})
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button
                  onClick={() => setBatchAction('approve-all')}
                  size="sm"
                  className="h-8 px-3 rounded-xl bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/20 font-semibold text-xs gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  موافقة على الكل
                </Button>
                <Button
                  onClick={() => setBatchAction('reject-all')}
                  size="sm"
                  className="h-8 px-3 rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 font-semibold text-xs gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  رفض الكل
                </Button>
              </div>
            </div>

            {/* Selected actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-[#007AFF]/5 rounded-xl px-3 py-2">
                <span className="text-xs font-medium text-[#007AFF]">
                  تم تحديد {selectedIds.size} طلب
                </span>
                <div className="flex gap-1.5">
                  <Button
                    onClick={() => setBatchAction('approve-selected')}
                    size="sm"
                    className="h-7 px-3 rounded-lg bg-[#34C759] text-white hover:bg-[#34C759]/90 font-semibold text-xs gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    موافقة على المحدد
                  </Button>
                  <Button
                    onClick={() => setBatchAction('reject-selected')}
                    size="sm"
                    className="h-7 px-3 rounded-lg bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90 font-semibold text-xs gap-1"
                  >
                    <X className="w-3 h-3" />
                    رفض المحدد
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">
            {activeTab === 'pending' ? 'لا توجد طلبات معلقة' : 'لا توجد طلبات'}
          </p>
        </div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((req) => {
              const isSelected = selectedIds.has(req.id);
              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-2xl p-4 shadow-sm transition-all ${
                    activeTab === 'pending' && isSelected
                      ? 'ring-2 ring-[#007AFF] border-[#007AFF]'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Checkbox for pending */}
                      {activeTab === 'pending' && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(req.id)}
                          className="rounded-lg border-gray-300 data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF] shrink-0"
                        />
                      )}
                      <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{req.rep?.name || 'مندوب'}</h3>
                        <p className="text-xs text-gray-500">{formatTime(req.createdAt)}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        activeTab === 'pending'
                          ? 'border-[#FF9500] text-[#FF9500]'
                          : activeTab === 'approved'
                          ? 'border-[#34C759] text-[#34C759]'
                          : 'border-[#FF3B30] text-[#FF3B30]'
                      }`}
                    >
                      {typeLabel(req.type, req.entityType)}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-2 mb-3 bg-gray-50 rounded-xl p-3">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600">{req.reason}</p>
                  </div>

                  {activeTab === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setApproveConfirm(req.id)}
                        className="flex-1 h-10 rounded-xl bg-[#34C759] text-white font-semibold text-sm hover:bg-[#34C759]/90"
                      >
                        <CheckCircle className="w-4 h-4 ml-1.5" />
                        موافقة
                      </Button>
                      <Button
                        onClick={() => setRejectDialog(req.id)}
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5 font-semibold text-sm"
                      >
                        <XCircle className="w-4 h-4 ml-1.5" />
                        رفض
                      </Button>
                    </div>
                  ) : req.adminNote ? (
                    <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                      <AlertTriangle className="w-4 h-4 text-[#FF9500] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">ملاحظة المسؤول:</p>
                        <p className="text-sm text-gray-700">{req.adminNote}</p>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Single Approve Confirmation */}
      <AlertDialog open={!!approveConfirm && !batchAction} onOpenChange={() => setApproveConfirm(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الموافقة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من الموافقة على هذا الطلب؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={processing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={processing} className="rounded-xl bg-[#34C759] hover:bg-[#34C759]/90">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'موافقة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Reject Dialog */}
      <Dialog open={!!rejectDialog && !batchAction} onOpenChange={(o) => { if (!o) { setRejectDialog(null); setRejectNote(''); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">سبب الرفض</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm">أدخل سبب الرفض <span className="text-[#FF3B30]">*</span></Label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="اكتب سبب الرفض هنا..."
              className="mt-2 w-full bg-[#f2f2f7] rounded-xl border-0 focus:ring-2 ring-[#007AFF]/20 p-3 text-sm resize-none min-h-[100px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectNote(''); }} className="rounded-2xl flex-1" disabled={processing}>
              إلغاء
            </Button>
            <Button onClick={handleReject} disabled={processing || !rejectNote.trim()} className="rounded-2xl flex-1 bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Approve Confirmation */}
      <AlertDialog open={batchAction === 'approve-all' || batchAction === 'approve-selected'} onOpenChange={(o) => { if (!o) setBatchAction(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الموافقة الجماعية</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم الموافقة على <strong>{batchCount}</strong> طلب. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={batchProcessing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchApproveConfirm} disabled={batchProcessing} className="rounded-xl bg-[#34C759] hover:bg-[#34C759]/90">
              {batchProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ المعالجة...</span>
                </div>
              ) : (
                `موافقة على ${batchCount}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Reject - Step 1: Confirmation */}
      <AlertDialog
        open={(batchAction === 'reject-all' || batchAction === 'reject-selected') && !batchRejectDialog}
        onOpenChange={(o) => { if (!o) setBatchAction(null); }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الرفض الجماعي</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم رفض <strong>{batchCount}</strong> طلب. سيُطلب منك إدخال سبب الرفض.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={batchProcessing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={openBatchRejectDialog} className="rounded-xl bg-[#FF3B30] hover:bg-[#FF3B30]/90">
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Reject - Step 2: Reason Dialog */}
      <Dialog open={batchRejectDialog} onOpenChange={(o) => { if (!o) { setBatchRejectDialog(false); setBatchRejectNote(''); setBatchAction(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">سبب الرفض الجماعي</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">سيتم تطبيق نفس السبب على {batchCount} طلب</p>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm">أدخل سبب الرفض <span className="text-[#FF3B30]">*</span></Label>
            <textarea
              value={batchRejectNote}
              onChange={(e) => setBatchRejectNote(e.target.value)}
              placeholder="اكتب سبب الرفض هنا..."
              className="mt-2 w-full bg-[#f2f2f7] rounded-xl border-0 focus:ring-2 ring-[#007AFF]/20 p-3 text-sm resize-none min-h-[100px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBatchRejectDialog(false); setBatchRejectNote(''); setBatchAction(null); }} className="rounded-2xl flex-1" disabled={batchProcessing}>
              إلغاء
            </Button>
            <Button onClick={handleBatchRejectConfirm} disabled={batchProcessing || !batchRejectNote.trim()} className="rounded-2xl flex-1 bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90">
              {batchProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ المعالجة...</span>
                </div>
              ) : (
                `رفض ${batchCount} طلب`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
