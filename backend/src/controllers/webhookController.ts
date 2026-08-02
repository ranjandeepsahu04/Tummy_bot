import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { BotFlowHandler } from '../services/whatsapp/botFlowHandler';
import { getWhatsAppProvider } from '../services/whatsapp/providers';
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
   * Meta WhatsApp Webhook Verification (GET)
   */
  public static verifyMetaWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
        console.log('[WebhookController] Meta Webhook verified successfully.');
        return res.status(200).send(challenge);
      } else {
        console.warn('[WebhookController] Meta Webhook verification token mismatch.');
        return res.sendStatus(403);
      }
    }

    return res.sendStatus(400);
  }

  /**
   * Meta WhatsApp Incoming Messages (POST)
   */
  public static async handleMetaWebhook(req: Request, res: Response) {
    try {
      const body = req.body;

      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message && message.type === 'text') {
          const from = message.from; // Phone number
          const text = message.text.body;

          console.log(`[Meta Webhook] Inbound from ${from}: "${text}"`);

          const replyText = await BotFlowHandler.handleIncomingMessage(from, text);
          const provider = getWhatsAppProvider();
          await provider.sendMessage({ to: from, body: replyText });
        }

        return res.status(200).send('EVENT_RECEIVED');
      }

      return res.sendStatus(404);
    } catch (err: any) {
      console.error('[Meta Webhook Error]:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Twilio Incoming WhatsApp Message Handler (POST)
   */
  public static async handleTwilioWebhook(req: Request, res: Response) {
    try {
      const from = req.body.From || req.body.from; // e.g. "whatsapp:+919348145818"
      const bodyText = req.body.Body || req.body.body || req.body.text;

      console.log(`[Twilio Webhook Received] Body:`, JSON.stringify(req.body));

      if (from && bodyText) {
        const cleanPhone = from.replace('whatsapp:', '');
        console.log(`[Twilio Webhook Processing] Inbound from ${cleanPhone}: "${bodyText}"`);

        const replyText = await BotFlowHandler.handleIncomingMessage(cleanPhone, bodyText);

        // Send via Twilio REST API provider asynchronously as backup
        try {
          const provider = getWhatsAppProvider();
          provider.sendMessage({ to: cleanPhone, body: replyText }).catch(err => {
            console.warn('[Twilio Outbound API Warning]:', err.message);
          });
        } catch (e) {
          // ignore API send error
        }

        // Return TwiML XML directly in HTTP response
        const xmlEscaped = replyText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscaped}</Message></Response>`);
      }

      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (err: any) {
      console.error('[Twilio Webhook Error]:', err);
      return res.status(500).json({ error: err.message });
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

      const { SessionEngine } = await import('../services/whatsapp/sessionEngine');
      await SessionEngine.resetSession(whatsappNumber);

      const replyText = await BotFlowHandler.handleIncomingMessage(whatsappNumber, 'hi');
      return res.json({ success: true, data: { replyText } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Poll Outbound Notifications for Simulator
   */
  public static async getSimulatorNotifications(req: Request, res: Response) {
    try {
      const whatsappNumber = req.query.whatsappNumber as string;
      const sinceQuery = req.query.since as string;
      const since = sinceQuery ? new Date(Number(sinceQuery)) : null;

      if (!whatsappNumber) {
        return res.status(400).json({ success: false, error: 'whatsappNumber required' });
      }

      const user = await prisma.user.findUnique({
        where: { whatsappNumber }
      });

      if (!user) {
        return res.json({ success: true, data: [] });
      }

      const whereClause: any = { userId: user.id };
      if (since && !isNaN(since.getTime())) {
        whereClause.createdAt = { gte: since };
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

  /**
   * Generic Payment Provider Webhook Handler (Razorpay / PhonePe)
   */
  public static async handlePaymentWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      console.log('[Payment Webhook Received]:', JSON.stringify(payload));

      const orderNumber = payload.orderNumber || payload.payload?.payment?.entity?.notes?.orderNumber;
      const status = payload.status || payload.event;

      if (orderNumber && (status === 'captured' || status === 'SUCCESS' || status === 'payment.captured')) {
        const order = await prisma.order.findUnique({ where: { orderNumber } });
        if (order) {
          await prisma.payment.create({
            data: {
              orderId: order.id,
              provider: payload.provider || 'WEBHOOK',
              transactionRef: payload.txnId || payload.id || 'TXN_' + Date.now(),
              amount: order.finalAmount,
              status: 'SUCCESS',
              rawPayload: JSON.stringify(payload)
            }
          });

          const { OrderService } = await import('../services/orderService');
          await OrderService.updateOrderStatus(order.id, 'PAYMENT_RECEIVED' as any, undefined, 'Automated Payment Webhook');
        }
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[Payment Webhook Error]:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
