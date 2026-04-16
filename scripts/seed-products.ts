import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if products already exist
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`Already have ${existing} products, skipping seed.`);
    return;
  }

  const products = [
    { name: 'مياه جبأ 18 لتر', size: '18 لتر', price: 15 },
    { name: 'مياه جبأ 500 مل', size: '500 مل', price: 2 },
    { name: 'مياه جبأ 1.5 لتر', size: '1.5 لتر', price: 5 },
    { name: 'مياه جبأ 5 جالون', size: '5 جالون', price: 25 },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
    console.log(`Created product: ${p.name} (${p.size}) - ${p.price} ر.س`);
  }

  console.log('Seeded 4 default products.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
