'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, RequestItem } from '@/lib/store';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function RequestSkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-3 w-16 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-lg" />
      </div>
      <Skeleton className="h-16 rounded-xl" />
    </div>
  );
}

export function MyRequests() {
  const { user, setRepTab } = useAppStore();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/requests?repId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = activeFilter === 'all' ? requests : requests.filter((r) => r.status === activeFilter);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
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

  const typeLabel = (type: string, entityType: string) => {
    const t = type === 'edit' ? 'تعديل' : 'حذف';
    const e = entityType === 'client' ? 'عميل' : 'فاتورة';
    return `${t} ${e}`;
  };

  const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle; label: string }> = {
    pending: { color: '#FF9500', bg: '#FF9500/10', icon: Clock, label: 'معلق' },
    approved: { color: '#34C759', bg: '#34C759/10', icon: CheckCircle, label: 'تمت الموافقة' },
    rejected: { color: '#FF3B30', bg: '#FF3B30/10', icon: XCircle, label: 'مرفوض' },
  };

  const filters: { id: StatusFilter; label: string; color: string }[] = [
    { id: 'all', label: 'الكل', color: '#007AFF' },
    { id: 'pending', label: 'معلق', color: '#FF9500' },
    { id: 'approved', label: 'موافق', color: '#34C759' },
    { id: 'rejected', label: 'مرفوض', color: '#FF3B30' },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="p-4 space-y-4">
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold px-1 mb-3">طلباتي</h2>

        {/* Filter Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex-1 h-9 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                activeFilter === f.id
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              style={activeFilter === f.id ? { backgroundColor: f.color } : {}}
            >
              {f.label}
              {counts[f.id] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.id ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {counts[f.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <RequestSkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ClipboardList className="w-10 h-10 opacity-40" />
          </div>
          <p className="font-medium text-gray-600 text-base">
            {activeFilter === 'all' ? 'لا توجد طلبات بعد' : 'لا توجد طلبات في هذا القسم'}
          </p>
          {activeFilter === 'all' ? (
            <>
              <p className="text-sm mt-1 text-gray-400">طلبات التعديل والحذف ستظهر هنا</p>
              <Button
                onClick={() => setRepTab('clients')}
                className="mt-4 h-11 px-6 rounded-2xl bg-[#007AFF] text-white font-semibold gap-2"
              >
                <Plus className="w-4 h-4" />
                إنشاء طلب
              </Button>
            </>
          ) : (
            <p className="text-sm mt-1">جرّب تغيير الفلتر لرؤية طلبات أخرى</p>
          )}
        </div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((req) => {
              const sc = statusConfig[req.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: sc.bg }}
                      >
                        <StatusIcon className="w-4.5 h-4.5" style={{ color: sc.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{typeLabel(req.type, req.entityType)}</h3>
                        <p className="text-[11px] text-gray-400">{formatTime(req.createdAt)}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] rounded-lg"
                      style={{ borderColor: sc.color, color: sc.color }}
                    >
                      {sc.label}
                    </Badge>
                  </div>

                  {/* Reason */}
                  <div className="flex items-start gap-2 mb-3 bg-[#f2f2f7] rounded-xl p-3">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600 leading-relaxed">{req.reason}</p>
                  </div>

                  {/* Admin Note */}
                  {req.adminNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-start gap-2 bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl p-3"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-[#FF9500] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">ملاحظة الإدارة</p>
                        <p className="text-sm text-gray-700">{req.adminNote}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Rejected - submit again hint */}
                  {req.status === 'rejected' && !req.adminNote && (
                    <div className="flex items-start gap-2 bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-xl p-3">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#FF3B30]">تم رفض هذا الطلب</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
