'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface TrustData {
  score: number;
  level: string;
  color: string;
  details: {
    paymentRatio: number;
    paymentSpeed: number;
    purchaseVolume: number;
    totalInvoices: number;
    totalPurchases: number;
    fullyPaidCount: number;
  };
}

export function ClientTrustBadge({ clientId }: { clientId: string }) {
  const [trustData, setTrustData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/client-trust?clientId=${clientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setTrustData(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const size = 88;
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = trustData ? trustData.score / 100 : 0;
  const offset = circumference - progress * circumference;
  const color = trustData?.color || '#FF9500';

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-[88px] h-[88px] bg-gray-100 dark:bg-gray-800 rounded-full shimmer-skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-24" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-16" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!trustData) return null;

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-gray-800 card-hover-lift glass-card-enhanced">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4" style={{ color }} />
        <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-white">مستوى الثقة</h3>
      </div>

      <div className="flex items-center gap-4">
        {/* Circular Score Badge */}
        <div className="relative" style={{ width: size, height: size }}>
          {/* Background circle */}
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-100 dark:text-gray-800"
            />
            {/* Animated progress circle */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
            />
          </svg>
          {/* Score text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className={`text-2xl font-extrabold number-mono ${trustData.score >= 80 ? 'text-shimmer' : ''}`}
              style={trustData.score < 80 ? { color } : undefined}
            >
              {trustData.score}
            </motion.span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-2">
          {/* Level Badge */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span
              className="inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {trustData.level}
            </span>
          </motion.div>

          {/* Mini details */}
          <div className="space-y-1.5">
            <TrustDetailRow
              label="نسبة السداد"
              value={`${trustData.details.paymentRatio}%`}
              color={trustData.details.paymentRatio >= 70 ? '#34C759' : trustData.details.paymentRatio >= 40 ? '#FF9500' : '#FF3B30'}
              delay={0.5}
            />
            <TrustDetailRow
              label="سرعة الدفع"
              value={`${trustData.details.paymentSpeed}%`}
              color={trustData.details.paymentSpeed >= 70 ? '#34C759' : trustData.details.paymentSpeed >= 40 ? '#FF9500' : '#FF3B30'}
              delay={0.6}
            />
            <TrustDetailRow
              label="حجم المشتريات"
              value={`${trustData.details.purchaseVolume}%`}
              color={trustData.details.purchaseVolume >= 70 ? '#34C759' : trustData.details.purchaseVolume >= 40 ? '#FF9500' : '#FF3B30'}
              delay={0.7}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustDetailRow({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between"
    >
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-bold" style={{ color }}>
        {value}
      </span>
    </motion.div>
  );
}
