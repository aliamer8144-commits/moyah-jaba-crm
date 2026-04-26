'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { SarIcon } from '@/components/shared/sar-icon';
import { Trophy, Crown, Medal, Users, FileText, DollarSign, UserCircle } from 'lucide-react';

interface RepData {
  id: string;
  name: string;
  isActive: boolean;
  clientCount: number;
  invoiceCount: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const podiumColors = [
  { bg: 'from-[#FFD700] to-[#FFA500]', border: 'border-[#FFD700]/30', shadow: 'shadow-[#FFD700]/20', text: 'text-[#B8860B]', label: '🥇', medalBg: 'bg-gradient-to-br from-[#FFD700] to-[#FFA500]' },
  { bg: 'from-[#C0C0C0] to-[#A0A0A0]', border: 'border-[#C0C0C0]/30', shadow: 'shadow-[#C0C0C0]/20', text: 'text-[#808080]', label: '🥈', medalBg: 'bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0]' },
  { bg: 'from-[#CD7F32] to-[#A0522D]', border: 'border-[#CD7F32]/30', shadow: 'shadow-[#CD7F32]/20', text: 'text-[#8B4513]', label: '🥉', medalBg: 'bg-gradient-to-br from-[#CD7F32] to-[#A0522D]' },
];

export function RepLeaderboard() {
  const { user } = useAppStore();
  const [reps, setReps] = useState<RepData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [repsRes, invRes] = await Promise.all([
          fetch(`/api/auth?adminId=${user.id}`),
          fetch(`/api/invoices?adminId=${user.id}`),
        ]);

        let repsData: RepData[] = [];
        if (repsRes.ok) {
          const repsJson = await repsRes.json();
          // /api/auth returns array of reps with _count
          repsData = (Array.isArray(repsJson) ? repsJson : []).map((r: any) => ({
            id: r.id,
            name: r.name,
            isActive: r.isActive,
            clientCount: r._count?.clients || 0,
            invoiceCount: r._count?.invoices || 0,
            totalRevenue: 0,
            totalPaid: 0,
            totalDebt: 0,
          }));
        }

        // Enrich reps with revenue from invoices
        if (invRes.ok) {
          const invoices = await invRes.json();
          const repRevenueMap = new Map<string, { revenue: number; invoices: number; paid: number; debt: number }>();
          for (const inv of invoices) {
            const existing = repRevenueMap.get(inv.repId);
            if (existing) {
              existing.revenue += inv.finalTotal;
              existing.invoices += 1;
              existing.paid += inv.paidAmount || 0;
              existing.debt += inv.debtAmount || 0;
            } else {
              repRevenueMap.set(inv.repId, { revenue: inv.finalTotal, invoices: 1, paid: inv.paidAmount || 0, debt: inv.debtAmount || 0 });
            }
          }
          repsData = repsData.map(r => {
            const revData = repRevenueMap.get(r.id);
            return {
              ...r,
              totalRevenue: revData?.revenue || 0,
              totalPaid: revData?.paid || 0,
              totalDebt: revData?.debt || 0,
              invoiceCount: revData?.invoices || r.invoiceCount || 0,
            };
          });
        }

        // Sort by revenue descending
        repsData.sort((a, b) => b.totalRevenue - a.totalRevenue);
        setReps(repsData);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getInitial = (name: string) => name.charAt(0);

  if (loading) {
    return (
      <motion.div variants={fadeUp}>
        <Skeleton className="h-72 rounded-2xl" />
      </motion.div>
    );
  }

  if (reps.length === 0) return null;

  const top3 = reps.slice(0, 3);
  const rest = reps.slice(3);
  const maxRevenue = top3[0]?.totalRevenue || 1;

  return (
    <motion.div variants={fadeUp}>
      <div className="rounded-2xl p-[1px] bg-gradient-to-br from-[#FFD700]/30 via-[#007AFF]/20 to-[#AF52DE]/20">
        <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFD700]" />
            <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white">لوحة المتصدرين</h3>
            <span className="text-[10px] bg-[#FFD700]/10 text-[#B8860B] px-2 py-0.5 rounded-full font-medium mr-auto">
              {reps.length} مندوب
            </span>
          </div>

          {/* Podium - Top 3 */}
          <div className="px-4 pb-3">
            <motion.div variants={stagger} initial="initial" animate="animate"
              className="flex items-end justify-center gap-3"
            >
              {/* 2nd Place */}
              {top3[1] && (
                <motion.div variants={fadeUp} className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className={`w-14 h-14 rounded-full ${podiumColors[1].medalBg} flex items-center justify-center text-white text-lg font-bold shadow-lg ${podiumColors[1].shadow} mb-2 relative`}>
                    {getInitial(top3[1].name)}
                    <span className="absolute -top-1 -right-1 text-sm">{podiumColors[1].label}</span>
                  </div>
                  <p className="text-xs font-bold text-[#1c1c1e] dark:text-white truncate w-full text-center">{top3[1].name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{top3[1].totalRevenue.toLocaleString('ar-SA')} <SarIcon size={10} className="text-gray-500" /></p>
                  <div className={`w-full mt-2 bg-gradient-to-t ${podiumColors[1].bg} rounded-t-xl flex items-end justify-center pb-2 ${podiumColors[1].shadow}`}
                    style={{ height: '80px' }}>
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                </motion.div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <motion.div variants={fadeUp} className="flex flex-col items-center flex-1 max-w-[160px] relative">
                  <Crown className="w-6 h-6 text-[#FFD700] mb-1 animate-bounce" style={{ animationDuration: '2s' }} />
                  <div className={`w-16 h-16 rounded-full ${podiumColors[0].medalBg} flex items-center justify-center text-white text-xl font-bold shadow-lg ${podiumColors[0].shadow} mb-2 relative ring-2 ring-[#FFD700]/30`}>
                    {getInitial(top3[0].name)}
                    <span className="absolute -top-1 -right-1 text-base">{podiumColors[0].label}</span>
                  </div>
                  <p className="text-sm font-bold text-[#1c1c1e] dark:text-white truncate w-full text-center">{top3[0].name}</p>
                  <p className="text-[11px] text-[#FFD700] font-bold mt-0.5">{top3[0].totalRevenue.toLocaleString('ar-SA')} <SarIcon size={11} className="text-[#FFD700]" /></p>
                  <div className={`w-full mt-2 bg-gradient-to-t ${podiumColors[0].bg} rounded-t-xl flex items-end justify-center pb-2 ${podiumColors[0].shadow}`}
                    style={{ height: '100px' }}>
                    <span className="text-white font-bold text-2xl">1</span>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <motion.div variants={fadeUp} className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className={`w-14 h-14 rounded-full ${podiumColors[2].medalBg} flex items-center justify-center text-white text-lg font-bold shadow-lg ${podiumColors[2].shadow} mb-2 relative`}>
                    {getInitial(top3[2].name)}
                    <span className="absolute -top-1 -right-1 text-sm">{podiumColors[2].label}</span>
                  </div>
                  <p className="text-xs font-bold text-[#1c1c1e] dark:text-white truncate w-full text-center">{top3[2].name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{top3[2].totalRevenue.toLocaleString('ar-SA')} <SarIcon size={10} className="text-gray-500" /></p>
                  <div className={`w-full mt-2 bg-gradient-to-t ${podiumColors[2].bg} rounded-t-xl flex items-end justify-center pb-2 ${podiumColors[2].shadow}`}
                    style={{ height: '60px' }}>
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Remaining Reps List */}
          {rest.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/50">
              {rest.map((rep, i) => {
                const rank = i + 4;
                const pct = maxRevenue > 0 ? Math.min((rep.totalRevenue / maxRevenue) * 100, 100) : 0;
                return (
                  <motion.div
                    key={rep.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (i + 3) * 0.05 }}
                    className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {rank}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF]/20 to-[#5856D6]/20 flex items-center justify-center text-[#007AFF] text-xs font-bold shrink-0">
                      {getInitial(rep.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white truncate">{rep.name}</p>
                        <p className="text-xs font-bold text-[#007AFF] shrink-0">{rep.totalRevenue.toLocaleString('ar-SA')} <SarIcon size={12} className="text-[#007AFF]" /></p>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: (i + 3) * 0.08 }}
                          className="h-full rounded-full bg-gradient-to-l from-[#007AFF] to-[#5856D6]"
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <FileText className="w-2.5 h-2.5" />
                          {rep.invoiceCount} فاتورة
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5" />
                          {rep.clientCount} عميل
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Summary Footer */}
          <div className="px-4 py-2.5 bg-gradient-to-l from-[#FFD700]/5 to-transparent border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-500">إجمالي مبيعات المناديب</p>
              <p className="text-[11px] font-bold text-[#FFD700]">
                {reps.reduce((s, r) => s + r.totalRevenue, 0).toLocaleString('ar-SA')} <SarIcon size={11} className="text-[#FFD700]" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
