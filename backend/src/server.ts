import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { helmetMiddleware, corsMiddleware, apiRateLimiter, errorHandler } from './middlewares/securityMiddleware';
import routes from './routes';

const app = express();

// Security Middlewares
app.use(corsMiddleware);
app.use(helmetMiddleware);

// Localtunnel & Webhook bypass headers
app.use((req, res, next) => {
  res.setHeader('Bypass-Tunnel-Reminder', 'true');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Webhook raw body & urlencoded parser for Twilio / Meta POST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Rate Limiting only to non-webhook endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhook')) {
    return next();
  }
  return apiRateLimiter(req, res, next);
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Food Ordering API'
  });
});

// Swagger Documentation UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

const PORT = parseInt(env.PORT, 10) || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 WhatsApp Food Ordering Backend API running on port ${PORT}`);
  console.log(`📑 Swagger Documentation available at http://localhost:${PORT}/docs`);
  console.log(`🟢 Health Check available at http://localhost:${PORT}/health`);
  console.log(`📲 WhatsApp Webhook Endpoint: http://localhost:${PORT}/api/webhook/whatsapp`);
  console.log(`📲 Twilio Webhook Endpoint: http://localhost:${PORT}/api/webhook/twilio`);
  console.log(`=======================================================`);

  if (env.WHATSAPP_PROVIDER === 'baileys') {
    const { BaileysProvider } = require('./services/whatsapp/providers/baileysProvider');
    BaileysProvider.initialize();
  }
});

export default app;
