import { prisma } from '../db/prisma';

// In-Memory Cache map with TTL (60 seconds)
const cacheMap = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds cache

function getCached<T>(key: string): T | null {
  const cached = cacheMap.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  cacheMap.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

export class CatalogService {
  public static clearCache() {
    cacheMap.clear();
  }

  // Zones & Blocks
  public static async getActiveZones() {
    const cacheKey = 'active_zones';
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const zones = await prisma.zone.findMany({
      where: { isEnabled: true },
      include: {
        blocks: {
          where: { isEnabled: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    setCache(cacheKey, zones);
    return zones;
  }

  public static async getBlocksByZone(zoneId: string) {
    const cacheKey = `blocks_${zoneId}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const blocks = await prisma.block.findMany({
      where: { zoneId, isEnabled: true },
      orderBy: { name: 'asc' }
    });

    setCache(cacheKey, blocks);
    return blocks;
  }

  // Restaurants
  public static async getRestaurantsByBlock(zoneId: string, blockId: string) {
    const cacheKey = `restaurants_${zoneId}_${blockId}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const restaurants = await prisma.restaurant.findMany({
      where: { zoneId, blockId, isEnabled: true },
      orderBy: { name: 'asc' }
    });

    setCache(cacheKey, restaurants);
    return restaurants;
  }

  public static async getRestaurantById(id: string) {
    const cacheKey = `restaurant_${id}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        zone: true,
        block: true
      }
    });

    if (restaurant) setCache(cacheKey, restaurant);
    return restaurant;
  }

  // Menu Categories & Items
  public static async getMenuForRestaurant(restaurantId: string) {
    const cacheKey = `menu_${restaurantId}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) throw new Error('Restaurant not found');

    const categories = await prisma.foodCategory.findMany({
      where: { restaurantId, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        foodItems: {
          where: { isAvailable: true, inStock: true }
        }
      }
    });

    // Apply default image fallback logic
    const result = categories.map(cat => ({
      ...cat,
      foodItems: cat.foodItems.map(item => ({
        ...item,
        effectiveImageUrl: item.imageUrl && item.imageUrl.trim().length > 0 ? item.imageUrl : restaurant.defaultImageUrl
      }))
    }));

    setCache(cacheKey, result);
    return result;
  }

  // Pickup Slots
  public static async getPickupSlotsForRestaurant(restaurantId: string) {
    return prisma.pickupSlot.findMany({
      where: { restaurantId, isEnabled: true },
      orderBy: { slotTime: 'asc' }
    });
  }

  // Coupon lookup & validation
  public static async validateCoupon(code: string, cartTotal: number) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon || !coupon.isEnabled) {
      return { valid: false, message: 'Invalid or inactive coupon code.' };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, message: 'Coupon code has expired.' };
    }

    if (cartTotal < coupon.minOrderAmount) {
      return { valid: false, message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount.toFixed(2)}.` };
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue;
    }

    if (discount > cartTotal) discount = cartTotal;

    return {
      valid: true,
      coupon,
      discountAmount: discount,
      finalTotal: cartTotal - discount,
      message: `Coupon applied! You saved ₹${discount.toFixed(2)}.`
    };
  }
}
