'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Droplets, Home, Users, FileText, UserCircle, Bell, ClipboardList, RefreshCw, ArrowDown, Receipt, Wifi, WifiOff } from 'lucide-react';
import { RepHome } from '@/components/rep/rep-home';
import { ClientList } from '@/components/rep/client-list';
import { InvoiceForm } from '@/components/rep/invoice-form';
import { InvoiceList } from '@/components/rep/invoice-list';
import { MyRequests } from '@/components/rep/my-requests';
import { RepProfile } from '@/components/rep/rep-profile';
import { ClientProfile } from '@/components/rep/client-profile';
import { NotificationsPanel } from '@/components/shared/notifications-panel';
import { RequestForm } from '@/components/shared/request-form';
import { ExpenseTracker } from '@/components/rep/expense-tracker';
import { QuickFab } from '@/components/rep/quick-fab';

const tabs = [
  { id: 'home' as const, label: 'الرئيسية', icon: Home },
  { id: 'invoices' as const, label: 'الفواتير', icon: FileText },
  { id: 'clients' as const, label: 'العملاء', icon: Users },
  { id: 'expenses' as const, label: 'المصروفات', icon: Receipt },
  { id: 'profile' as const, label: 'حسابي', icon: UserCircle },
];

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

function PullToRefresh({ onRefresh, children }: { onRefresh: () => void; children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pullControls = useAnimation();
  const THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - startY.current);
    // Apply resistance
    const distance = Math.min(diff * 0.4, 120);
    setPullDistance(distance);
  };

  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      pullControls.start({ rotate: 360, transition: { duration: 1, repeat: Infinity, ease: 'linear' } });
      onRefresh();
      // Auto-hide after simulated refresh
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        pullControls.stop();
      }, 1500);
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Pull indicator - only on mobile */}
      <div className="md:hidden overflow-hidden">
        <motion.div
          className="flex justify-center items-center overflow-hidden"
          style={{ height: pullDistance }}
        >
          {isRefreshing ? (
            <motion.div
              animate={pullControls}
              className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 text-[#007AFF]" />
            </motion.div>
          ) : (
            <div
              className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center transition-all duration-150"
              style={{ opacity: progress, transform: `scale(${0.5 + progress * 0.5})` }}
            >
              {progress >= 1 ? (
                <RefreshCw className="w-4 h-4 text-[#007AFF]" />
              ) : (
                <ArrowDown className="w-4 h-4 text-[#007AFF]" style={{ transform: `rotate(${180 * progress}deg)` }} />
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        style={{ marginTop: pullDistance > 0 ? 0 : undefined }}
        animate={{ y: isRefreshing ? THRESHOLD : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function RepView() {
  const { repTab, setRepTab, user, notifications, selectedClientId, setSelectedClientId, isOnline } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
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

  const handleTabChange = (tab: typeof repTab) => {
    if (selectedClientId && tab !== 'clients') {
      setSelectedClientId(null);
    }
    setAnimatingTab(tab);
    setRepTab(tab);
    // Clear animation state after bounce completes
    setTimeout(() => setAnimatingTab(null), 500);
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    fetchNotifications();
  }, [fetchNotifications]);

  const renderContent = () => {
    if (selectedClientId && repTab === 'clients') {
      return (
        <motion.div key="client-profile" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <ClientProfile onBack={() => setSelectedClientId(null)} onRefresh={() => setRefreshKey((k) => k + 1)} />
        </motion.div>
      );
    }

    switch (repTab) {
      case 'home':
        return <RepHome />;
      case 'clients':
        return <ClientList key={refreshKey} />;
      case 'create-invoice':
        return <InvoiceForm />;
      case 'invoices':
        return <InvoiceList key={refreshKey} />;
      case 'expenses':
        return <ExpenseTracker />;
      case 'requests':
        return <MyRequests />;
      case 'profile':
        return <RepProfile />;
      default:
        return <RepHome />;
    }
  };

  // Calculate tab index for indicator position
  const getTabIndex = (tabId: string) => {
    return tabs.findIndex((t) => t.id === tabId);
  };

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-gray-200/50 dark:border-gray-800/50 safe-top header-accent-line dark:bg-gray-900/80">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center shadow-sm shadow-[#007AFF]/20">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#1c1c1e] dark:text-white leading-tight">مياه جبأ</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connectivity Indicator */}
            <button
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isOnline ? 'متصل' : 'غير متصل'}
            >
              {isOnline ? (
                <Wifi className="w-5 h-5 text-[#34C759]" />
              ) : (
                <WifiOff className="w-5 h-5 text-[#FF3B30]" />
              )}
              {!isOnline && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#FF3B30] rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </button>

            {/* Pending Requests Badge in Header */}
            <button
              onClick={() => setRepTab('requests')}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] bg-[#FF3B30] text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 animate-badge-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-28">
        <PullToRefresh onRefresh={handleRefresh}>
          <AnimatePresence mode="wait">
            <div className="page-transition-enter">
              {renderContent()}
            </div>
          </AnimatePresence>
        </PullToRefresh>
      </main>

      {/* Quick FAB */}
      <QuickFab />

      {/* Bottom Navigation - Modern Floating Gradient Style */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-5 pt-1 pointer-events-none">
        <div className="relative max-w-md mx-auto rounded-2xl shadow-[0_-2px_30px_rgba(0,122,255,0.15),0_0_0_0.5px_rgba(88,86,214,0.1)] dark:shadow-[0_-2px_30px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.05)] overflow-hidden pointer-events-auto">
          {/* Gradient Background */}
          <div className="absolute inset-0 gradient-mesh-blue" />
          {/* Subtle mesh overlay */}
          <div className="absolute inset-0 bg-white/5" />

          <div className="relative flex items-center justify-around h-14 px-1">
            {tabs.map((tab) => {
              const isActive = repTab === tab.id;
              const isAnimating = animatingTab === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-300 relative min-w-[56px] ${
                    isActive ? 'text-white' : 'text-white/60'
                  } ${isAnimating ? 'animate-tab-press' : ''}`}
                >
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBg"
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

      {/* Notifications Panel */}
      <NotificationsPanel open={notifOpen} onOpenChange={setNotifOpen} />

      {/* Request Form */}
      <RequestForm />
    </div>
  );
}
