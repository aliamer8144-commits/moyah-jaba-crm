'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Bell,
  CheckCheck,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  FileText,
  CreditCard,
  ClipboardList,
  Settings,
  Trophy,
} from 'lucide-react';
import { playNotificationSound } from '@/lib/notification-sound';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  invoice: { icon: FileText, color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10', label: 'فاتورة' },
  payment: { icon: CreditCard, color: 'text-[#34C759]', bg: 'bg-[#34C759]/10', label: 'دفعة' },
  request: { icon: ClipboardList, color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10', label: 'طلب' },
  alert: { icon: AlertTriangle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', label: 'تنبيه' },
  system: { icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100', label: 'نظام' },
  achievement: { icon: Trophy, color: 'text-[#5856D6]', bg: 'bg-[#5856D6]/10', label: 'إنجاز' },
  info: { icon: Info, color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10', label: 'معلومة' },
  success: { icon: CheckCircle, color: 'text-[#34C759]', bg: 'bg-[#34C759]/10', label: 'نجاح' },
  warning: { icon: AlertTriangle, color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10', label: 'تحذير' },
  error: { icon: XCircle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', label: 'خطأ' },
};

function getTypeConfig(type: string) {
  return typeConfig[type] || typeConfig.info;
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  if (hours < 24) return `منذ ${hours} س`;
  if (days < 7) return `منذ ${days} يوم`;
  return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

export function NotificationsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, notifications, setNotifications } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (!isFirstLoad.current && data.length > prevCountRef.current) {
          playNotificationSound();
        }
        isFirstLoad.current = false;
        prevCountRef.current = data.length;
        setNotifications(data);
      }
    } catch {
      // silent
    }
  }, [user, setNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onOpenChange]);

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // silent
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      toast.success('تم تحديد الكل كمقروء');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?notificationId=${id}`, { method: 'DELETE' });
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch {
      // silent
    }
  };

  const displayNotifications = notifications.slice(0, 8);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-14 left-3 right-3 sm:left-auto sm:right-14 sm:w-[380px] z-50 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.05)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">الإشعارات</h3>
                {unreadCount > 0 && (
                  <span className="bg-[#007AFF] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-[#007AFF] font-medium hover:bg-[#007AFF]/5 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  تحديد الكل
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 opacity-30" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">لا توجد إشعارات</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {displayNotifications.map((notif) => {
                    const config = getTypeConfig(notif.type);
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                        className={`relative flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-b-0 ${
                          notif.isRead
                            ? 'hover:bg-gray-50/80 dark:hover:bg-gray-800/30'
                            : 'bg-[#007AFF]/[0.02] hover:bg-[#007AFF]/[0.04]'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-[13px] font-semibold text-[#1c1c1e] dark:text-white truncate">{notif.title}</h4>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-[#007AFF] shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        {/* Swipe delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="self-center p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-300 hover:text-[#FF3B30] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          style={{ opacity: undefined }}
                          aria-label="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}

              {/* Show more indicator */}
              {notifications.length > 8 && (
                <div className="px-4 py-2.5 text-center border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] text-gray-400">
                    +{notifications.length - 8} إشعارات أخرى
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
