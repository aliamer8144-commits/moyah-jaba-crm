'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Trophy } from 'lucide-react';
import { Invoice, Client } from '@/lib/store';
import { SarIcon } from '@/components/shared/sar-icon';

interface BadgeDefinition {
  id: string;
  emoji: string;
  name: string;
  description: string;
  check: (invoices: Invoice[], clients: Client[]) => { earned: boolean; earnedDate?: string };
}

const BADGES: BadgeDefinition[] = [
  {
    id: 'starter',
    emoji: '🌟',
    name: 'بائع مبتدئ',
    description: 'أول فاتورة تم إنشاؤها',
    check: (invoices) => ({
      earned: invoices.length >= 1,
      earnedDate: invoices.length >= 1 ? invoices[0]?.createdAt : undefined,
    }),
  },
  {
    id: 'golden',
    emoji: '💎',
    name: 'بائع ذهبي',
    description: '10+ فاتورة',
    check: (invoices) => ({
      earned: invoices.length >= 10,
      earnedDate: invoices.length >= 10 ? invoices[9]?.createdAt : undefined,
    }),
  },
  {
    id: 'top-seller',
    emoji: '🏆',
    name: 'بائع الموسم',
    description: '50+ فاتورة',
    check: (invoices) => ({
      earned: invoices.length >= 50,
      earnedDate: invoices.length >= 50 ? invoices[49]?.createdAt : undefined,
    }),
  },
  {
    id: 'invoice-hunter',
    emoji: '🎯',
    name: 'صائد الفواتير',
    description: '100+ فاتورة',
    check: (invoices) => ({
      earned: invoices.length >= 100,
      earnedDate: invoices.length >= 100 ? invoices[99]?.createdAt : undefined,
    }),
  },
  {
    id: 'money-collector',
    emoji: '💰',
    name: 'جامع الأموال',
    description: 'إجمالي الإيرادات > 10,000 ر.س',
    check: (invoices) => {
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.finalTotal, 0);
      const earned = totalRevenue > 10000;
      // Find the date when total crossed 10,000
      let runningTotal = 0;
      let earnedDate: string | undefined;
      for (const inv of [...invoices].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
        runningTotal += inv.finalTotal;
        if (runningTotal > 10000 && !earnedDate) {
          earnedDate = inv.createdAt;
        }
      }
      return { earned, earnedDate };
    },
  },
  {
    id: 'client-magnet',
    emoji: '🤝',
    name: 'محب العملاء',
    description: '10+ عميل',
    check: (_invoices, clients) => ({
      earned: clients.length >= 10,
      earnedDate: clients.length >= 10 ? clients[9]?.createdAt : undefined,
    }),
  },
  {
    id: 'rising-star',
    emoji: '📈',
    name: 'نجم الصعود',
    description: 'زيادة الإيرادات 50%+ مقارنة بالشهر السابق',
    check: (invoices) => {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const thisMonthRevenue = invoices
        .filter((inv) => {
          const d = new Date(inv.createdAt);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((sum, inv) => sum + inv.finalTotal, 0);

      const lastMonthRevenue = invoices
        .filter((inv) => {
          const d = new Date(inv.createdAt);
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        })
        .reduce((sum, inv) => sum + inv.finalTotal, 0);

      if (lastMonthRevenue === 0) return { earned: false };

      const growth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      const earned = growth >= 50;
      const earnedDate = earned ? invoices.find((inv) => {
        const d = new Date(inv.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })?.createdAt : undefined;
      return { earned, earnedDate };
    },
  },
  {
    id: 'winning-streak',
    emoji: '🔥',
    name: 'سلسلة النجاح',
    description: '7+ أيام متتالية مع فواتير',
    check: (invoices) => {
      const daySet = new Set<string>();
      invoices.forEach((inv) => {
        const d = new Date(inv.createdAt);
        daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      });

      const sortedDays = Array.from(daySet).map((s) => {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m, d).getTime();
      }).sort((a, b) => a - b);

      let maxStreak = 0;
      let currentStreak = 0;
      let streakEndDate: Date | null = null;

      for (let i = 0; i < sortedDays.length; i++) {
        if (i === 0) {
          currentStreak = 1;
        } else {
          const diff = (sortedDays[i] - sortedDays[i - 1]) / 86400000;
          if (diff === 1) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
        }
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          streakEndDate = new Date(sortedDays[i]);
        }
      }

      const earned = maxStreak >= 7;
      const earnedDate = earned && streakEndDate ? streakEndDate.toISOString() : undefined;
      return { earned, earnedDate };
    },
  },
  {
    id: 'sales-lightning',
    emoji: '⚡',
    name: 'صاعقة المبيعات',
    description: '5+ فاتورة في يوم واحد',
    check: (invoices) => {
      const dayCount = new Map<string, number>();
      invoices.forEach((inv) => {
        const d = new Date(inv.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        dayCount.set(key, (dayCount.get(key) || 0) + 1);
      });

      let earned = false;
      let earnedDate: string | undefined;

      for (const [key, count] of dayCount) {
        if (count >= 5 && !earned) {
          earned = true;
          // Find the date of this day
          const matchingInvoice = invoices.find((inv) => {
            const d = new Date(inv.createdAt);
            const invKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            return invKey === key;
          });
          earnedDate = matchingInvoice?.createdAt;
        }
      }
      return { earned, earnedDate };
    },
  },
  {
    id: 'sales-wave',
    emoji: '🌊',
    name: 'موجة المبيعات',
    description: 'إيرادات > 5,000 ر.س في أسبوع',
    check: (invoices) => {
      const weekRevenue = new Map<string, number>();
      invoices.forEach((inv) => {
        const d = new Date(inv.createdAt);
        // Get start of week (Monday)
        const day = d.getDay();
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        const key = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth()}-${startOfWeek.getDate()}`;
        weekRevenue.set(key, (weekRevenue.get(key) || 0) + inv.finalTotal);
      });

      let earned = false;
      let earnedDate: string | undefined;

      for (const [key, revenue] of weekRevenue) {
        if (revenue > 5000 && !earned) {
          earned = true;
          // Find invoice from that week
          const [y, m, d] = key.split('-').map(Number);
          const weekStart = new Date(y, m, d);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const matchingInvoice = invoices.find((inv) => {
            const invDate = new Date(inv.createdAt);
            return invDate >= weekStart && invDate < weekEnd;
          });
          earnedDate = matchingInvoice?.createdAt;
        }
      }
      return { earned, earnedDate };
    },
  },
];

export interface EarnedBadge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earnedDate?: string;
}

export function calculateBadges(invoices: Invoice[], clients: Client[]): EarnedBadge[] {
  return BADGES.map((badge) => {
    const result = badge.check(invoices, clients);
    return {
      id: badge.id,
      emoji: badge.emoji,
      name: badge.name,
      description: badge.description,
      earned: result.earned,
      earnedDate: result.earnedDate,
    };
  });
}

function formatBadgeDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface AchievementBadgesProps {
  invoices: Invoice[];
  clients: Client[];
  compact?: boolean;
  showAll?: boolean;
  maxShow?: number;
}

export function AchievementBadges({
  invoices,
  clients,
  compact = false,
  showAll = false,
  maxShow = 3,
}: AchievementBadgesProps) {
  const badges = useMemo(() => calculateBadges(invoices, clients), [invoices, clients]);
  const earnedBadges = badges.filter((b) => (b as EarnedBadge & { earned?: boolean }).earnedDate);
  const lockedBadges = badges.filter((b) => !(b as EarnedBadge & { earned?: boolean }).earnedDate);

  const displayBadges = showAll
    ? [...earnedBadges, ...lockedBadges]
    : earnedBadges.slice(0, maxShow);

  if (displayBadges.length === 0 && !showAll) {
    return null;
  }

  if (compact) {
    // Compact horizontal scroll for rep-home
    return (
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-3" style={{ scrollSnapType: 'x mandatory' }}>
          {displayBadges.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
              className="shrink-0 w-24 rounded-2xl p-3 shadow-sm text-center border border-gray-100/50 dark:border-gray-800"
              style={{
                scrollSnapAlign: 'start',
                background: badge.earnedDate
                  ? 'linear-gradient(135deg, #FFD70010 0%, #FF950010 100%)'
                  : undefined,
              }}
            >
              <div className={`text-2xl mb-1 ${!badge.earnedDate ? 'grayscale opacity-40' : ''}`}>
                {badge.emoji}
              </div>
              <p className={`text-[10px] font-bold leading-tight ${!badge.earnedDate ? 'text-gray-400' : 'text-[#1c1c1e] dark:text-white'}`}>
                {badge.name}
              </p>
              {!badge.earnedDate && (
                <Lock className="w-3 h-3 text-gray-300 dark:text-gray-600 mx-auto mt-1" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Full grid view for profile
  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[...earnedBadges, ...lockedBadges].map((badge, i) => {
          const isEarned = !!badge.earnedDate;
          return (
            <motion.div
              key={badge.id}
              variants={fadeUp}
              whileHover={isEarned ? { scale: 1.05, y: -2 } : undefined}
              className={`relative rounded-2xl p-4 text-center shadow-sm border transition-all ${
                isEarned
                  ? 'bg-gradient-to-br from-[#FFD700]/10 via-[#FFF8E1]/20 to-[#FF9500]/10 border-[#FFD700]/20 dark:from-[#FFD700]/5 dark:via-[#FFF8E1]/5 dark:to-[#FF9500]/5'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'
              }`}
            >
              {isEarned && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`text-3xl mb-2 ${!isEarned ? 'grayscale opacity-30' : ''}`}>
                {badge.emoji}
              </div>
              <p className={`text-xs font-bold mb-0.5 ${!isEarned ? 'text-gray-400' : 'text-[#1c1c1e] dark:text-white'}`}>
                {badge.name}
              </p>
              <p className={`text-[10px] leading-tight ${!isEarned ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500'}`}>
                {badge.description}
              </p>
              {isEarned && badge.earnedDate && (
                <p className="text-[9px] text-[#FF9500] mt-1.5 font-medium">
                  {formatBadgeDate(badge.earnedDate)}
                </p>
              )}
              {!isEarned && (
                <div className="mt-2">
                  <Lock className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mx-auto" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          🏅 <span className="font-bold text-[#FFD700]">{earnedBadges.length}</span> من <span className="font-bold">{badges.length}</span> إنجازات
        </p>
      </div>
    </motion.div>
  );
}
