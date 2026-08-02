import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();

// Meta WhatsApp Cloud API Verification & Event Handlers
router.get('/whatsapp', WebhookController.verifyMetaWebhook);
router.post('/whatsapp', WebhookController.handleMetaWebhook);

// Twilio WhatsApp Webhook
router.post('/twilio', WebhookController.handleTwilioWebhook);

// Baileys Secondary Phone QR Endpoint
router.get('/baileys/qr', WebhookController.getBaileysQrStatus);

// Direct Webhook Simulation Endpoint for Dashboard Testing
router.post('/simulate', WebhookController.simulateIncomingMessage);
router.post('/simulate/reset', WebhookController.resetSimulatorSession);
router.get('/simulator/notifications', WebhookController.getSimulatorNotifications);

// Payment Gateway Webhook (Razorpay/PhonePe)
router.post('/payment', WebhookController.handlePaymentWebhook);

export default router;
