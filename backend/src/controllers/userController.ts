import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { prisma } from '../db/prisma';
import { AuthService } from '../services/authService';
import { AuditService } from '../services/auditService';

export class UserController {
  // === CUSTOMERS ===
  public static async getCustomers(req: AuthenticatedRequest, res: Response) {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true } }
      }
    });
    return res.json({ success: true, data: users });
  }

  // === ADMIN STAFF ===
  public static async getAdmins(req: AuthenticatedRequest, res: Response) {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEnabled: true,
        restaurantId: true,
        restaurant: { select: { name: true } },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: admins });
  }

  public static async createAdmin(req: AuthenticatedRequest, res: Response) {
    const { name, email, password, role, restaurantId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'name, email, password, and role are required.' });
    }

    const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An admin account with this email already exists.' });
    }

    const passwordHash = await AuthService.hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        restaurantId: restaurantId || null
      }
    });

    await AuditService.log(req.user?.adminId, 'CREATE_ADMIN', `Admin:${admin.id}`, `Created admin ${name} (${role})`);

    return res.json({
      success: true,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        restaurantId: admin.restaurantId
      }
    });
  }

  public static async toggleAdminStatus(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { isEnabled } = req.body;

    const admin = await prisma.admin.update({
      where: { id },
      data: { isEnabled }
    });

    await AuditService.log(req.user?.adminId, 'TOGGLE_ADMIN_STATUS', `Admin:${id}`, `Set isEnabled to ${isEnabled}`);
    return res.json({ success: true, data: admin });
  }
}
