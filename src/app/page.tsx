'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { LoginPage } from '@/components/app/login-page';
import { RepView } from '@/components/app/rep-view';
import { AdminView } from '@/components/app/admin-view';
import { SyncIndicator } from '@/components/shared/sync-indicator';

export default function Home() {
  const { currentView, setCurrentView, user, isAuthenticated, setIsOnline } = useAppStore();

  // Check persisted user on mount
  useEffect(() => {
    if (user && isAuthenticated) {
      setCurrentView(user.role === 'ADMIN' ? 'admin' : 'rep');
    } else {
      setCurrentView('login');
    }
  }, []);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  return (
    <>
      <AnimatePresence mode="wait">
        {currentView === 'login' && (
          <motion.div
            key="login"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LoginPage />
          </motion.div>
        )}
        {currentView === 'rep' && (
          <motion.div
            key="rep"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <RepView />
          </motion.div>
        )}
        {currentView === 'admin' && (
          <motion.div
            key="admin"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AdminView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Indicator - show only when logged in */}
      {currentView !== 'login' && <SyncIndicator />}
    </>
  );
}
