'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Wifi, WifiOff } from 'lucide-react';

export function SyncIndicator() {
  const isOnline = useAppStore((s) => s.isOnline);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowTooltip(!showTooltip)}
        className="relative p-3 rounded-full shadow-lg bg-white/90 backdrop-blur-md border border-gray-200"
      >
        <motion.div
          animate={isOnline ? { scale: [1, 1.2, 1] } : { x: [0, -3, 3, -3, 3, 0] }}
          transition={
            isOnline
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
          }
        >
          {isOnline ? (
            <Wifi className="w-5 h-5 text-[#34C759]" />
          ) : (
            <WifiOff className="w-5 h-5 text-[#FF3B30]" />
          )}
        </motion.div>
        {!isOnline && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FF3B30] rounded-full border-2 border-white" />
        )}
      </motion.button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[200px]"
          >
            <div className="flex items-center gap-2 mb-1">
              {isOnline ? (
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]" />
              )}
              <span className="font-semibold text-sm">
                {isOnline ? 'متصل' : 'غير متصل'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isOnline
                ? 'جميع البيانات متزامنة'
                : 'البيانات محفوظة محلياً وسيتم مزامنتها عند الاتصال'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
