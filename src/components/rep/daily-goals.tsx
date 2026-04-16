'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
  Plus,
  Sparkles,
  Zap,
  Trophy,
  Flame,
} from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';

interface GoalData {
  id: string;
  repId: string;
  targetRevenue: number;
  targetClients: number;
  targetVisits: number;
  actualRevenue: number;
  actualClients: number;
  actualVisits: number;
  date: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

function CircularProgress({
  value,
  max,
  color,
  size = 80,
  strokeWidth = 6,
  children,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - pct * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
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
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function getMotivationalMessage(pct: number): { message: string; emoji: string } {
  if (pct >= 100) return { message: 'مذهل! حققت أهدافك!', emoji: '🎯' };
  if (pct >= 75) return { message: 'اقتربت من الهدف!', emoji: '🌟' };
  if (pct >= 50) return { message: 'أداء رائع!', emoji: '🚀' };
  if (pct >= 25) return { message: 'أنت في الطريق الصحيح!', emoji: '💪' };
  return { message: 'ابدأ يومك بقوة!', emoji: '⚡' };
}

interface DailyGoalsProps {
  onGoalSet?: () => void;
}

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastGoalDate: string | null;
  todayProgress: { actual: number; target: number; percentage: number };
}

export function DailyGoals({ onGoalSet }: DailyGoalsProps) {
  const { user } = useAppStore();
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [actualRevenue, setActualRevenue] = useState(0);
  const [actualClients, setActualClients] = useState(0);
  const [actualVisits, setActualVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [targetRevenue, setTargetRevenue] = useState('');
  const [targetClients, setTargetClients] = useState('');
  const [targetVisits, setTargetVisits] = useState('');
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    try {
      const [goalsRes, streakRes] = await Promise.all([
        fetch(`/api/daily-goals?repId=${user.id}`),
        fetch(`/api/goals-streak?repId=${user.id}`),
      ]);
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        if (data.goal) {
          setGoalData(data.goal);
        }
        setActualRevenue(data.actualRevenue);
        setActualClients(data.actualClients);
        setActualVisits(data.actualVisits);
      }
      if (streakRes.ok) {
        const streak = await streakRes.json();
        setStreakData(streak);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSetGoal = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/daily-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          targetRevenue: parseFloat(targetRevenue) || 0,
          targetClients: parseInt(targetClients) || 0,
          targetVisits: parseInt(targetVisits) || 0,
        }),
      });

      if (res.ok) {
        toast.success('🎯 تم حفظ أهداف اليوم بنجاح');
        setDialogOpen(false);
        setTargetRevenue('');
        setTargetClients('');
        setTargetVisits('');
        fetchGoals();
        onGoalSet?.();
      } else {
        toast.error('حدث خطأ أثناء حفظ الأهداف');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const tRevenue = goalData?.targetRevenue || 0;
  const tClients = goalData?.targetClients || 0;
  const tVisits = goalData?.targetVisits || 0;

  const aRevenue = goalData?.actualRevenue ?? actualRevenue;
  const aClients = goalData?.actualClients ?? actualClients;
  const aVisits = goalData?.actualVisits ?? actualVisits;

  // Overall completion percentage
  let overallPct = 0;
  if (tRevenue > 0 || tClients > 0 || tVisits > 0) {
    const pctRevenue = tRevenue > 0 ? Math.min(aRevenue / tRevenue, 1) : 1;
    const pctClients = tClients > 0 ? Math.min(aClients / tClients, 1) : 1;
    const pctVisits = tVisits > 0 ? Math.min(aVisits / tVisits, 1) : 1;
    overallPct = Math.round(((pctRevenue + pctClients + pctVisits) / 3) * 100);
  }

  const motivational = getMotivationalMessage(overallPct);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!goalData) {
    return (
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 flex items-center justify-center mx-auto mb-3">
            <Target className="w-8 h-8 text-[#007AFF]" />
          </div>
          <h3 className="text-base font-bold text-[#1c1c1e] mb-1">حدد أهدافك اليوم</h3>
          <p className="text-xs text-gray-400 mb-4">ضع أهدافاً يومية لتحفيز أدائك</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-semibold gap-2 px-6">
                <Plus className="w-4 h-4" />
                تحديد الأهداف
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-sm mx-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#007AFF]" />
                  تحديد أهداف اليوم
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#34C759]" />
                    هدف الإيرادات (<SarIcon className="inline" size={10} />)
                  </label>
                  <Input
                    type="number"
                    value={targetRevenue}
                    onChange={(e) => setTargetRevenue(e.target.value)}
                    placeholder="0"
                    className="rounded-xl border-gray-200 text-left text-lg font-bold"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#007AFF]" />
                    عدد العملاء الجدد
                  </label>
                  <Input
                    type="number"
                    value={targetClients}
                    onChange={(e) => setTargetClients(e.target.value)}
                    placeholder="0"
                    className="rounded-xl border-gray-200 text-left text-lg font-bold"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#AF52DE]" />
                    عدد الزيارات
                  </label>
                  <Input
                    type="number"
                    value={targetVisits}
                    onChange={(e) => setTargetVisits(e.target.value)}
                    placeholder="0"
                    className="rounded-xl border-gray-200 text-left text-lg font-bold"
                    dir="ltr"
                  />
                </div>
                <Button
                  onClick={handleSetGoal}
                  disabled={submitting || (!targetRevenue && !targetClients && !targetVisits)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-semibold"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'حفظ الأهداف'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="p-4">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#007AFF] to-[#5856D6] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <Target className="w-5 h-5" />
              <h3 className="text-base font-bold">أهداف اليوم</h3>
              {/* Streak Badge */}
              {streakData && streakData.currentStreak > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    streakData.currentStreak >= 7
                      ? 'bg-gradient-to-r from-[#FFD700] to-[#FF9500] text-white shadow-lg shadow-[#FFD700]/30'
                      : 'bg-white/15 text-white'
                  }`}
                >
                  <motion.span
                    animate={streakData.currentStreak > 0 ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
                    className="inline-block"
                  >
                    🔥
                  </motion.span>
                  <span>{streakData.currentStreak} أيام</span>
                </motion.div>
              )}
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-xs"
                >
                  <Zap className="w-3.5 h-3.5 ml-1" />
                  تعديل
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-sm mx-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-right flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#007AFF]" />
                    تعديل أهداف اليوم
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-[#34C759]" />
                      هدف الإيرادات (<SarIcon className="inline" size={10} />)
                    </label>
                    <Input
                      type="number"
                      value={targetRevenue || goalData.targetRevenue}
                      onChange={(e) => setTargetRevenue(e.target.value)}
                      placeholder="0"
                      className="rounded-xl border-gray-200 text-left text-lg font-bold"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#007AFF]" />
                      عدد العملاء الجدد
                    </label>
                    <Input
                      type="number"
                      value={targetClients || goalData.targetClients}
                      onChange={(e) => setTargetClients(e.target.value)}
                      placeholder="0"
                      className="rounded-xl border-gray-200 text-left text-lg font-bold"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#AF52DE]" />
                      عدد الزيارات
                    </label>
                    <Input
                      type="number"
                      value={targetVisits || goalData.targetVisits}
                      onChange={(e) => setTargetVisits(e.target.value)}
                      placeholder="0"
                      className="rounded-xl border-gray-200 text-left text-lg font-bold"
                      dir="ltr"
                    />
                  </div>
                  <Button
                    onClick={handleSetGoal}
                    disabled={submitting || (!targetRevenue && !targetClients && !targetVisits)}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-semibold"
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'حفظ الأهداف'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Motivational Message + Streak Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-lg">{motivational.emoji}</span>
            <p className="text-xs text-white/90 flex-1">{motivational.message}</p>
          </div>
          {/* Best streak indicator */}
          {streakData && streakData.bestStreak > 0 && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <Flame className="w-3 h-3 text-white/50" />
              <span className="text-[10px] text-white/50">أفضل سلسلة: {streakData.bestStreak} يوم</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Today's Goal Progress Ring + Overall Progress Ring */}
          <div className="flex justify-center mb-5 relative">
            <CircularProgress value={overallPct} max={100} color={overallPct >= 100 ? '#34C759' : '#007AFF'} size={120} strokeWidth={8}>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#1c1c1e]">{overallPct}%</p>
                <p className="text-[10px] text-gray-400">إنجاز عام</p>
              </div>
            </CircularProgress>
            {/* Today's revenue ring (bottom-left of main ring) */}
            {streakData && streakData.todayProgress.target > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute bottom-0 left-0"
              >
                <CircularProgress
                  value={streakData.todayProgress.percentage}
                  max={100}
                  color={streakData.todayProgress.percentage >= 100 ? '#34C759' : '#FF9500'}
                  size={44}
                  strokeWidth={4}
                >
                  <span className="text-[9px] font-bold text-[#1c1c1e]">
                    {Math.min(streakData.todayProgress.percentage, 999)}%
                  </span>
                </CircularProgress>
                <p className="text-[8px] text-gray-400 text-center mt-0.5">إيرادات اليوم</p>
              </motion.div>
            )}
          </div>

          {/* Individual Progress Rings */}
          <div className="grid grid-cols-3 gap-3">
            {/* Revenue */}
            <div className="text-center">
              <CircularProgress
                value={aRevenue}
                max={tRevenue || 1}
                color="#34C759"
                size={64}
                strokeWidth={5}
              >
                <DollarSign className="w-4 h-4 text-[#34C759]" />
              </CircularProgress>
              <p className="text-[11px] text-gray-500 mt-1.5 font-medium">الإيرادات</p>
              <p className="text-xs font-bold text-[#1c1c1e]">
                {aRevenue.toLocaleString('ar-SA')}
              </p>
              <p className="text-[10px] text-gray-400">
                من {tRevenue.toLocaleString('ar-SA')}
              </p>
            </div>

            {/* Clients */}
            <div className="text-center">
              <CircularProgress
                value={aClients}
                max={tClients || 1}
                color="#007AFF"
                size={64}
                strokeWidth={5}
              >
                <Users className="w-4 h-4 text-[#007AFF]" />
              </CircularProgress>
              <p className="text-[11px] text-gray-500 mt-1.5 font-medium">العملاء</p>
              <p className="text-xs font-bold text-[#1c1c1e]">
                {aClients}
              </p>
              <p className="text-[10px] text-gray-400">
                من {tClients}
              </p>
            </div>

            {/* Visits */}
            <div className="text-center">
              <CircularProgress
                value={aVisits}
                max={tVisits || 1}
                color="#AF52DE"
                size={64}
                strokeWidth={5}
              >
                <MapPin className="w-4 h-4 text-[#AF52DE]" />
              </CircularProgress>
              <p className="text-[11px] text-gray-500 mt-1.5 font-medium">الزيارات</p>
              <p className="text-xs font-bold text-[#1c1c1e]">
                {aVisits}
              </p>
              <p className="text-[10px] text-gray-400">
                من {tVisits}
              </p>
            </div>
          </div>

          {/* Completion Badges */}
          {overallPct >= 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 bg-gradient-to-l from-[#FFD60A]/10 to-[#FF9500]/10 rounded-xl p-3 text-center"
            >
              <Trophy className="w-6 h-6 text-[#FF9500] mx-auto mb-1" />
              <p className="text-sm font-bold text-[#FF9500]">🎉 أهداف اليوم مكتملة!</p>
              <p className="text-[11px] text-gray-500">استمر في هذا المستوى الرائع</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
