import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRetry } from "@/lib/retry";

// GET /api/clients?repId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const adminId = searchParams.get("adminId");
    const clientId = searchParams.get("clientId");

    if (clientId) {
      const client = await db.client.findUnique({
        where: { id: clientId },
        include: {
          _count: { select: { invoices: true } },
        },
      });
      return NextResponse.json(client);
    }

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      const filterRep = searchParams.get("filterRepId");
      const clients = await db.client.findMany({
        where: filterRep ? { repId: filterRep } : {},
        include: { rep: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(clients);
    }

    if (!repId) {
      return NextResponse.json({ error: "معرف المندوب مطلوب" }, { status: 400 });
    }

    const clients = await db.client.findMany({
      where: { repId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Get clients error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/clients
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repId, name, businessName, phone, address, category, notes, createdByAdmin } = body;

    if (!repId || !name) {
      return NextResponse.json({ error: "اسم العميل مطلوب" }, { status: 400 });
    }

    const client = await withRetry(() => db.client.create({
      data: {
        repId,
        name,
        businessName: businessName || null,
        phone: phone || null,
        address: address || null,
        category: category || null,
        notes: notes || null,
      },
    }));

    // Log activity
    await withRetry(() => db.activityLog.create({
      data: {
        repId,
        action: "إنشاء عميل",
        details: `تم إنشاء عميل جديد: ${name}`,
      },
    }));

    // Create notification for admin
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await withRetry(() => db.notification.create({
        data: {
          userId: admin.id,
          title: "عميل جديد",
          message: `تم إنشاء عميل "${name}" بواسطة المندوب`,
          type: "info",
        },
      }));
    }

    // If created by admin, notify the rep
    if (createdByAdmin) {
      await withRetry(() => db.notification.create({
        data: {
          userId: repId,
          title: "عميل جديد من المدير",
          message: `تم إنشاء عميل "${name}" من قبل المدير وإضافته لحسابك`,
          type: "info",
        },
      }));
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PUT /api/clients?clientId=xxx - Update client fields (e.g., notes)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "معرف العميل مطلوب" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.name) updateData.name = body.name;
    if (body.businessName !== undefined) updateData.businessName = body.businessName;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.category !== undefined) updateData.category = body.category;

    const client = await withRetry(() => db.client.update({
      where: { id: clientId },
      data: updateData,
    }));

    return NextResponse.json(client);
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PATCH /api/clients - Update client (only via approved request)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, name, businessName, phone, address, category, notes } = body;

    if (!clientId) {
      return NextResponse.json({ error: "معرف العميل مطلوب" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes;

    const client = await withRetry(() => db.client.update({
      where: { id: clientId },
      data: updateData,
    }));

    return NextResponse.json(client);
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/clients
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "معرف العميل مطلوب" }, { status: 400 });
    }

    await withRetry(() => db.client.delete({ where: { id: clientId } }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
