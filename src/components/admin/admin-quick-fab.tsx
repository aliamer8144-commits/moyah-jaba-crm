'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Plus, UserPlus, FilePlus, Bell } from 'lucide-react';
import { AdminInvoiceFormDialog } from './admin-invoice-form';
import { AdminClientFormDialog } from './admin-client-form';

interface FabAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const fabActions: FabAction[] = [
  { id: 'invoice', label: 'فاتورة جديدة', icon: FilePlus, color: '#007AFF' },
  { id: 'client', label: 'إضافة عميل', icon: UserPlus, color: '#AF52DE' },
  { id: 'rep', label: 'إنشاء مندوب', icon: UserPlus, color: '#34C759' },
  { id: 'notification', label: 'إنشاء إشعار', icon: Bell, color: '#FF9500' },
];

// Arc layout
const getItemPosition = (index: number) => {
  const spacing = 52;
  const maxSpread = 90;
  const y = -(index) * spacing + 20;
  const progress = index / (fabActions.length - 1);
  const x = maxSpread * Math.cos(progress * Math.PI * 0.5);
  return { x, y };
};

export function AdminQuickFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const { setAdminTab } = useAppStore();

  const handleAction = useCallback((action: FabAction) => {
    setIsOpen(false);
    setTimeout(() => {
      switch (action.id) {
        case 'invoice':
          setInvoiceFormOpen(true);
          break;
        case 'client':
          setClientFormOpen(true);
          break;
        case 'rep':
          setAdminTab('reps');
          break;
        case 'notification':
          setAdminTab('notifications');
          break;
      }
    }, 150);
  }, [setAdminTab]);

  const toggleFab = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      <div className="fixed left-4 bottom-8 z-50" style={{ touchAction: 'none' }}>
        {/* Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
              style={{ zIndex: -1 }}
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Menu Items */}
        <AnimatePresence>
          {isOpen && (
            <>
              {fabActions.map((action, index) => {
                const pos = getItemPosition(index);
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                    exit={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 22,
                      delay: index * 0.08,
                    }}
                    className="absolute bottom-[6px] left-[6px] flex items-center gap-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAction(action)}
                      className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                      style={{
                        backgroundColor: action.color,
                        boxShadow: `0 4px 14px ${action.color}40`,
                      }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </motion.button>

                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.08 + 0.1 }}
                      className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-gray-100 dark:border-gray-700"
                    >
                      {action.label}
                    </motion.span>
                  </motion.div>
                );
              })}
            </>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleFab}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-shadow"
          style={{
            background: 'linear-gradient(135deg, #007AFF, #5856D6)',
            boxShadow: isOpen
              ? '0 0 0 rgba(0,122,255,0)'
              : '0 4px 20px rgba(0,122,255,0.4), 0 0 40px rgba(88,86,214,0.15)',
          }}
        >
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6]"
              />
            )}
          </AnimatePresence>

          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-[#007AFF]/30"
              />
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Admin Invoice Form Dialog */}
      <AdminInvoiceFormDialog open={invoiceFormOpen} onOpenChange={setInvoiceFormOpen} />

      {/* Admin Client Form Dialog */}
      <AdminClientFormDialog open={clientFormOpen} onOpenChange={setClientFormOpen} />
    </>
  );
}
