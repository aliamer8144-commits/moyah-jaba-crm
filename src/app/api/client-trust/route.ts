import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/client-trust?clientId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "معرف العميل مطلوب" }, { status: 400 });
    }

    // Fetch all invoices for this client
    const invoices = await db.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
    });

    if (invoices.length === 0) {
      return NextResponse.json({
        score: 50,
        level: "متوسط",
        color: "#FF9500",
        details: {
          paymentRatio: 0,
          paymentSpeed: 0,
          purchaseVolume: 0,
        },
      });
    }

    // --- 1. Payment Ratio (50% weight) ---
    // % of invoices fully paid (debtAmount === 0)
    const fullyPaidCount = invoices.filter((inv) => inv.debtAmount === 0).length;
    const paymentRatio = fullyPaidCount / invoices.length;

    // --- 2. Payment Speed (30% weight) ---
    // Average days to pay: for invoices with debt that was later paid (debtAmount === 0 now)
    // We use receipt data to calculate how quickly debt was settled
    const receipts = await db.receipt.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
    });

    let paymentSpeedScore = 0.5; // default middle score

    if (receipts.length > 0) {
      // For each invoice that was paid, find when the debt was settled
      const invoicesWithDebt = invoices.filter((inv) => inv.debtAmount > 0);
      const settledInvoices: number[] = [];

      for (const inv of invoicesWithDebt) {
        // Check if the client has enough receipts after this invoice to cover the debt
        const receiptsAfter = receipts.filter(
          (r) => new Date(r.createdAt) >= new Date(inv.createdAt)
        );
        const totalReceiptsAfter = receiptsAfter.reduce((sum, r) => sum + r.amount, 0);

        if (totalReceiptsAfter >= inv.debtAmount) {
          // Find the first receipt that settles or partially settles
          let cumulative = 0;
          for (const r of receiptsAfter) {
            cumulative += r.amount;
            if (cumulative >= inv.debtAmount) {
              const daysDiff = Math.floor(
                (new Date(r.createdAt).getTime() - new Date(inv.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              settledInvoices.push(daysDiff);
              break;
            }
          }
        }
      }

      if (settledInvoices.length > 0) {
        const avgDays = settledInvoices.reduce((a, b) => a + b, 0) / settledInvoices.length;
        // Score based on days: 0 days = 100, 30+ days = 0
        if (avgDays <= 0) {
          paymentSpeedScore = 1;
        } else if (avgDays <= 7) {
          paymentSpeedScore = 0.9;
        } else if (avgDays <= 14) {
          paymentSpeedScore = 0.75;
        } else if (avgDays <= 21) {
          paymentSpeedScore = 0.6;
        } else if (avgDays <= 30) {
          paymentSpeedScore = 0.4;
        } else {
          paymentSpeedScore = 0.2;
        }
      } else if (invoicesWithDebt.length === 0) {
        // All invoices were fully paid upfront
        paymentSpeedScore = 1;
      } else {
        paymentSpeedScore = 0.1;
      }
    } else {
      // No receipts, check if all invoices are paid upfront
      const allPaidUpfront = invoices.every((inv) => inv.debtAmount === 0);
      if (allPaidUpfront) {
        paymentSpeedScore = 1;
      }
    }

    // --- 3. Purchase Volume (20% weight) ---
    const totalPurchases = invoices.reduce((sum, inv) => sum + inv.finalTotal, 0);
    let purchaseVolumeScore = 0.5;
    if (totalPurchases >= 50000) {
      purchaseVolumeScore = 1;
    } else if (totalPurchases >= 20000) {
      purchaseVolumeScore = 0.85;
    } else if (totalPurchases >= 10000) {
      purchaseVolumeScore = 0.7;
    } else if (totalPurchases >= 5000) {
      purchaseVolumeScore = 0.55;
    } else if (totalPurchases >= 1000) {
      purchaseVolumeScore = 0.4;
    } else {
      purchaseVolumeScore = 0.2;
    }

    // Calculate weighted score
    const rawScore =
      paymentRatio * 50 + paymentSpeedScore * 30 + purchaseVolumeScore * 20;
    const score = Math.round(Math.min(Math.max(rawScore, 0), 100));

    // Determine level and color
    let level: string;
    let color: string;
    if (score >= 80) {
      level = "ممتاز";
      color = "#34C759";
    } else if (score >= 60) {
      level = "جيد";
      color = "#007AFF";
    } else if (score >= 40) {
      level = "متوسط";
      color = "#FF9500";
    } else {
      level = "ضعيف";
      color = "#FF3B30";
    }

    return NextResponse.json({
      score,
      level,
      color,
      details: {
        paymentRatio: Math.round(paymentRatio * 100),
        paymentSpeed: Math.round(paymentSpeedScore * 100),
        purchaseVolume: Math.round(purchaseVolumeScore * 100),
        totalInvoices: invoices.length,
        totalPurchases,
        fullyPaidCount,
      },
    });
  } catch (error) {
    console.error("Client trust score error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
