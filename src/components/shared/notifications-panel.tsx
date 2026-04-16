'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  CreditCard,
  ClipboardList,
  Settings,
  Trophy,
} from 'lucide-react';
import { playNotificationSound } from '@/lib/notification-sound';

// Enhanced type mapping with specific icons and colors
const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; bar: string; label: string }> = {
  invoice: { icon: FileText, color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10', bar: 'bg-[#007AFF]', label: 'فاتورة' },
  payment: { icon: CreditCard, color: 'text-[#34C759]', bg: 'bg-[#34C759]/10', bar: 'bg-[#34C759]', label: 'دفعة' },
  request: { icon: ClipboardList, color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10', bar: 'bg-[#FF9500]', label: 'طلب' },
  alert: { icon: AlertTriangle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', bar: 'bg-[#FF3B30]', label: 'تنبيه' },
  system: { icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100', bar: 'bg-gray-400', label: 'نظام' },
  achievement: { icon: Trophy, color: 'text-[#5856D6]', bg: 'bg-[#5856D6]/10', bar: 'bg-[#5856D6]', label: 'إنجاز' },
  // Legacy types mapped
  info: { icon: Info, color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10', bar: 'bg-[#007AFF]', label: 'معلومة' },
  success: { icon: CheckCircle, color: 'text-[#34C759]', bg: 'bg-[#34C759]/10', bar: 'bg-[#34C759]', label: 'نجاح' },
  warning: { icon: AlertTriangle, color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10', bar: 'bg-[#FF9500]', label: 'تحذير' },
  error: { icon: XCircle, color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', bar: 'bg-[#FF3B30]', label: 'خطأ' },
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
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

type DateGroup = 'today' | 'yesterday' | 'week' | 'older';

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  const dayOfWeek = startOfWeek.getDay() || 7;
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOfWeek) return 'week';
  return 'older';
}

const dateGroupLabels: Record<DateGroup, string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  week: 'هذا الأسبوع',
  older: 'أقدم',
};

const dateGroupOrder: DateGroup[] = ['today', 'yesterday', 'week', 'older'];

export function NotificationsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, notifications, setNotifications } = useAppStore();
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<DateGroup>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        // Play sound if new notifications arrived (not first load)
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
    setMarkingAll(true);
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      toast.success({ description: 'تم تحديد الكل كمقروء ✅' });
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteAllNotifications = async () => {
    if (!user) return;
    try {
      await fetch(`/api/notifications?userId=${user.id}`, {
        method: 'DELETE',
      });
      setNotifications([]);
      toast.success({ description: 'تم حذف جميع الإشعارات 🗑️' });
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/notifications?notificationId=${id}`, {
        method: 'DELETE',
      });
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<DateGroup, typeof notifications> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    notifications.forEach((notif) => {
      const group = getDateGroup(notif.createdAt);
      groups[group].push(notif);
    });

    return groups;
  }, [notifications]);

  const toggleGroup = (group: DateGroup) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md rounded-r-2xl p-0">
        <SheetHeader className="px-4 pt-6 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#007AFF]" />
              الإشعارات
              {unreadCount > 0 && (
                <span className="bg-[#007AFF] text-white text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-gray-500 hover:bg-gray-100 rounded-xl h-9 w-9 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={markingAll}
                  className="text-[#007AFF] hover:bg-[#007AFF]/10 rounded-xl h-8 text-xs gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  تحديد الكل كمقروء
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteAllNotifications}
                className="text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-xl h-8 text-xs gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف الكل
              </Button>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]" ref={scrollRef}>
          {/* Pull gesture indicator */}
          <div className="flex flex-col items-center py-3 gap-1">
            <motion.div
              className="w-10 h-1 bg-gray-300 rounded-full"
              animate={{ scaleX: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {refreshing && (
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin mt-1" />
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Bell className="w-12 h-12 opacity-30" />
              </div>
              <p className="font-semibold text-gray-500 text-base">لا توجد إشعارات</p>
              <p className="text-sm mt-1.5 text-gray-400 max-w-[240px] text-center leading-relaxed">
                ستظهر الإشعارات الجديدة هنا عند تلقي أي تحديث من الإدارة
              </p>
            </div>
          ) : (
            <div>
              <AnimatePresence>
                {dateGroupOrder.map((group) => {
                  const items = groupedNotifications[group];
                  if (items.length === 0) return null;
                  const isCollapsed = collapsedGroups.has(group);
                  const groupUnread = items.filter((n) => !n.isRead).length;

                  return (
                    <motion.div
                      key={group}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Date Group Header */}
                      <button
                        onClick={() => toggleGroup(group)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500">
                            {dateGroupLabels[group]}
                          </span>
                          <span className="text-[10px] text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded-full">
                            {items.length}
                          </span>
                          {groupUnread > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
                          )}
                        </div>
                        {isCollapsed ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {/* Notification Items */}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-gray-50">
                              {items.map((notif, i) => {
                                const config = getTypeConfig(notif.type);
                                const Icon = config.icon;
                                return (
                                  <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -40, height: 0, padding: 0, margin: 0 }}
                                    transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 30 }}
                                    layout
                                    className={`relative p-4 cursor-pointer transition-colors hover:bg-gray-50 ${!notif.isRead ? 'bg-[#007AFF]/[0.03]' : ''}`}
                                  >
                                    {/* Left colored accent bar */}
                                    <div className={`absolute right-0 top-3 bottom-3 w-[3px] rounded-l-full ${config.bar}`} />

                                    <div className="flex gap-3">
                                      <div className={`p-2 rounded-xl ${config.bg} shrink-0`}>
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                      </div>
                                      <div className="flex-1 min-w-0" onClick={() => !notif.isRead && markAsRead(notif.id)}>
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <h4 className="font-semibold text-sm">{notif.title}</h4>
                                            {/* Type badge */}
                                            <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                                              {config.label}
                                            </span>
                                          </div>
                                          {!notif.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-[#007AFF] shrink-0 mt-1.5 animate-badge-pulse" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                        <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                                          <Clock className="w-3 h-3" />
                                          {formatRelativeTime(notif.createdAt)}
                                        </div>
                                      </div>
                                      {/* Delete button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteNotification(notif.id);
                                        }}
                                        disabled={deletingId === notif.id}
                                        className="self-start p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#FF3B30] shrink-0"
                                      >
                                        {deletingId === notif.id ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
