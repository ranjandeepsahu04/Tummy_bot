import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { helmetMiddleware, corsMiddleware, apiRateLimiter, errorHandler } from './middlewares/securityMiddleware';
import routes from './routes';
import { BaileysProvider } from './services/whatsapp/providers/baileysProvider';

const app = express();

// Security Middlewares
app.use(corsMiddleware);
app.use(helmetMiddleware);

// Body parsers
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
  console.log(`=======================================================`);

  // Initialize Native Direct WhatsApp Engine
  BaileysProvider.initialize();
});

export default app;
