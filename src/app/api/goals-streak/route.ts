import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/goals-streak?repId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    // Fetch all daily goals for this rep, ordered by date descending
    const allGoals = await db.dailyGoal.findMany({
      where: { repId },
      orderBy: { date: "desc" },
    });

    if (allGoals.length === 0) {
      return NextResponse.json({
        currentStreak: 0,
        bestStreak: 0,
        lastGoalDate: null,
        todayProgress: { actual: 0, target: 0, percentage: 0 },
      });
    }

    // Calculate today's progress
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Check for today's goal
    const todayGoal = allGoals.find((g) => {
      const goalDate = new Date(g.date);
      return goalDate >= startOfToday && goalDate < endOfToday;
    });

    // Also calculate today's actual from invoices
    const todayInvoices = await db.invoice.findMany({
      where: {
        repId,
        createdAt: { gte: startOfToday, lt: endOfToday },
      },
    });
    const todayActual = todayInvoices.reduce((sum, inv) => sum + inv.finalTotal, 0);
    const todayTarget = todayGoal?.targetRevenue || 0;
    const todayPercentage = todayTarget > 0 ? Math.round((todayActual / todayTarget) * 100) : 0;

    // Helper: check if a goal was met (actual revenue >= target revenue)
    const isGoalMet = (goal: typeof allGoals[0]) => {
      // If targetRevenue is 0, we consider it as met if the goal exists
      if (goal.targetRevenue <= 0) return true;
      return goal.actualRevenue >= goal.targetRevenue;
    };

    // Get unique dates as strings for easier comparison
    const dateMap = new Map<string, typeof allGoals[0]>();
    for (const goal of allGoals) {
      const dateStr = new Date(goal.date).toISOString().split("T")[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, goal);
      }
    }

    const sortedDates = Array.from(dateMap.keys()).sort().reverse();

    // Calculate current streak (going backwards from most recent)
    let currentStreak = 0;
    // Check today first
    const todayStr = today.toISOString().split("T")[0];
    const hasTodayGoal = dateMap.has(todayStr);

    if (hasTodayGoal) {
      if (isGoalMet(dateMap.get(todayStr)!)) {
        currentStreak = 1;
        // Continue checking backwards
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date();
          prevDate.setDate(prevDate.getDate() - i);
          const prevDateStr = prevDate.toISOString().split("T")[0];

          const goal = dateMap.get(prevDateStr);
          if (goal && isGoalMet(goal)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    } else {
      // Check yesterday as starting point
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const yesterdayGoal = dateMap.get(yesterdayStr);
      if (yesterdayGoal && isGoalMet(yesterdayGoal)) {
        currentStreak = 1;
        for (let i = 2; i < sortedDates.length; i++) {
          const prevDate = new Date();
          prevDate.setDate(prevDate.getDate() - i);
          const prevDateStr = prevDate.toISOString().split("T")[0];

          const goal = dateMap.get(prevDateStr);
          if (goal && isGoalMet(goal)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Calculate best streak (scan all dates)
    let bestStreak = 0;
    let tempStreak = 0;
    const allDatesSorted = Array.from(dateMap.keys()).sort();

    for (let i = 0; i < allDatesSorted.length; i++) {
      const goal = dateMap.get(allDatesSorted[i]);
      if (goal && isGoalMet(goal)) {
        // Check if consecutive with previous day
        if (i > 0) {
          const prevDate = new Date(allDatesSorted[i - 1]);
          const currDate = new Date(allDatesSorted[i]);
          const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);
          if (diffDays === 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Get last goal date
    const lastGoalDate = allGoals[0]?.date?.toISOString() || null;

    return NextResponse.json({
      currentStreak,
      bestStreak,
      lastGoalDate,
      todayProgress: {
        actual: todayActual,
        target: todayTarget,
        percentage: Math.min(todayPercentage, 999),
      },
    });
  } catch (error) {
    console.error("Get goals streak error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
