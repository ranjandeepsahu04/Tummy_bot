import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { OrderService } from '../services/orderService';
import { prisma } from '../db/prisma';
import { OrderStatus } from '../types/orderStatus';
import { AuditService } from '../services/auditService';

export class OrderController {
  public static async getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, restaurantId, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = {};

      if (status) {
        whereClause.status = status as string;
      }

      if (restaurantId) {
        whereClause.restaurantId = restaurantId as string;
      } else if (req.user?.role === 'RESTAURANT_MANAGER' && req.user.restaurantId) {
        whereClause.restaurantId = req.user.restaurantId;
      }

      if (search) {
        const searchStr = (search as string).trim();
        whereClause.OR = [
          { orderNumber: { contains: searchStr, mode: 'insensitive' } },
          { user: { whatsappNumber: { contains: searchStr } } },
          { user: { name: { contains: searchStr, mode: 'insensitive' } } }
        ];
      }

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            user: true,
            restaurant: true,
            zone: true,
            block: true,
            orderItems: true
          }
        }),
        prisma.order.count({ where: whereClause })
      ]);

      return res.json({
        success: true,
        data: orders,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: true,
          restaurant: true,
          zone: true,
          block: true,
          pickupSlot: true,
          orderItems: {
            include: { foodItem: true }
          },
          history: {
            include: { changedByAdmin: true },
            orderBy: { createdAt: 'asc' }
          },
          payments: true
        }
      });

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      return res.json({ success: true, data: order });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status || !Object.values(OrderStatus).includes(status as any)) {
        return res.status(400).json({ success: false, error: 'Invalid order status value.' });
      }

      const updated = await OrderService.updateOrderStatus(id, status as string, req.user?.adminId, notes);
      await AuditService.log(req.user?.adminId, 'UPDATE_ORDER_STATUS', `Order:${id}`, `Changed status to ${status}`);

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async exportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: {
          user: true,
          restaurant: true,
          orderItems: true
        }
      });

      let csv = 'Order Number,Customer Name,WhatsApp,Restaurant,Status,Payment Status,Total Amount,Pickup Time,Created At\n';

      orders.forEach(o => {
        const customerName = (o.user.name || 'N/A').replace(/,/g, ' ');
        const restaurantName = o.restaurant.name.replace(/,/g, ' ');
        const pickupStr = (o.pickupTimeStr || '').replace(/,/g, ' ');
        const dateStr = o.createdAt.toISOString();

        csv += `${o.orderNumber},${customerName},${o.user.whatsappNumber},${restaurantName},${o.status},${o.paymentStatus},${o.finalAmount},${pickupStr},${dateStr}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders_export.csv"');
      return res.send(csv);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
