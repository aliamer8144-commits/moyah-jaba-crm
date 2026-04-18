'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import {
  Phone,
  MessageCircle,
  StickyNote,
  Clock,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  call: {
    label: 'اتصال',
    icon: <Phone className="w-3.5 h-3.5" />,
    color: '#007AFF',
    bgColor: 'rgba(0,122,255,0.1)',
  },
  whatsapp: {
    label: 'واتساب',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    color: '#25D366',
    bgColor: 'rgba(37,211,102,0.1)',
  },
  note: {
    label: 'ملاحظة',
    icon: <StickyNote className="w-3.5 h-3.5" />,
    color: '#8E8E93',
    bgColor: 'rgba(142,142,147,0.1)',
  },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقائق`;
  if (diffHour < 24) return `منذ ${diffHour} ساعات`;
  if (diffDay < 7) return `منذ ${diffDay} أيام`;

  return date.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
  });
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

interface CallLogEntry {
  id: string;
  repId: string;
  clientId: string;
  type: string;
  duration: number | null;
  notes: string | null;
  createdAt: string;
}

interface CallLogProps {
  clientId: string;
}

export function CallLog({ clientId }: CallLogProps) {
  const { user } = useAppStore();
  const [logs, setLogs] = useState<CallLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/call-logs?repId=${user.id}&clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, clientId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleOpenDialog = (type: string) => {
    setDialogType(type);
    setNotes('');
    setDuration('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Notes require notes
    if (dialogType === 'note' && !notes.trim()) {
      toast.error('يرجى كتابة ملاحظات');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          clientId,
          type: dialogType,
          duration: dialogType === 'call' && duration ? parseInt(duration) : null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'حدث خطأ');
      }

      toast.success('تم تسجيل التواصل بنجاح');
      setDialogOpen(false);
      fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Phone className="w-4 h-4 text-[#007AFF]" />
        <h3 className="text-base font-bold">سجل التواصل</h3>
      </div>

      {/* Quick Action Buttons */}
      <div className="px-4 pb-3">
        <div className="flex gap-2">
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenDialog(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border"
              style={{
                backgroundColor: config.bgColor,
                borderColor: `${config.color}25`,
                color: config.color,
              }}
            >
              {config.icon}
              {config.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Call Logs List */}
      {loading ? (
        <div className="px-4 pb-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-6 text-center text-gray-400">
          <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لا يوجد سجل تواصل</p>
          <p className="text-xs mt-1">ابدأ بتسجيل تواصلك مع العميل</p>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {logs.map((log) => {
              const config = TYPE_CONFIG[log.type] || TYPE_CONFIG.note;
              return (
                <motion.div
                  key={log.id}
                  variants={fadeUp}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/50 transition-colors hover:bg-gray-50"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: config.bgColor, color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: config.bgColor, color: config.color }}
                      >
                        {config.label}
                      </span>
                      {log.type === 'call' && log.duration ? (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDuration(log.duration)}
                        </span>
                      ) : null}
                    </div>
                    {log.notes && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{log.notes}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Log Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {TYPE_CONFIG[dialogType] && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: TYPE_CONFIG[dialogType].bgColor,
                    color: TYPE_CONFIG[dialogType].color,
                  }}
                >
                  {TYPE_CONFIG[dialogType].icon}
                </div>
              )}
              تسجيل {TYPE_CONFIG[dialogType]?.label || ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Duration input for calls */}
            {dialogType === 'call' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  مدة الاتصال (بالثواني)
                  <span className="text-gray-400 font-normal mr-1">(اختياري)</span>
                </label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="مثال: 180"
                  className="bg-[#f2f2f7] rounded-xl border-0 focus:ring-2 ring-[#007AFF]/20"
                  dir="ltr"
                />
                <p className="text-[10px] text-gray-400">
                  مثال: 60 ثانية = دقيقة واحدة
                </p>
              </div>
            )}

            {/* Notes input */}
            {(dialogType === 'call' || dialogType === 'whatsapp') ? (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  ملاحظات
                  <span className="text-gray-400 font-normal mr-1">(اختياري)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف ملاحظات عن التواصل..."
                  className="w-full bg-[#f2f2f7] rounded-xl border-0 p-3 text-sm resize-none focus:ring-2 ring-[#007AFF]/20 min-h-[80px]"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  الملاحظات
                  <span className="text-[#FF3B30] mr-1">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب ملاحظاتك هنا..."
                  className="w-full bg-[#f2f2f7] rounded-xl border-0 p-3 text-sm resize-none focus:ring-2 ring-[#007AFF]/20 min-h-[100px]"
                  autoFocus
                />
                {!notes.trim() && (
                  <p className="text-[10px] text-[#FF3B30]">
                    هذا الحقل مطلوب
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="flex-1 h-11 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (dialogType === 'note' && !notes.trim())}
              className="flex-1 h-11 rounded-xl bg-[#007AFF] text-white font-semibold"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'تسجيل'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


