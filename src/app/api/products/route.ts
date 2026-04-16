import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/products?adminId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    }

    const products = await db.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, name, size, price, isActive } = body;

    if (!adminId) {
      return NextResponse.json({ error: "معرف المدير مطلوب" }, { status: 400 });
    }

    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (!name || !size || price === undefined) {
      return NextResponse.json({ error: "اسم المنتج والحجم والسعر مطلوبين" }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        name,
        size,
        price: parseFloat(price),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// PUT /api/products?productId=xxx
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "معرف المنتج مطلوب" }, { status: 400 });
    }

    const body = await request.json();
    const { adminId, name, size, price, isActive } = body;

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (size !== undefined) updateData.size = size;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await db.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// DELETE /api/products?productId=xxx&adminId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const adminId = searchParams.get("adminId");

    if (!productId) {
      return NextResponse.json({ error: "معرف المنتج مطلوب" }, { status: 400 });
    }

    if (adminId) {
      const admin = await db.user.findUnique({ where: { id: adminId } });
      if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    }

    await db.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
