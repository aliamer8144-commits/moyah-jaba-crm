'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { User, Phone, Package, LogOut, Droplets, ClipboardList, Users, FileText, Wallet, TrendingUp, Share2, Sun, Moon, Monitor, Trophy } from 'lucide-react';
import { AchievementBadges } from '@/components/rep/achievement-badges';

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

interface RepStats {
  clientCount: number;
  invoiceCount: number;
  totalRevenue: number;
  totalDebt: number;
  totalDebtCollected: number;
}

export function RepProfile() {
  const { user, setUser, setCurrentView, setRepTab, invoices, clients } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [stats, setStats] = useState<RepStats | null>(null);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    const id = userIdRef.current;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rep-stats?repId=${id}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    setRepTab('home');
    toast.success('تم تسجيل الخروج');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'مياه جبأ - مناديب',
        text: 'حمّل تطبيق مياه جبأ للمناديب',
        url: window.location.href,
      }).catch(() => {
        // fallback
      });
    }
    toast.success('رابط المشاركة تم نسخه');
  };

  if (!user) return null;

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="p-4 space-y-4">
      <h2 className="text-lg font-bold px-1">حسابي</h2>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center mb-4 shadow-lg shadow-[#007AFF]/20">
            <span className="text-white font-bold text-2xl">{user.name.charAt(0)}</span>
          </div>
          <h3 className="text-xl font-bold">{user.name}</h3>
          <p className="text-sm text-gray-500 mt-1">@{user.username}</p>
          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-[#34C759]/10 text-[#34C759] rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            نشط
          </span>
        </div>
      </div>

      {/* My Stats Section */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-base font-bold">إحصائياتي</h3>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-[#007AFF] font-medium hover:bg-[#007AFF]/5 px-3 py-1.5 rounded-full transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            مشاركة
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">العملاء</p>
                <p className="text-xl font-bold text-[#1c1c1e]">{stats?.clientCount ?? '...'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#34C759]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">الفواتير</p>
                <p className="text-xl font-bold text-[#1c1c1e]">{stats?.invoiceCount ?? '...'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FF9500]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">الإيرادات</p>
                <p className="text-lg font-bold text-[#1c1c1e]">{(stats?.totalRevenue ?? 0).toLocaleString('ar-SA')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#AF52DE]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">المحصّل</p>
                <p className="text-lg font-bold text-[#1c1c1e]">{(stats?.totalDebtCollected ?? 0).toLocaleString('ar-SA')}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Achievements Grid */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Trophy className="w-4 h-4 text-[#FFD700]" />
          <h3 className="text-base font-bold">إنجازاتي</h3>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800">
          <AchievementBadges invoices={invoices} clients={clients} showAll />
        </div>
      </motion.div>

      {/* Info */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
            <User className="w-4 h-4 text-[#007AFF]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">الاسم</p>
            <p className="text-sm font-medium">{user.name}</p>
          </div>
        </div>

        {user.phone && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-[#34C759]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">رقم الهاتف</p>
              <p className="text-sm font-medium" dir="ltr">{user.phone}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-[#FF9500]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">المخزون المخصص</p>
            <p className="text-sm font-bold text-[#FF9500]">{user.allocatedInventory} كرتون</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
        <button
          onClick={() => setRepTab('requests')}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-[#FF9500]" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium">طلباتي</p>
            <p className="text-xs text-gray-500">تتبع طلبات التعديل والحذف</p>
          </div>
          <span className="text-gray-400 text-lg">‹</span>
        </button>

        {theme && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#5856D6]/10 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-[#5856D6]" /> : <Sun className="w-4 h-4 text-[#5856D6]" />}
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm font-medium">الوضع الداكن</p>
              <p className="text-xs text-gray-500">
                {theme === 'dark' ? 'مفعّل' : 'معطّل'}
              </p>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-[#007AFF]' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                theme === 'dark' ? 'left-0.5 translate-x-0' : 'left-0.5'
              }`} style={{ transform: theme === 'dark' ? 'translateX(0)' : 'translateX(20px)' }} />
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full h-12 rounded-2xl border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5 font-semibold text-sm flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        تسجيل الخروج
      </Button>

      {/* App Info */}
      <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-400">
        <Droplets className="w-3.5 h-3.5" />
        <span>مياه جبأ - الإصدار 1.0.0</span>
      </div>
    </motion.div>
  );
}
