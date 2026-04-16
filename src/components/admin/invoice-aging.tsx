'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Timer, AlertTriangle } from 'lucide-react';

interface AgingBucket {
  range: string;
  rangeAr: string;
  count: number;
  totalDebt: number;
  percentage: number;
  color: string;
}

interface AgingData {
  buckets: AgingBucket[];
  totalAgingDebt: number;
  totalAgingCount: number;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

export function InvoiceAging() {
  const { user } = useAppStore();
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/invoice-aging?adminId=${user.id}`);
        if (res.ok) setData(await res.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <motion.div variants={fadeUp}>
        <Skeleton className="h-56 rounded-2xl" />
      </motion.div>
    );
  }

  if (!data || data.totalAgingCount === 0) return null;

  return (
    <motion.div variants={fadeUp}>
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#FF9500]" />
          <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white">تقادم الديون</h3>
          <span className="text-[10px] bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-0.5 rounded-full font-medium mr-auto">
            {data.totalAgingCount} فاتورة
          </span>
        </div>

        <motion.div variants={stagger} initial="initial" animate="animate" className="px-4 pb-2 space-y-3">
          {/* Stacked Bar */}
          {data.totalAgingDebt > 0 && (
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
              {data.buckets.filter(b => b.percentage > 0).map((bucket, i) => (
                <motion.div
                  key={bucket.range}
                  initial={{ width: 0 }}
                  animate={{ width: `${bucket.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: i * 0.15 }}
                  className="h-full transition-all"
                  style={{ backgroundColor: bucket.color }}
                  title={`${bucket.rangeAr}: ${bucket.totalDebt.toLocaleString('ar-SA')} ر.س`}
                />
              ))}
            </div>
          )}

          {/* Individual Bucket Bars */}
          <div className="space-y-2.5">
            {data.buckets.map((bucket, i) => (
              <motion.div key={bucket.range} variants={fadeUp} className="flex items-center gap-3">
                <div className="w-20 sm:w-24 shrink-0">
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 leading-tight">{bucket.rangeAr}</p>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.totalAgingDebt > 0 ? (bucket.totalDebt / data.totalAgingDebt) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.12 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: bucket.color }}
                    />
                  </div>
                </div>
                <div className="text-left shrink-0 w-24">
                  <p className="text-[11px] font-bold" style={{ color: bucket.color }}>
                    {bucket.totalDebt.toLocaleString('ar-SA')} ر.س
                  </p>
                  <p className="text-[9px] text-gray-400">{bucket.count} فاتورة • {bucket.percentage}%</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Total */}
        <div className="px-4 py-2.5 bg-gradient-to-l from-[#FF3B30]/5 to-transparent border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30]" />
              <p className="text-[11px] text-gray-500">إجمالي الديون المتقادمة</p>
            </div>
            <p className="text-[11px] font-bold text-[#FF3B30]">
              {data.totalAgingDebt.toLocaleString('ar-SA')} ر.س
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
