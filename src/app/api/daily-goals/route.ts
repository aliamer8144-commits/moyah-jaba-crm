import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";

// GET /api/daily-goals?repId=xxx&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const dateStr = searchParams.get("date");

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    // Build date filter
    const today = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    let goal = await db.dailyGoal.findFirst({
      where: {
        repId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Auto-calculate actual values from today's data
    const todayInvoices = await db.invoice.findMany({
      where: {
        repId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    const todayClients = await db.client.findMany({
      where: {
        repId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    const actualRevenue = todayInvoices.reduce((sum, inv) => sum + inv.finalTotal, 0);
    const actualClients = todayClients.length;

    // If goal exists, update actual values
    if (goal) {
      await db.dailyGoal.update({
        where: { id: goal.id },
        data: {
          actualRevenue,
          actualClients,
        },
      });
      goal = {
        ...goal,
        actualRevenue,
        actualClients,
      };
    }

    return NextResponse.json({
      goal,
      actualRevenue,
      actualClients,
    });
  } catch (error) {
    console.error("Get daily goals error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/daily-goals - Create or update daily goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repId, targetRevenue, targetClients } = body;

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    // Check if a goal already exists for today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingGoal = await db.dailyGoal.findFirst({
      where: {
        repId,
        date: { gte: startOfDay, lt: endOfDay },
      },
    });

    if (existingGoal) {
      // Update existing goal
      const updated = await withRetry(() => db.dailyGoal.update({
        where: { id: existingGoal.id },
        data: {
          targetRevenue: targetRevenue ?? 0,
          targetClients: targetClients ?? 0,
        },
      }));
      return NextResponse.json(updated);
    }

    // Create new goal
    const goal = await withRetry(() => db.dailyGoal.create({
      data: {
        repId,
        targetRevenue: targetRevenue ?? 0,
        targetClients: targetClients ?? 0,
        actualRevenue: 0,
        actualClients: 0,
      },
    }));

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Create daily goal error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PUT /api/daily-goals - Update actual progress
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalId, actualRevenue, actualClients } = body;

    if (!goalId) {
      return NextResponse.json({ error: "معرف الهدف مطلوب" }, { status: 400 });
    }

    const updated = await withRetry(() => db.dailyGoal.update({
      where: { id: goalId },
      data: {
        ...(actualRevenue !== undefined && { actualRevenue }),
        ...(actualClients !== undefined && { actualClients }),
      },
    }));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update daily goal error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
