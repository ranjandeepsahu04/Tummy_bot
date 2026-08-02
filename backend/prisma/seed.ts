import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

// Default realistic restaurant cover image URLs palette for variety
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80',
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&q=80',
  'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&q=80'
];

async function main() {
  console.log('🌱 Seeding database from Project2_merged_data.xlsx...');

  // 1. Create Super Admin
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@tummybot.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@tummybot.com',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isEnabled: true
    }
  });
  console.log('✅ Super Admin created (admin@tummybot.com / Admin@12345)');

  // 2. Load Excel Data
  const filePath = path.join(__dirname, '..', '..', 'Project2_merged_data.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  console.log(`📊 Processing ${rows.length} menu rows from dataset...`);

  const zoneMap = new Map<string, string>(); // Zone name -> Zone ID
  const blockMap = new Map<string, string>(); // ZoneID:BlockName -> Block ID
  const restaurantMap = new Map<string, string>(); // RestaurantName -> Restaurant ID
  const categoryMap = new Map<string, string>(); // RestaurantID:CategoryName -> Category ID

  let imageIndex = 0;

  for (const row of rows) {
    const areaName = String(row.Area || 'Main Zone').trim();
    const blockName = String(row.Block || 'Main Block').trim();
    const restaurantName = String(row.Restaurant || 'Food Station').trim();
    const categoryName = String(row.Category || 'General').trim();
    const itemName = String(row.Item || 'Food Item').trim();
    const price = parseFloat(row.Price) || 100;

    // A. Ensure Zone exists
    let zoneId = zoneMap.get(areaName);
    if (!zoneId) {
      const zone = await prisma.zone.upsert({
        where: { name: areaName },
        update: {},
        create: { name: areaName }
      });
      zoneId = zone.id;
      zoneMap.set(areaName, zoneId);
    }

    // B. Ensure Block exists
    const blockKey = `${zoneId}:${blockName}`;
    let blockId = blockMap.get(blockKey);
    if (!blockId) {
      const block = await prisma.block.upsert({
        where: { zoneId_name: { zoneId, name: blockName } },
        update: {},
        create: { zoneId, name: blockName }
      });
      blockId = block.id;
      blockMap.set(blockKey, blockId);
    }

    // C. Ensure Restaurant exists (with default cover image & UPI)
    let restaurantId = restaurantMap.get(restaurantName);
    if (!restaurantId) {
      const defaultImg = DEFAULT_IMAGES[imageIndex % DEFAULT_IMAGES.length];
      imageIndex++;

      const resObj = await prisma.restaurant.create({
        data: {
          name: restaurantName,
          zoneId,
          blockId,
          address: `${blockName}, ${areaName}`,
          phone: `+919876${Math.floor(100000 + Math.random() * 900000)}`,
          defaultImageUrl: defaultImg,
          upiId: `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`,
          upiName: restaurantName
        }
      });
      restaurantId = resObj.id;
      restaurantMap.set(restaurantName, restaurantId);

      // Create standard pickup time slots for this restaurant
      await prisma.pickupSlot.createMany({
        data: [
          { restaurantId, slotTime: '12:00 PM - 12:30 PM', maxOrders: 30 },
          { restaurantId, slotTime: '12:30 PM - 01:00 PM', maxOrders: 30 },
          { restaurantId, slotTime: '01:00 PM - 01:30 PM', maxOrders: 30 },
          { restaurantId, slotTime: '07:00 PM - 07:30 PM', maxOrders: 30 },
          { restaurantId, slotTime: '08:00 PM - 08:30 PM', maxOrders: 30 }
        ]
      });
    }

    // D. Ensure Category exists
    const categoryKey = `${restaurantId}:${categoryName}`;
    let categoryId = categoryMap.get(categoryKey);
    if (!categoryId) {
      const catObj = await prisma.foodCategory.create({
        data: {
          restaurantId,
          name: categoryName,
          sortOrder: categoryMap.size + 1
        }
      });
      categoryId = catObj.id;
      categoryMap.set(categoryKey, categoryId);
    }

    // E. Create Food Item (automatically uses restaurant default image)
    await prisma.foodItem.create({
      data: {
        restaurantId,
        categoryId,
        name: itemName,
        price,
        imageUrl: null,
        isAvailable: true,
        inStock: true
      }
    });
  }

  // 3. Create Default Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderAmount: 150,
      maxDiscountAmount: 50
    }
  });

  await prisma.coupon.upsert({
    where: { code: 'FLAT50' },
    update: {},
    create: {
      code: 'FLAT50',
      discountType: 'FLAT',
      discountValue: 50,
      minOrderAmount: 300
    }
  });

  console.log(`🎉 Success! Seeded ${zoneMap.size} Zones, ${blockMap.size} Blocks, ${restaurantMap.size} Restaurants, ${categoryMap.size} Categories, and ${rows.length} Menu Items!`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
