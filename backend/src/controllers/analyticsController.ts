import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { prisma } from '../db/prisma';

export class AnalyticsController {
  public static async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        todaySalesResult,
        pendingCount,
        preparingCount,
        readyCount,
        completedCount,
        totalOrdersCount,
        totalCustomersCount
      ] = await Promise.all([
        prisma.order.aggregate({
          where: {
            createdAt: { gte: todayStart },
            status: { notIn: ['CANCELLED', 'REJECTED'] }
          },
          _sum: { finalAmount: true }
        }),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'PREPARING' } }),
        prisma.order.count({ where: { status: { in: ['READY_FOR_PAYMENT', 'READY_FOR_PICKUP', 'PAYMENT_RECEIVED'] } } }),
        prisma.order.count({ where: { status: 'COMPLETED' } }),
        prisma.order.count(),
        prisma.user.count()
      ]);

      const todaySales = todaySalesResult._sum.finalAmount || 0;

      return res.json({
        success: true,
        data: {
          todaySales,
          pendingCount,
          preparingCount,
          readyCount,
          completedCount,
          totalOrdersCount,
          totalCustomersCount
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getPopularItems(req: AuthenticatedRequest, res: Response) {
    try {
      const popular = await prisma.orderItem.groupBy({
        by: ['foodItemId', 'itemName'],
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10
      });

      return res.json({ success: true, data: popular });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
