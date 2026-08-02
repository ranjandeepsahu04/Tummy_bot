import { prisma } from '../db/prisma';

export class AuditService {
  public static async log(
    adminId: string | undefined | null,
    action: string,
    target: string,
    details?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          adminId: adminId || null,
          action,
          target,
          details,
          ipAddress: ipAddress || '127.0.0.1'
        }
      });
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }
}
