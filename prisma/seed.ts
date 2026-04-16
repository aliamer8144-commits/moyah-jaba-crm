import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Admin User
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'مدير النظام',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      phone: '0500000000',
      isActive: true,
    },
  })
  console.log(`✅ Admin created: ${admin.username}`)

  // 2. Create Rep Users
  const repsData = [
    { name: 'أحمد محمد', username: 'rep1', phone: '0511111111' },
    { name: 'خالد عبدالله', username: 'rep2', phone: '0522222222' },
    { name: 'سعد العمري', username: 'rep3', phone: '0533333333' },
  ]

  const repPassword = await hash('rep123', 12)
  const reps: Record<string, typeof repsData[0]> = {}

  for (const repData of repsData) {
    const rep = await prisma.user.upsert({
      where: { username: repData.username },
      update: {},
      create: {
        name: repData.name,
        username: repData.username,
        password: repPassword,
        role: 'REP',
        phone: repData.phone,
        isActive: true,
        allocatedInventory: 100,
      },
    })
    reps[rep.username] = repData
    console.log(`✅ Rep created: ${rep.username} (${rep.name})`)
  }

  // 3. Create Products
  const productsData = [
    { name: 'مياه جبأ عادية', size: 'عادي', price: 10 },
    { name: 'مياه جبأ صغيرة', size: 'صغير', price: 7 },
    { name: 'مياه جبأ كبيرة', size: 'كبير', price: 15 },
  ]

  for (const pData of productsData) {
    const product = await prisma.product.upsert({
      where: { id: `${pData.name}-${pData.size}` },
      update: {},
      create: pData,
    })
    console.log(`✅ Product created: ${product.name} (${product.size}) - ${product.price} ر.س`)
  }

  // 4. Create Sample Clients for rep1
  const clientsData = [
    { name: 'متجر النور', businessName: 'متجر النور للمواد الغذائية', phone: '0551111111', category: 'متجر' },
    { name: 'مطعم السعادة', businessName: 'مطعم السعادة', phone: '0552222222', category: 'مطعم' },
    { name: 'مكتبة الأمل', businessName: 'مكتبة الأمل', phone: '0553333333', category: 'مكتبة' },
    { name: 'عيادة الشفاء', businessName: 'عيادة الشفاء الطبية', phone: '0554444444', category: 'عيادة' },
    { name: 'بقالة البركة', businessName: 'بقالة البركة', phone: '0555555555', category: 'بقالة' },
  ]

  const rep1 = await prisma.user.findUnique({ where: { username: 'rep1' } })
  if (rep1) {
    for (const cData of clientsData) {
      const client = await prisma.client.create({
        data: {
          repId: rep1.id,
          ...cData,
        },
      })
      console.log(`✅ Client created: ${client.name}`)
    }
  }

  // 5. Create Sample Invoices for rep1
  const products = await prisma.product.findMany()
  const clients = await prisma.client.findMany({ where: { repId: rep1?.id } })

  if (rep1 && clients.length > 0 && products.length > 0) {
    for (let i = 0; i < Math.min(3, clients.length); i++) {
      const product = products[i % products.length]
      const client = clients[i]
      const quantity = (i + 1) * 10
      const total = product.price * quantity

      await prisma.invoice.create({
        data: {
          repId: rep1.id,
          clientId: client.id,
          productId: product.id,
          productSize: product.size,
          quantity,
          price: product.price,
          total,
          discountType: 'none',
          discountValue: 0,
          finalTotal: total,
          promotionQty: 0,
          paidAmount: i === 0 ? total : Math.floor(total / 2),
          debtAmount: i === 0 ? 0 : Math.floor(total / 2),
          creditAmount: 0,
        },
      })
      console.log(`✅ Invoice created for: ${client.name}`)
    }
  }

  // 6. Create App Settings
  const settingsData = [
    { key: 'company_name', value: 'مياه جبأ' },
    { key: 'currency', value: 'ر.س' },
    { key: 'tax_rate', value: '15' },
    { key: 'default_target_revenue', value: '5000' },
    { key: 'default_target_clients', value: '10' },
    { key: 'default_target_visits', value: '15' },
  ]

  for (const sData of settingsData) {
    await prisma.appSettings.upsert({
      where: { key: sData.key },
      update: { value: sData.value },
      create: sData,
    })
  }
  console.log('✅ App settings created')

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📋 Login credentials:')
  console.log('   Admin:  admin / admin123')
  console.log('   Rep 1:  rep1 / rep123')
  console.log('   Rep 2:  rep2 / rep123')
  console.log('   Rep 3:  rep3 / rep123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
