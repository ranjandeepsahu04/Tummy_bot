import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();

// Baileys Secondary Phone QR Endpoint
router.get('/baileys/qr', WebhookController.getBaileysQrStatus);

// Direct Webhook Simulation Endpoint for Dashboard Testing
router.post('/simulate', WebhookController.simulateIncomingMessage);
router.post('/simulate/reset', WebhookController.resetSimulatorSession);
router.get('/simulator/notifications', WebhookController.getSimulatorNotifications);

export default router;
