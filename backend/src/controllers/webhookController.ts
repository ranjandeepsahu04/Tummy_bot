import { Request, Response } from 'express';
import { BotFlowHandler } from '../services/whatsapp/botFlowHandler';
import { prisma } from '../db/prisma';

export class WebhookController {
  /**
   * Baileys Secondary Phone QR Status Endpoint
   */
  public static getBaileysQrStatus(req: Request, res: Response) {
    try {
      const { BaileysProvider } = require('../services/whatsapp/providers/baileysProvider');
      const qrDataUrl = BaileysProvider.getQrDataUrl();
      const status = BaileysProvider.getConnectionState();

      return res.json({
        success: true,
        data: {
          status,
          qrDataUrl
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Direct Webhook Simulator Endpoint for Testing directly from Dashboard
   */
  public static async simulateIncomingMessage(req: Request, res: Response) {
    try {
      const { whatsappNumber, text } = req.body;
      if (!whatsappNumber || !text) {
        return res.status(400).json({ success: false, error: 'whatsappNumber and text are required.' });
      }

      const replyText = await BotFlowHandler.handleIncomingMessage(whatsappNumber, text);
      return res.json({ success: true, data: { replyText } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Reset Session Endpoint for Simulator
   */
  public static async resetSimulatorSession(req: Request, res: Response) {
    try {
      const { whatsappNumber } = req.body;
      if (!whatsappNumber) {
        return res.status(400).json({ success: false, error: 'whatsappNumber is required.' });
      }

      const { SessionEngine } = require('../services/whatsapp/sessionEngine');
      SessionEngine.resetSession(whatsappNumber);

      return res.json({ success: true, message: 'Simulator session reset successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get Notifications for Simulator
   */
  public static async getSimulatorNotifications(req: Request, res: Response) {
    try {
      const { whatsappNumber, since } = req.query;
      if (!whatsappNumber) {
        return res.status(400).json({ success: false, error: 'whatsappNumber query param required' });
      }

      const user = await prisma.user.findUnique({
        where: { whatsappNumber: whatsappNumber as string }
      });

      if (!user) {
        return res.json({ success: true, data: [] });
      }

      const whereClause: any = { userId: user.id };

      if (since) {
        const sinceDate = new Date(since as string);
        if (!isNaN(sinceDate.getTime())) {
          whereClause.createdAt = { gte: sinceDate };
        }
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        take: 50
      });

      return res.json({ success: true, data: notifications });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
