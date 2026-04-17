import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * POST /api/setup
 * Auto-seeds the database with default users and products on first visit.
 * Safe to call multiple times — uses upsert patterns.
 */
export async function POST() {
  try {
    // 1. Create Admin User
    const adminPassword = await hashPassword("admin123");
    const admin = await db.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        name: "مدير النظام",
        username: "admin",
        password: adminPassword,
        role: "ADMIN",
        phone: "0500000000",
        isActive: true,
      },
    });

    // 2. Create Rep Users
    const repsData = [
      { name: "أحمد محمد", username: "rep1", phone: "0511111111" },
      { name: "خالد عبدالله", username: "rep2", phone: "0522222222" },
      { name: "سعد العمري", username: "rep3", phone: "0533333333" },
    ];

    const repPassword = await hashPassword("rep123");
    for (const repData of repsData) {
      await db.user.upsert({
        where: { username: repData.username },
        update: {},
        create: {
          name: repData.name,
          username: repData.username,
          password: repPassword,
          role: "REP",
          phone: repData.phone,
          isActive: true,
          allocatedInventory: 100,
        },
      });
    }

    // 3. Create default products if not exist
    const productsData = [
      { id: "prod-default-1", name: "مياه جبأ عادية", size: "عادي", price: 10 },
      { id: "prod-default-2", name: "مياه جبأ صغيرة", size: "صغير", price: 7 },
      { id: "prod-default-3", name: "مياه جبأ كبيرة", size: "كبير", price: 15 },
    ];

    for (const pData of productsData) {
      await db.product.upsert({
        where: { id: pData.id },
        update: {},
        create: pData,
      });
    }

    // 4. Create app settings
    const settingsData = [
      { key: "company_name", value: "مياه جبأ" },
      { key: "currency", value: "ر.س" },
      { key: "tax_rate", value: "15" },
      { key: "default_target_revenue", value: "5000" },
      { key: "default_target_clients", value: "10" },
      { key: "default_target_visits", value: "15" },
    ];

    for (const sData of settingsData) {
      await db.appSettings.upsert({
        where: { key: sData.key },
        update: { value: sData.value },
        create: sData,
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم إعداد قاعدة البيانات بنجاح",
      admin: { username: admin.username, role: admin.role },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إعداد قاعدة البيانات" },
      { status: 500 }
    );
  }
}
