import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { prisma } from '../db/prisma';
import { AuditService } from '../services/auditService';

export class CatalogController {
  // === ZONES & BLOCKS ===
  public static async getZones(req: AuthenticatedRequest, res: Response) {
    const zones = await prisma.zone.findMany({
      include: { blocks: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: zones });
  }

  public static async createZone(req: AuthenticatedRequest, res: Response) {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Zone name is required.' });

    const zone = await prisma.zone.create({ data: { name } });
    await AuditService.log(req.user?.adminId, 'CREATE_ZONE', `Zone:${zone.id}`, `Created zone ${name}`);
    return res.json({ success: true, data: zone });
  }

  public static async createBlock(req: AuthenticatedRequest, res: Response) {
    const { zoneId, name } = req.body;
    if (!zoneId || !name) return res.status(400).json({ success: false, error: 'zoneId and block name are required.' });

    const block = await prisma.block.create({ data: { zoneId, name } });
    await AuditService.log(req.user?.adminId, 'CREATE_BLOCK', `Block:${block.id}`, `Created block ${name}`);
    return res.json({ success: true, data: block });
  }

  // === RESTAURANTS ===
  public static async getRestaurants(req: AuthenticatedRequest, res: Response) {
    const restaurants = await prisma.restaurant.findMany({
      include: { zone: true, block: true, foodCategories: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: restaurants });
  }

  public static async createRestaurant(req: AuthenticatedRequest, res: Response) {
    const { name, zoneId, blockId, address, phone, defaultImageUrl, upiId, upiName } = req.body;

    if (!name || !zoneId || !blockId || !address || !phone || !defaultImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required restaurant parameters (name, zoneId, blockId, address, phone, defaultImageUrl).'
      });
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        zoneId,
        blockId,
        address,
        phone,
        defaultImageUrl,
        upiId: upiId || 'merchant@upi',
        upiName: upiName || name
      }
    });

    await AuditService.log(req.user?.adminId, 'CREATE_RESTAURANT', `Restaurant:${restaurant.id}`, `Created restaurant ${name}`);
    return res.json({ success: true, data: restaurant });
  }

  public static async updateRestaurant(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const updates = req.body;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: updates
    });

    await AuditService.log(req.user?.adminId, 'UPDATE_RESTAURANT', `Restaurant:${id}`, `Updated restaurant ${restaurant.name}`);
    return res.json({ success: true, data: restaurant });
  }

  // === CATEGORIES & FOOD ITEMS ===
  public static async getCategories(req: AuthenticatedRequest, res: Response) {
    const { restaurantId } = req.query;
    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId as string;

    const categories = await prisma.foodCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });
    return res.json({ success: true, data: categories });
  }

  public static async createCategory(req: AuthenticatedRequest, res: Response) {
    const { restaurantId, name, sortOrder } = req.body;
    if (!restaurantId || !name) {
      return res.status(400).json({ success: false, error: 'restaurantId and name are required.' });
    }

    const category = await prisma.foodCategory.create({
      data: { restaurantId, name, sortOrder: sortOrder || 0 }
    });

    return res.json({ success: true, data: category });
  }

  public static async getFoodItems(req: AuthenticatedRequest, res: Response) {
    const { restaurantId, categoryId } = req.query;
    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId as string;
    if (categoryId) where.categoryId = categoryId as string;

    const items = await prisma.foodItem.findMany({
      where,
      include: { restaurant: true, category: true },
      orderBy: { name: 'asc' }
    });

    // Map default image fallback rule
    const formatted = items.map(item => ({
      ...item,
      effectiveImageUrl: item.imageUrl && item.imageUrl.trim().length > 0 ? item.imageUrl : item.restaurant.defaultImageUrl
    }));

    return res.json({ success: true, data: formatted });
  }

  public static async createFoodItem(req: AuthenticatedRequest, res: Response) {
    const { restaurantId, categoryId, name, description, price, imageUrl, isAvailable, inStock } = req.body;

    if (!restaurantId || !categoryId || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters (restaurantId, categoryId, name, price).'
      });
    }

    const item = await prisma.foodItem.create({
      data: {
        restaurantId,
        categoryId,
        name,
        description,
        price: parseFloat(price),
        imageUrl: imageUrl || null, // Optional. If null, automatically falls back to restaurant default image
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        inStock: inStock !== undefined ? inStock : true
      },
      include: { restaurant: true }
    });

    const effectiveImageUrl = item.imageUrl || item.restaurant.defaultImageUrl;

    await AuditService.log(req.user?.adminId, 'CREATE_FOOD_ITEM', `FoodItem:${item.id}`, `Created ${name} (₹${price})`);
    return res.json({ success: true, data: { ...item, effectiveImageUrl } });
  }

  public static async updateFoodItem(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const updates = req.body;

    if (updates.price !== undefined) updates.price = parseFloat(updates.price);

    const item = await prisma.foodItem.update({
      where: { id },
      data: updates,
      include: { restaurant: true }
    });

    const effectiveImageUrl = item.imageUrl || item.restaurant.defaultImageUrl;

    await AuditService.log(req.user?.adminId, 'UPDATE_FOOD_ITEM', `FoodItem:${id}`, `Updated item ${item.name}`);
    return res.json({ success: true, data: { ...item, effectiveImageUrl } });
  }

  public static async deleteFoodItem(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    await prisma.foodItem.delete({ where: { id } });
    await AuditService.log(req.user?.adminId, 'DELETE_FOOD_ITEM', `FoodItem:${id}`, 'Deleted food item');
    return res.json({ success: true, message: 'Item deleted successfully.' });
  }

  // === COUPONS ===
  public static async getCoupons(req: AuthenticatedRequest, res: Response) {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: coupons });
  }

  public static async createCoupon(req: AuthenticatedRequest, res: Response) {
    const { code, discountType, discountValue, minOrderAmount, maxDiscountAmount, expiresAt } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ success: false, error: 'code and discountValue are required.' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType: discountType || 'PERCENTAGE',
        discountValue: parseFloat(discountValue),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    await AuditService.log(req.user?.adminId, 'CREATE_COUPON', `Coupon:${coupon.id}`, `Created coupon ${code}`);
    return res.json({ success: true, data: coupon });
  }

  // === PICKUP SLOTS ===
  public static async getPickupSlots(req: AuthenticatedRequest, res: Response) {
    const { restaurantId } = req.query;
    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId as string;

    const slots = await prisma.pickupSlot.findMany({ where, orderBy: { slotTime: 'asc' } });
    return res.json({ success: true, data: slots });
  }

  public static async createPickupSlot(req: AuthenticatedRequest, res: Response) {
    const { restaurantId, slotTime, maxOrders } = req.body;
    if (!restaurantId || !slotTime) {
      return res.status(400).json({ success: false, error: 'restaurantId and slotTime are required.' });
    }

    const slot = await prisma.pickupSlot.create({
      data: {
        restaurantId,
        slotTime,
        maxOrders: maxOrders ? parseInt(maxOrders, 10) : 20
      }
    });

    return res.json({ success: true, data: slot });
  }
}
