'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, User } from '@/lib/store';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Send,
  Radio,
  UserPlus,
  Loader2,
  AlertTriangle,
  Info,
  Trophy,
  Settings,
  ChevronDown,
} from 'lucide-react';

const notificationTypes = [
  { id: 'alert', label: 'تنبيه', icon: AlertTriangle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', activeBg: 'bg-[#FF3B30]', borderColor: 'border-[#FF3B30]/30' },
  { id: 'info', label: 'معلومة', icon: Info, color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10', activeBg: 'bg-[#007AFF]', borderColor: 'border-[#007AFF]/30' },
  { id: 'achievement', label: 'إنجاز', icon: Trophy, color: 'text-[#5856D6]', bg: 'bg-[#5856D6]/10', activeBg: 'bg-[#5856D6]', borderColor: 'border-[#5856D6]/30' },
  { id: 'system', label: 'نظام', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100', activeBg: 'bg-gray-600', borderColor: 'border-gray-300' },
];

export function NotificationComposer() {
  const { user } = useAppStore();
  const [mode, setMode] = useState<'broadcast' | 'targeted'>('broadcast');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [targetRepId, setTargetRepId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [reps, setReps] = useState<User[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const fetchReps = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/reps?adminId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setReps(data.filter((r: User) => r.isActive));
      }
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  const selectedRep = reps.find((r) => r.id === targetRepId);

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      toast.error('عنوان الإشعار مطلوب');
      return;
    }
    if (!body.trim()) {
      toast.error('محتوى الإشعار مطلوب');
      return;
    }
    if (mode === 'targeted' && !targetRepId) {
      toast.error('يرجى اختيار المندوب');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          targetRepId: mode === 'targeted' ? targetRepId : undefined,
          title: title.trim(),
          body: body.trim(),
          type,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const modeLabel = mode === 'broadcast' ? `تم بث الإشعار لـ ${data.targetCount} مندوب` : 'تم إرسال الإشعار بنجاح';
        toast.success(modeLabel);
        setTitle('');
        setBody('');
        setTargetRepId('');
        setShowTargetDropdown(false);
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeConfig = notificationTypes.find((t) => t.id === type) || notificationTypes[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-800/50 overflow-hidden"
    >
      {/* Header - Collapsible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-sm shadow-[#007AFF]/20">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">مؤلف الإشعارات</h3>
            <p className="text-[10px] text-gray-400">إرسال إشعارات للمناديب</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('broadcast')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    mode === 'broadcast'
                      ? 'bg-gradient-to-l from-[#007AFF] to-[#5856D6] text-white shadow-md shadow-[#007AFF]/20'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  إرسال للجميع
                </button>
                <button
                  onClick={() => setMode('targeted')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    mode === 'targeted'
                      ? 'bg-gradient-to-l from-[#007AFF] to-[#5856D6] text-white shadow-md shadow-[#007AFF]/20'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  إرسال لمندوب
                </button>
              </div>

              {/* Target Rep Dropdown */}
              <AnimatePresence>
                {mode === 'targeted' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">اختر المندوب</label>
                    <button
                      onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all duration-200 ${
                        targetRepId
                          ? 'border-[#007AFF]/30 bg-[#007AFF]/5 text-[#1c1c1e] dark:text-white'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400'
                      }`}
                    >
                      <span className="font-medium">
                        {selectedRep ? selectedRep.name : 'اختر مندوب...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTargetDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showTargetDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto"
                        >
                          {reps.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">لا يوجد مناديب</p>
                          ) : (
                            reps.map((rep) => (
                              <button
                                key={rep.id}
                                onClick={() => {
                                  setTargetRepId(rep.id);
                                  setShowTargetDropdown(false);
                                }}
                                className={`w-full text-right px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                  rep.id === targetRepId ? 'bg-[#007AFF]/5 text-[#007AFF] font-medium' : 'text-[#1c1c1e] dark:text-white'
                                }`}
                              >
                                {rep.name}
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Title Input */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">العنوان</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان الإشعار"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl h-10 text-sm focus:ring-2 focus:ring-[#007AFF]/20 dark:text-white dark:placeholder:text-gray-500"
                  maxLength={100}
                />
              </div>

              {/* Body Textarea */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">المحتوى</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="نص الإشعار..."
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#007AFF]/20 dark:text-white dark:placeholder:text-gray-500"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] ${body.length > 450 ? 'text-[#FF3B30]' : 'text-gray-400'}`}>
                    {body.length}/500
                  </span>
                </div>
              </div>

              {/* Type Selector */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">نوع الإشعار</label>
                <div className="flex gap-2">
                  {notificationTypes.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-medium transition-all duration-200 border ${
                          type === t.id
                            ? `${t.activeBg} text-white border-transparent shadow-sm`
                            : `${t.bg} ${t.color} ${t.borderColor}`
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className={`w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 ${
                  type === 'alert' ? 'bg-gradient-to-l from-[#FF3B30] to-[#FF6961] shadow-md shadow-[#FF3B30]/20' :
                  type === 'achievement' ? 'bg-gradient-to-l from-[#5856D6] to-[#AF52DE] shadow-md shadow-[#5856D6]/20' :
                  type === 'system' ? 'bg-gradient-to-l from-gray-600 to-gray-700 shadow-md shadow-gray-600/20' :
                  'bg-gradient-to-l from-[#007AFF] to-[#5856D6] shadow-md shadow-[#007AFF]/20'
                } disabled:opacity-50`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارِ الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {mode === 'broadcast' ? 'بث الإشعار' : 'إرسال الإشعار'}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
