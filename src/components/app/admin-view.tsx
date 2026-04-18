'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Droplets, Bell, Menu, X, LogOut, Sun, Moon, User } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FileText,
  Receipt,
  ClipboardList,
  Activity,
  Settings,
  BarChart3,
  Package,
  Home,
} from 'lucide-react';
import { Dashboard } from '@/components/admin/dashboard';
import { RepManagement } from '@/components/admin/rep-management';
import { AdminClients } from '@/components/admin/admin-clients';
import { AdminInvoices } from '@/components/admin/admin-invoices';
import { AdminReceipts } from '@/components/admin/admin-receipts';
import { RequestManagement } from '@/components/admin/request-management';
import { ActivityLog } from '@/components/admin/activity-log';
import { AdminNotifications } from '@/components/admin/admin-notifications';
import { AdminSettings } from '@/components/admin/admin-settings';
import { AdminReports } from '@/components/admin/admin-reports';
import { AdminProducts } from '@/components/admin/admin-products';
import { AdminQuickFab } from '@/components/admin/admin-quick-fab';
import { NotificationsPanel } from '@/components/shared/notifications-panel';

// Bottom Nav Tabs (Mobile)
const bottomNavTabs = [
  { id: 'dashboard' as const, label: 'الرئيسية', icon: Home },
  { id: 'reps' as const, label: 'المناديب', icon: UserCircle },
  { id: 'clients' as const, label: 'العملاء', icon: Users },
  { id: 'reports' as const, label: 'التقارير', icon: BarChart3 },
  { id: 'settings' as const, label: 'الملف الشخصي', icon: Settings },
];

const navItems = [
  { id: 'dashboard' as const, label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'reports' as const, label: 'التقارير', icon: BarChart3 },
  { id: 'reps' as const, label: 'المناديب', icon: UserCircle },
  { id: 'clients' as const, label: 'العملاء', icon: Users },
  { id: 'invoices' as const, label: 'الفواتير', icon: FileText },
  { id: 'receipts' as const, label: 'سندات القبض', icon: Receipt },
  { id: 'products' as const, label: 'المنتجات', icon: Package },
  { id: 'requests' as const, label: 'الطلبات', icon: ClipboardList },
  { id: 'activity' as const, label: 'سجل النشاط', icon: Activity },
  { id: 'notifications' as const, label: 'الإشعارات', icon: Bell },
  { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
];

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function AdminView() {
  const { adminTab, setAdminTab, user, notifications, setUser, setCurrentView } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [animatingTab, setAnimatingTab] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        useAppStore.getState().setNotifications(data);
      }
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    toast.success('تم تسجيل الخروج');
  };

  const currentLabel = bottomNavTabs.find((n) => n.id === adminTab)?.label || navItems.find((n) => n.id === adminTab)?.label || 'الرئيسية';

  const renderContent = () => {
    switch (adminTab) {
      case 'dashboard': return <Dashboard />;
      case 'reports': return <AdminReports />;
      case 'reps': return <RepManagement />;
      case 'clients': return <AdminClients />;
      case 'invoices': return <AdminInvoices />;
      case 'receipts': return <AdminReceipts />;
      case 'products': return <AdminProducts />;
      case 'requests': return <RequestManagement />;
      case 'activity': return <ActivityLog />;
      case 'notifications': return <AdminNotifications />;
      case 'settings': return <AdminSettings />;
      default: return <Dashboard />;
    }
  };

  // Get user initials for avatar
  const userInitial = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
    : 'م';

  // Calculate active indicator position
  const activeIndex = navItems.findIndex((item) => item.id === adminTab);
  const indicatorTop = activeIndex >= 0 ? 12 + activeIndex * 44 : 0;

  return (
    <div className="min-h-screen flex dark:bg-gray-950">
      {/* Desktop Sidebar with Sliding Active Indicator */}
      <aside className="hidden md:flex md:flex-col md:w-64 lg:w-72 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 fixed inset-y-0 right-0 z-30 glass-card-enhanced">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center shadow-sm shadow-[#007AFF]/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#1c1c1e] dark:text-white">مياه جبأ</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">لوحة التحكم</p>
          </div>
        </div>

        <ScrollArea className="flex-1 py-3 px-3">
          <div className="space-y-1 relative">
            {/* Sliding active indicator */}
            <motion.div
              className="absolute right-0 w-1 h-8 rounded-l-full bg-gradient-to-b from-[#007AFF] to-[#5856D6] shadow-sm shadow-[#007AFF]/30"
              animate={{ top: indicatorTop }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />

            {navItems.map((item) => {
              const isActive = adminTab === item.id;
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAdminTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative admin-nav-item card-hover-lift touch-feedback ${
                    isActive
                      ? 'bg-gradient-to-l from-[#007AFF]/10 to-[#5856D6]/5 text-[#007AFF] shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-l hover:from-gray-100/80 hover:to-gray-50/60 dark:hover:from-gray-800/80 dark:hover:to-gray-800/40'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition-colors duration-200 ${isActive ? 'text-[#007AFF]' : ''}`} />
                  <span className="flex-1 text-right">{item.label}</span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-[#FF3B30] text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 animate-badge-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mr-auto"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-[#FF3B30] hover:bg-[#FF3B30]/5 rounded-xl transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:mr-64 lg:mr-72">
        {/* Top Header */}
        <header className="sticky top-0 z-20 glass border-b border-gray-200/50 safe-top header-accent-line">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Menu className="w-5 h-5 text-[#1c1c1e] dark:text-white" />
              </button>
              <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-white">{currentLabel}</h2>
            </div>

            <div className="flex items-center gap-2">
              {theme && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
                </button>
              )}
              <button
                onClick={() => setNotifOpen(true)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] bg-[#FF3B30] text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 pb-28 md:pb-20">
          <AnimatePresence mode="wait">
            <motion.div key={adminTab} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="page-transition-enter">
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Navigation Sheet - Enhanced with Gradient Hover */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-72 rounded-l-2xl p-0 dark:bg-gray-900 glass-card-enhanced">
          {/* User Header */}
          <SheetHeader className="px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-sm shadow-[#007AFF]/20">
                  <span className="text-white font-bold text-sm">{userInitial}</span>
                </div>
                <div>
                  <SheetTitle className="text-base font-bold">{user?.name}</SheetTitle>
                  <p className="text-[11px] text-gray-500 mt-0.5">مدير النظام</p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Navigation Items with stagger animation and gradient hover */}
          <div className="py-2 px-3 space-y-1">
            <AnimatePresence>
              {navItems.map((item, index) => {
                const isActive = adminTab === item.id;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setAdminTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 admin-nav-item card-hover-lift touch-feedback ${
                      isActive
                        ? 'bg-gradient-to-l from-[#007AFF]/10 to-[#5856D6]/5 text-[#007AFF] shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-l hover:from-gray-100/80 hover:to-gray-50/60 dark:hover:from-gray-800/80 dark:hover:to-gray-800/40'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 transition-colors duration-200 ${isActive ? 'text-[#007AFF]' : ''}`} />
                    {item.label}
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] bg-[#FF3B30] text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 animate-badge-pulse mr-auto">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mr-auto"
                      />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Divider + Logout */}
          <div className="absolute bottom-0 left-0 right-0">
            <div className="mx-4 border-t border-gray-100 dark:border-gray-800" />
            <div className="p-3">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-3 text-[#FF3B30] hover:bg-[#FF3B30]/5 rounded-xl transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation - Modern Floating Gradient Style (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-5 pb-5 pt-1 pointer-events-none">
        <div className="relative max-w-md mx-auto rounded-2xl shadow-[0_-2px_30px_rgba(0,122,255,0.15),0_0_0_0.5px_rgba(88,86,214,0.1)] dark:shadow-[0_-2px_30px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.05)] overflow-hidden pointer-events-auto">
          {/* Gradient Background */}
          <div className="absolute inset-0 gradient-mesh-blue" />
          {/* Subtle mesh overlay */}
          <div className="absolute inset-0 bg-white/5" />

          <div className="relative flex items-center justify-around h-14 px-1">
            {bottomNavTabs.map((tab) => {
              const isActive = adminTab === tab.id;
              const isAnimating = animatingTab === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    setAnimatingTab(tab.id);
                    setAdminTab(tab.id);
                    setTimeout(() => setAnimatingTab(null), 500);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-300 relative min-w-[56px] ${
                    isActive ? 'text-white' : 'text-white/60'
                  } ${isAnimating ? 'animate-tab-press' : ''}`}
                >
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="adminActiveTabBg"
                      className="absolute inset-1 bg-white/20 rounded-xl"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <div className={`relative z-10 flex flex-col items-center ${isAnimating ? 'animate-spring-bounce' : ''}`}>
                    <Icon className={`w-[22px] h-[22px] transition-all duration-300 ${isActive ? 'stroke-[2.5]' : ''}`} />
                    <span className={`text-[10px] mt-0.5 transition-all duration-300 leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Admin FAB */}
      <AdminQuickFab />

      {/* Notifications */}
      <NotificationsPanel open={notifOpen} onOpenChange={setNotifOpen} />
    </div>
  );
}
