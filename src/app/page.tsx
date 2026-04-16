'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { LoginPage } from '@/components/app/login-page';
import { RepView } from '@/components/app/rep-view';
import { AdminView } from '@/components/app/admin-view';
import { SyncIndicator } from '@/components/shared/sync-indicator';
import { Droplets } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { currentView, setCurrentView, user, isAuthenticated, setIsOnline } = useAppStore();

  // Wait for client-side hydration before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check persisted user on mount
  useEffect(() => {
    if (!mounted) return;
    if (user && isAuthenticated) {
      setCurrentView(user.role === 'ADMIN' ? 'admin' : 'rep');
    } else {
      setCurrentView('login');
    }
  }, [mounted, user, isAuthenticated, setCurrentView]);

  // Online/offline listeners
  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted, setIsOnline]);

  // Show loading screen during SSR/hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center animate-float">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {currentView === 'login' && (
          <LoginPage key="login" />
        )}
        {currentView === 'rep' && (
          <RepView key="rep" />
        )}
        {currentView === 'admin' && (
          <AdminView key="admin" />
        )}
      </AnimatePresence>

      {/* Sync Indicator - show only when logged in */}
      {currentView !== 'login' && <SyncIndicator />}
    </>
  );
}
