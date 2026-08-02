import { prisma } from '../db/prisma';
import { SessionData } from './whatsapp/sessionEngine';
import { CatalogService } from './catalogService';
import { NotificationService } from './notificationService';
import { OrderStatus, OrderStatusType } from '../types/orderStatus';

export class OrderService {
  public static async createOrderFromSession(session: SessionData) {
    if (!session.cart || session.cart.length === 0) {
      throw new Error('Cart is empty');
    }

    if (!session.selectedZoneId || !session.selectedBlockId || !session.selectedRestaurantId) {
      throw new Error('Incomplete zone/restaurant selection');
    }

    const user = await prisma.user.findUnique({
      where: { whatsappNumber: session.whatsappNumber }
    });

    if (!user) throw new Error('User not found');

    const pickupSlot = session.selectedPickupSlotId
      ? await prisma.pickupSlot.findUnique({ where: { id: session.selectedPickupSlotId } })
      : null;

    const pickupTimeStr = pickupSlot ? pickupSlot.slotTime : 'Standard ASAP (30-45 mins)';

    // Calculate cart total
    let totalAmount = 0;
    const itemsToCreate = [];

    for (const item of session.cart) {
      const dbItem = await prisma.foodItem.findUnique({ where: { id: item.foodItemId } });
      if (!dbItem) continue;

      const lineTotal = dbItem.price * item.quantity;
      totalAmount += lineTotal;

      itemsToCreate.push({
        foodItemId: dbItem.id,
        itemName: dbItem.name,
        unitPrice: dbItem.price,
        quantity: item.quantity,
        totalPrice: lineTotal
      });
    }

    // Apply Coupon if present
    let discountAmount = 0;
    let couponId: string | undefined = undefined;

    if (session.couponCode) {
      const couponRes = await CatalogService.validateCoupon(session.couponCode, totalAmount);
      if (couponRes.valid && couponRes.coupon) {
        discountAmount = couponRes.discountAmount;
        couponId = couponRes.coupon.id;
      }
    }

    const finalAmount = Math.max(0, totalAmount - discountAmount);

    // Generate readable order number
    const count = await prisma.order.count();
    const orderNumber = `ORD-${1000 + count + 1}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        restaurantId: session.selectedRestaurantId,
        zoneId: session.selectedZoneId,
        blockId: session.selectedBlockId,
        pickupSlotId: pickupSlot ? pickupSlot.id : null,
        pickupTimeStr,
        totalAmount,
        discountAmount,
        finalAmount,
        status: OrderStatus.PENDING,
        paymentStatus: 'UNPAID',
        couponId,
        orderItems: {
          create: itemsToCreate
        },
        history: {
          create: {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PENDING,
            notes: 'Order placed via WhatsApp'
          }
        }
      },
      include: {
        orderItems: true,
        restaurant: true,
        user: true
      }
    });

    if (pickupSlot) {
      await prisma.pickupSlot.update({
        where: { id: pickupSlot.id },
        data: { currentOrders: { increment: 1 } }
      });
    }

    return order;
  }

  public static async getLatestActiveOrder(whatsappNumber: string) {
    const user = await prisma.user.findUnique({ where: { whatsappNumber } });
    if (!user) return null;

    return prisma.order.findFirst({
      where: {
        userId: user.id,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'REJECTED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: { restaurant: true, orderItems: true }
    });
  }

  public static async getRecentOrders(whatsappNumber: string, limit: number = 5) {
    const user = await prisma.user.findUnique({ where: { whatsappNumber } });
    if (!user) return [];

    return prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { restaurant: true, orderItems: true }
    });
  }

  public static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    adminId?: string,
    notes?: string
  ) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const fromStatus = order.status;

    let paymentStatus = order.paymentStatus;
    if (newStatus === OrderStatus.PAYMENT_RECEIVED) {
      paymentStatus = 'PAID';
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        paymentStatus,
        history: {
          create: {
            fromStatus,
            toStatus: newStatus,
            changedByAdminId: adminId,
            notes
          }
        }
      }
    });

    // Send status notification to WhatsApp customer
    await NotificationService.notifyOrderStatus(orderId, newStatus);

    return updated;
  }
}
