'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  User,
  Clock,
  FileText,
  Users,
  Receipt,
  Loader2,
} from 'lucide-react';
import { NotificationComposer } from './notification-composer';

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

interface NotificationWithUser {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

function getNotifIcon(type: string) {
  switch (type) {
    case 'success': return <CheckCircle className="w-4 h-4 text-[#34C759]" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-[#FF9500]" />;
    case 'error': return <XCircle className="w-4 h-4 text-[#FF3B30]" />;
    default: return <Info className="w-4 h-4 text-[#007AFF]" />;
  }
}

function getNotifColor(type: string) {
  switch (type) {
    case 'success': return 'bg-[#34C759]/10 border-[#34C759]/20';
    case 'warning': return 'bg-[#FF9500]/10 border-[#FF9500]/20';
    case 'error': return 'bg-[#FF3B30]/10 border-[#FF3B30]/20';
    default: return 'bg-[#007AFF]/10 border-[#007AFF]/20';
  }
}

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type FilterType = 'all' | 'unread' | 'info' | 'success' | 'warning' | 'error';

export function AdminNotifications() {
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [processing, setProcessing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?adminId=${user.id}&all=true`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread': return notifications.filter((n) => !n.isRead);
      case 'info': return notifications.filter((n) => n.type === 'info');
      case 'success': return notifications.filter((n) => n.type === 'success');
      case 'warning': return notifications.filter((n) => n.type === 'warning');
      case 'error': return notifications.filter((n) => n.type === 'error');
      default: return notifications;
    }
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Group by user
  const groupedByUser = useMemo(() => {
    const groups: Record<string, { name: string; role: string; notifications: NotificationWithUser[] }> = {};
    for (const n of filteredNotifications) {
      const userName = n.user?.name || 'غير معروف';
      if (!groups[n.userId]) {
        groups[n.userId] = {
          name: userName,
          role: n.user?.role || 'REP',
          notifications: [],
        };
      }
      groups[n.userId].notifications.push(n);
    }
    return groups;
  }, [filteredNotifications]);

  const handleMarkAllRead = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/notifications?adminId=${user!.id}&all=true`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success('تم قراءة جميع الإشعارات');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    setProcessing(true);
    try {
      // Delete all notifications
      const promises = notifications.map((n) =>
        fetch(`/api/notifications?notificationId=${n.id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      setNotifications([]);
      toast.success('تم حذف جميع الإشعارات');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkUserRead = async (userId: string) => {
    try {
      const userNotifs = notifications.filter((n) => n.userId === userId && !n.isRead);
      await Promise.all(
        userNotifs.map((n) =>
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: n.id }),
          })
        )
      );
      setNotifications((prev) =>
        prev.map((n) => (n.userId === userId ? { ...n, isRead: true } : n))
      );
      toast.success('تم قراءة إشعارات هذا المستخدم');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?notificationId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {
      // silent
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'unread', label: 'غير مقروء' },
    { id: 'info', label: 'معلومات' },
    { id: 'success', label: 'نجاح' },
    { id: 'warning', label: 'تحذير' },
    { id: 'error', label: 'خطأ' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#007AFF]" />
            الإشعارات
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      {/* Notification Composer */}
      <motion.div variants={fadeUp}>
        <NotificationComposer />
      </motion.div>

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#007AFF]" />
          الإشعارات
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 bg-[#FF3B30] text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1.5 animate-badge-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNotifications}
            className="h-8 px-2 text-gray-500"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Batch Actions */}
      {notifications.length > 0 && (
        <motion.div variants={fadeUp} className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={processing || unreadCount === 0}
            className="h-8 rounded-xl text-xs border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5"
          >
            {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3 ml-1" />}
            قراءة الكل
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            disabled={processing}
            className="h-8 rounded-xl text-xs border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5"
          >
            <Trash2 className="w-3 h-3 ml-1" />
            حذف الكل
          </Button>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex gap-1.5 bg-white rounded-2xl p-1 shadow-sm overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              filter === f.id
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.label}
            {f.id === 'unread' && unreadCount > 0 && (
              <span className="mr-1 min-w-[16px] h-4 bg-white/30 text-white text-[9px] rounded-full inline-flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Notifications by User */}
      {filteredNotifications.length === 0 ? (
        <motion.div variants={fadeUp} className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">
            {filter !== 'all' ? 'لا توجد إشعارات بهذا الفلتر' : 'لا توجد إشعارات'}
          </p>
        </motion.div>
      ) : (
        Object.entries(groupedByUser).map(([userId, group]) => (
          <motion.div key={userId} variants={fadeUp} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* User Section Header */}
            <div className="px-4 py-3 bg-gradient-to-l from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  group.role === 'ADMIN' 
                    ? 'bg-gradient-to-br from-[#FF9500] to-[#E68A00]' 
                    : 'bg-gradient-to-br from-[#007AFF] to-[#0055D4]'
                }`}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">{group.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {group.role === 'ADMIN' ? 'مدير' : 'مندوب'} · {group.notifications.length} إشعار
                    {group.notifications.filter((n) => !n.isRead).length > 0 && (
                      <span className="text-[#FF3B30] mr-1">({group.notifications.filter((n) => !n.isRead).length} غير مقروء)</span>
                    )}
                  </p>
                </div>
              </div>
              {group.notifications.some((n) => !n.isRead) && (
                <button
                  onClick={() => handleMarkUserRead(userId)}
                  className="text-[11px] text-[#007AFF] font-medium hover:underline"
                >
                  قراءة الكل
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-gray-50">
              <AnimatePresence>
                {group.notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`px-4 py-3 flex items-start gap-3 transition-colors hover:bg-gray-50/50 ${
                      !notif.isRead ? 'bg-[#007AFF]/[0.02]' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${getNotifColor(notif.type)}`}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-medium ${!notif.isRead ? 'text-[#1c1c1e]' : 'text-gray-600'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#007AFF] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteOne(notif.id)}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#FF3B30] transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
